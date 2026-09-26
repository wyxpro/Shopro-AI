import os
import base64
import logging
import asyncio
from typing import Optional, Dict, Any
from mcp.server.fastmcp import FastMCP
import httpx
from dotenv import load_dotenv

# Load environment variables from parent directory if exists, otherwise local env
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env"))
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("shopro-mcp-shopro-server")

# Initialize FastMCP Server
mcp = FastMCP("Shopro AI E-Commerce AIGC Video System MCP Server")

# Retrieve API Keys from environment
DEEPSEEK_API_KEY = os.getenv("VITE_DEEPSEEK_API_KEY") or os.getenv("DEEPSEEK_API_KEY")
STEP_API_KEY = os.getenv("VITE_STEP_API_KEY") or os.getenv("STEP_API_KEY")
CDANCE_API_KEY = os.getenv("API_KEY") or os.getenv("VITE_CDANCE_API_KEY") or os.getenv("VITE_VECTRUST_API_KEY") or os.getenv("VECTRUST_API_KEY")

# API Base URLs
DEEPSEEK_BASE_URL = os.getenv("DEEPSEEK_BASE_URL") or "https://ai.dxkp.com/v1"
STEP_BASE_URL = "https://api.stepfun.com/step_plan/v1"
CDANCE_BASE_URL = os.getenv("VITE_CDANCE_BASE_URL") or "https://ai.dxkp.com/v1"

MCP_SERVER_KEY = os.getenv("MCP_API_KEY") or os.getenv("MCP_AUTH_TOKEN")

# In-memory task store for Cdance async completions
mcp_task_store = {}

def verify_auth(api_key: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """验证 MCP 工具调用的 API Key，防止未鉴权旁路调用"""
    if MCP_SERVER_KEY:
        if not api_key or api_key != MCP_SERVER_KEY:
            return {"error": "unauthorized", "message": "Invalid or missing MCP_API_KEY"}
    return None

# Helper for wrapping tool calls with tracing and structured errors
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
    name="extract_product_highlights",
    description="Extracts key selling points, target audience pain points, and core marketing angles from raw product descriptions or URL landing text using DeepSeek-V4-Flash."
)
async def extract_product_highlights(product_info: str) -> Dict[str, Any]:
    async def _impl():
        if not DEEPSEEK_API_KEY:
            return {"error": "missing_api_key", "message": "DeepSeek API key (VITE_DEEPSEEK_API_KEY) is not configured."}

        prompt = (
            "You are a master e-commerce marketer. Analyze the following product description/link text and extract:\n"
            "1. Core Selling Points (Top 3)\n"
            "2. Target Audience & Their Key Pain Points\n"
            "3. High-Converting Marketing Angle for video ads.\n\n"
            f"Product Info:\n{product_info}"
        )

        async with httpx.AsyncClient(timeout=45.0) as client:
            response = await client.post(
                f"{DEEPSEEK_BASE_URL}/chat/completions",
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {DEEPSEEK_API_KEY}"
                },
                json={
                    "model": "DeepSeek-V4-Flash",
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.3
                }
            )
            response.raise_for_status()
            res_data = response.json()
            analysis = res_data["choices"][0]["message"]["content"].strip()
            return {"product_info": product_info[:200] + "...", "highlights": analysis}

    return await handle_tool_call("extract_product_highlights", _impl())

@mcp.tool(
    name="generate_marketing_script",
    description="Generates a structured TikTok/Douyin/Shorts style high-converting marketing script with detailed scene instructions (Hook, Pain Point, Solution, Call to Action) and digital human speech texts using DeepSeek-V4-Flash."
)
async def generate_marketing_script(
    product_highlights: str,
    target_audience: str,
    platform: str = "TikTok",
    language: str = "Chinese"
) -> Dict[str, Any]:
    async def _impl():
        if not DEEPSEEK_API_KEY:
            return {"error": "missing_api_key", "message": "DeepSeek API key (VITE_DEEPSEEK_API_KEY) is not configured."}

        prompt = (
            f"Write a professional video marketing script for {platform} in {language} language.\n"
            f"Use the AIDA (Attention, Interest, Desire, Action) model.\n"
            f"Include exact spoken text for a digital human avatar and detailed scene/visual instructions for each step.\n\n"
            f"Product Highlights:\n{product_highlights}\n\n"
            f"Target Audience:\n{target_audience}"
        )

        async with httpx.AsyncClient(timeout=45.0) as client:
            response = await client.post(
                f"{DEEPSEEK_BASE_URL}/chat/completions",
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {DEEPSEEK_API_KEY}"
                },
                json={
                    "model": "DeepSeek-V4-Flash",
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.7
                }
            )
            response.raise_for_status()
            res_data = response.json()
            script_content = res_data["choices"][0]["message"]["content"].strip()
            return {"script": script_content, "platform": platform, "language": language}

    return await handle_tool_call("generate_marketing_script", _impl())

@mcp.tool(
    name="translate_marketing_script",
    description="Translates the generated marketing script to a target language (e.g. Chinese to English, Spanish, etc.) while preserving scene instructions and placeholders intact using DeepSeek-V4-Flash."
)
async def translate_marketing_script(script: str, target_language: str) -> Dict[str, Any]:
    async def _impl():
        if not DEEPSEEK_API_KEY:
            return {"error": "missing_api_key", "message": "DeepSeek API key (VITE_DEEPSEEK_API_KEY) is not configured."}

        prompt = (
            f"Translate the following e-commerce marketing video script into {target_language}.\n"
            "Keep all visual/scene descriptions and structure identical, only translate the text.\n\n"
            f"Original Script:\n{script}"
        )

        async with httpx.AsyncClient(timeout=45.0) as client:
            response = await client.post(
                f"{DEEPSEEK_BASE_URL}/chat/completions",
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {DEEPSEEK_API_KEY}"
                },
                json={
                    "model": "DeepSeek-V4-Flash",
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.2
                }
            )
            response.raise_for_status()
            res_data = response.json()
            translated = res_data["choices"][0]["message"]["content"].strip()
            return {"translated_script": translated, "target_language": target_language}

    return await handle_tool_call("translate_marketing_script", _impl())

