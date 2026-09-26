import os
import logging
import asyncio
from typing import Optional, Dict, Any
from mcp.server.fastmcp import FastMCP
import httpx
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("shopro-mcp-server")

# Initialize FastMCP Server
mcp = FastMCP("Shopro AI Video Generator MCP Server")

# API Keys and endpoints configurations
STEP_API_KEY = os.getenv("VITE_STEP_API_KEY") or os.getenv("STEP_API_KEY")
VECTRUST_API_KEY = os.getenv("VITE_VECTRUST_API_KEY") or os.getenv("VECTRUST_API_KEY")
VECTRUST_BASE_URL = "https://draw.openai-next.com/v1"
MCP_SERVER_KEY = os.getenv("MCP_API_KEY")

def verify_auth(api_key: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """验证 MCP 工具调用的 API Key，防止未鉴权旁路调用"""
    if MCP_SERVER_KEY:
        if not api_key or api_key != MCP_SERVER_KEY:
            return {"error": "unauthorized", "message": "Invalid or missing MCP_API_KEY"}
    return None

# Helper for unified tool call error wrapping
async def handle_tool_call(tool_name: str, coro, api_key: Optional[str] = None):
    auth_err = verify_auth(api_key)
    if auth_err:
        logger.warning(f"Unauthorized tool call attempted: {tool_name}")
        return auth_err
    trace_id = os.urandom(8).hex()
    logger.info(f"Tool call started: {tool_name} | Trace ID: {trace_id}")
    start_time = asyncio.get_event_loop().time()
    try:
        result = await coro
        duration = (asyncio.get_event_loop().time() - start_time) * 1000
        logger.info(f"Tool call succeeded: {tool_name} | Trace ID: {trace_id} | Duration: {duration:.2f}ms")
        return result
    except httpx.HTTPStatusError as e:
        duration = (asyncio.get_event_loop().time() - start_time) * 1000
        logger.error(f"Tool call failed (HTTP): {tool_name} | Trace ID: {trace_id} | Status: {e.response.status_code} | Duration: {duration:.2f}ms | Error: {e.response.text}")
        return {
            "error": "upstream_http_error",
            "status_code": e.response.status_code,
            "message": e.response.text,
            "trace_id": trace_id
        }
    except Exception as e:
        duration = (asyncio.get_event_loop().time() - start_time) * 1000
        logger.error(f"Tool call failed (Exception): {tool_name} | Trace ID: {trace_id} | Duration: {duration:.2f}ms | Error: {str(e)}")
        return {
            "error": "internal_error",
            "message": str(e),
            "trace_id": trace_id
        }

@mcp.tool(
    name="enhance_prompt",
    description="Enhances/optimizes a raw prompt text into a detailed, high-quality prompt suitable for digital human or video generation using StepFun step-3.7-flash."
)
async def enhance_prompt(prompt: str) -> Dict[str, Any]:
    async def _impl():
        if not STEP_API_KEY:
            return {"error": "missing_api_key", "message": "StepFun API key (VITE_STEP_API_KEY) is not configured."}

        messages = [
            {
                "role": "system",
                "content": "You are a professional video prompt generator. Enhance the user's prompt by adding vivid, detailed sensory descriptions (lighting, camera moves, character expressions, cinematic elements) to make it suitable for high-quality AI video generation. Keep the output concise and in the same language as the input."
            },
            {
                "role": "user",
                "content": prompt
            }
        ]

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                "https://api.stepfun.com/step_plan/v1/chat/completions",
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {STEP_API_KEY}"
                },
                json={
                    "model": "step-3.7-flash",
                    "messages": messages,
                    "temperature": 0.7,
                    "max_tokens": 1000
                }
            )
            response.raise_for_status()
            res_data = response.json()
            enhanced_text = res_data["choices"][0]["message"]["content"].strip()
            return {"original_prompt": prompt, "enhanced_prompt": enhanced_text}

    return await handle_tool_call("enhance_prompt", _impl())

@mcp.tool(
    name="submit_video_generation",
    description="Submits a video generation task using Seedance 2.0. Requires prompt, duration, resolution, aspect ratio."
)
async def submit_video_generation(
    prompt: str,
    duration: int = 8,
    resolution: str = "720p",
    ratio: str = "16:9",
    first_frame_url: Optional[str] = None,
    watermark: bool = False
) -> Dict[str, Any]:
    async def _impl():
        if not VECTRUST_API_KEY:
            return {"error": "missing_api_key", "message": "Vectrust/Seedance API key (VITE_VECTRUST_API_KEY) is not configured."}

        # Format prompt with parameters per Volcengine Ark requirements
        final_prompt = prompt
        if "--resolution" not in final_prompt:
            final_prompt += f" --resolution {resolution}"
        if "--duration" not in final_prompt:
            final_prompt += f" --duration {duration}"
        if "--aspect_ratio" not in final_prompt and "--ratio" not in final_prompt:
            final_prompt += f" --aspect_ratio {ratio}"

        request_body = {
            "model": "doubao-seedance-2-0-fast-260128",
            "prompt": final_prompt,
            "watermark": watermark
        }

        if first_frame_url:
            request_body["first_frame"] = first_frame_url

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{VECTRUST_BASE_URL}/video/generations",
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {VECTRUST_API_KEY}"
                },
                json=request_body
            )
            response.raise_for_status()
            res_data = response.json()

            request_id = res_data.get("id") or res_data.get("task_id") or res_data.get("request_id")
            if not request_id:
                return {"error": "invalid_response", "message": "No request_id returned from upstream API.", "raw": res_data}

            return {
                "status": "submitted",
                "request_id": request_id,
                "prompt": final_prompt
            }

    return await handle_tool_call("submit_video_generation", _impl())

@mcp.tool(
    name="query_video_status",
    description="Queries the status of a submitted video generation task by request_id."
)
async def query_video_status(request_id: str) -> Dict[str, Any]:
    async def _impl():
        if not VECTRUST_API_KEY:
            return {"error": "missing_api_key", "message": "Vectrust/Seedance API key (VITE_VECTRUST_API_KEY) is not configured."}

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{VECTRUST_BASE_URL}/tasks/{request_id}",
                headers={
                    "Authorization": f"Bearer {VECTRUST_API_KEY}"
                }
            )
            response.raise_for_status()
            res_data = response.json()

            status = res_data.get("status")
            if status in ["completed", "succeeded", "success"]:
                video_url = res_data.get("result_url") or res_data.get("result", {}).get("data", {}).get("content", {}).get("video_url") or res_data.get("video_url")
                thumbnail = res_data.get("result", {}).get("data", {}).get("content", {}).get("thumbnail_image_url") or res_data.get("thumbnail_url") or (f"{video_url}?vframe/jpg/offset/1" if video_url else "")
                return {
                    "status": "success",
                    "request_id": request_id,
                    "video_url": video_url,
                    "thumbnail_url": thumbnail
                }
            elif status in ["failed", "cancelled"]:
                return {
                    "status": "failed",
                    "request_id": request_id,
                    "error": res_data.get("error_message") or res_data.get("error") or "Generation task failed."
                }
            else:
                return {
                    "status": "processing",
                    "request_id": request_id
                }

    return await handle_tool_call("query_video_status", _impl())

if __name__ == "__main__":
    # Start the Streamable-HTTP server (listening on 8080 by default)
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", 8080))
    logger.info(f"Starting Shopro AI MCP Server on {host}:{port} using streamable-http transport")
    mcp.settings.host = host
    mcp.settings.port = port
    mcp.run(transport="streamable-http")
