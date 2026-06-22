const DEFAULT_MAX_DETAIL_LENGTH = 500;

const PRIVATE_URL_PATTERN =
  /https?:\/\/(?:(?:localhost|127(?:\.\d{1,3}){3}|10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2}|[a-z0-9.-]+\.local)(?::\d+)?)(?:\/[^\s"'<>]*)?/gi;

export function sanitizeAdapterErrorText(value: string): string {
  return value
    .replace(PRIVATE_URL_PATTERN, '[private url redacted]')
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]{8,}/gi, 'Bearer [token redacted]')
    .replace(/\bsk-(?:ant-)?[A-Za-z0-9._-]{8,}\b/g, '[api key redacted]')
    .replace(/\bAIza[A-Za-z0-9_-]{20,}\b/g, '[api key redacted]')
    .replace(/\b((?:api[_-]?key|access[_-]?token|token)=)[^\s&"'<>]+/gi, '$1[secret redacted]')
    .replace(/(?:file:\/\/)?\/Users\/[^\s"'<>]+/g, '[local path redacted]')
    .replace(/(?:file:\/\/)?\/home\/[^\s"'<>]+/g, '[local path redacted]');
}

export function truncateAdapterErrorText(value: string, maxLength = DEFAULT_MAX_DETAIL_LENGTH): string {
  return sanitizeAdapterErrorText(value).slice(0, maxLength);
}

export function formatAdapterHttpError(label: string, status: number, detail: string): string {
  return `${label} ${status}: ${truncateAdapterErrorText(detail)}`;
}