@mcp.tool(
    name="synthesize_voice_tts",
    description="Synthesizes speech from a script line using FunAudioLLM/CosyVoice2-0.5B. Returns base64 encoded MP3 audio data."
)
async def synthesize_voice_tts(
    text: str,
    voice_id: str = "fnlp/MOSS-TTSD-v0.5:alex",
    speed: float = 1.0,
    volume: float = 0.9
) -> Dict[str, Any]:
    async def _impl():
        silicon_key = os.getenv("SILICONFLOW_API_KEY") or os.getenv("VITE_SILICONFLOW_API_KEY")
        if not silicon_key:
            return {"ok": False, "error": "missing SILICONFLOW_API_KEY in environment (server secret)"}
        silicon_base = os.getenv("SILICONFLOW_BASE_URL") or "https://api.siliconflow.cn/v1"

        async with httpx.AsyncClient(timeout=45.0) as client:
            response = await client.post(
                f"{silicon_base}/audio/speech",
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {silicon_key}"
                },
                json={
                    "model": "FunAudioLLM/CosyVoice2-0.5B",
                    "input": text,
                    "voice": voice_id,
                    "response_format": "mp3",
                    "stream": False
                }
            )
            response.raise_for_status()
            audio_bytes = response.content
            audio_b64 = base64.b64encode(audio_bytes).decode("utf-8")
            return {
                "audio_base64": audio_b64,
                "format": "mp3",
                "text_length": len(text)
            }

    return await handle_tool_call("synthesize_voice_tts", _impl())

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
                f"{STEP_BASE_URL}/chat/completions",
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
    duration: int = 5,
    resolution: str = "720p",
    ratio: str = "16:9",
    first_frame_url: Optional[str] = None,
    watermark: bool = False
) -> Dict[str, Any]:
    async def _impl():
        if not CDANCE_API_KEY:
            return {"error": "missing_api_key", "message": "Cdance2.0 API key (API_KEY) is not configured."}

        content_items = []
        if first_frame_url:
            content_items.append({
                "type": "image_url",
                "image_url": {"url": first_frame_url},
                "role": "first_frame"
            })

        request_body = {
            "model": "Cdance2.0-A",
            "prompt": prompt,
            "seconds": str(duration),
            "metadata": {
                "generate_audio": True,
                "resolution": resolution,
                "ratio": ratio,
                "watermark": watermark
            }
        }
        if content_items:
            request_body["metadata"]["content"] = content_items

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{CDANCE_BASE_URL}/video/generations",
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {CDANCE_API_KEY}"
                },
                json=request_body
            )
            response.raise_for_status()
            res_data = response.json()

            request_id = res_data.get("task_id") or res_data.get("id")
            if not request_id:
                return {"error": "invalid_response", "message": "No task_id returned.", "raw": res_data}

            return {
                "status": "submitted",
                "request_id": request_id,
                "prompt": prompt
            }

    return await handle_tool_call("submit_video_generation", _impl())

@mcp.tool(
    name="query_video_status",
    description="Queries the status of a submitted video generation task by request_id."
)
async def query_video_status(request_id: str) -> Dict[str, Any]:
    async def _impl():
        if not CDANCE_API_KEY:
            return {"error": "missing_api_key", "message": "Cdance2.0 API key (API_KEY) is not configured."}

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{CDANCE_BASE_URL}/video/generations/{request_id}",
                headers={
                    "Authorization": f"Bearer {CDANCE_API_KEY}"
                }
            )
            response.raise_for_status()
            res_data = response.json()

            if res_data.get("code") and res_data.get("code") != "success":
                return {
                    "status": "failed",
                    "request_id": request_id,
                    "error": res_data.get("message") or "Query failed"
                }

            task_data = res_data.get("data") or res_data
            status = (task_data.get("status") or "").upper()

            if status == "SUCCESS":
                video_url = task_data.get("result_url") or task_data.get("data", {}).get("content", {}).get("video_url")
                return {
                    "status": "success",
                    "request_id": request_id,
                    "video_url": video_url,
                    "thumbnail_url": f"{video_url}?vframe/jpg/offset/1" if video_url else None
                }
            elif status == "FAILED":
                return {
                    "status": "failed",
                    "request_id": request_id,
                    "error": task_data.get("fail_reason") or "Video generation task failed."
                }
            else:
                return {
                    "status": "processing",
                    "request_id": request_id,
                    "progress": task_data.get("progress", "0%")
                }

    return await handle_tool_call("query_video_status", _impl())

if __name__ == "__main__":
    # Start the Streamable-HTTP server (listening on 127.0.0.1:8080 by default for reverse proxy safety)
    host = os.getenv("HOST", "127.0.0.1")
    port = int(os.getenv("PORT", 8080))
    logger.info(f"Starting Shopro AI Full System MCP Server on {host}:{port} using streamable-http transport")
    mcp.settings.host = host
    mcp.settings.port = port
    mcp.run(transport="streamable-http")
