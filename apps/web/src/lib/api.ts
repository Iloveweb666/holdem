// API 基础配置
export const API_BASE_URL = import.meta.env.VITE_API_URL || '';

// WebSocket URL
export const WS_BASE_URL = API_BASE_URL.replace(/^http/, 'ws');

// API 请求封装
export async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }

  return response.json();
}
