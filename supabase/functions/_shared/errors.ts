import { getCorsHeaders } from './cors.ts';

export function jsonResponse(
  data: unknown,
  status = 200,
  req?: Request,
  customHeaders: Record<string, string> = {}
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...getCorsHeaders(req),
      'Content-Type': 'application/json',
      ...customHeaders,
    },
  });
}

export function errorResponse(
  message: string,
  status = 400,
  code?: number | string,
  req?: Request,
  extra?: Record<string, unknown>
): Response {
  return jsonResponse(
    {
      error: message,
      code: code ?? status,
      success: false,
      ...extra,
    },
    status,
    req
  );
}

export function unauthorizedResponse(message = '认证失效或缺少访问令牌', req?: Request): Response {
  return errorResponse(message, 401, 4010, req);
}

export function forbiddenResponse(message = '权限不足，拒绝访问', req?: Request): Response {
  return errorResponse(message, 403, 4030, req);
}
