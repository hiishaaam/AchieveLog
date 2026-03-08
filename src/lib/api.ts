import { useStore } from '../store/useStore';

const BASE_URL = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_URL ?? '');

export async function apiCall(
  endpoint: string,
  method: string = 'GET',
  body?: object
) {
  const token = localStorage.getItem('achievelog_token') ?? useStore.getState().token;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers,
    ...(body ? { body: JSON.stringify(body) } : {})
  });

  if (response.status === 401) {
    // Token expired or missing — redirect to login
    useStore.getState().logout();
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'API call failed' }));
    throw new Error(error.message || error.error || 'API call failed');
  }

  return response.json();
}
