import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3336';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export function getApiUrl(path: string): string {
  if (path.startsWith('http')) return path;
  return `${API_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

export function getErrorMessage(err: any, fallback = 'An unexpected error occurred'): string {
  if (!err) return fallback;
  if (typeof err === 'string') return err;

  const resData = err?.response?.data;
  if (resData) {
    if (typeof resData === 'string') return resData;
    if (typeof resData.message === 'string') return resData.message;
    if (Array.isArray(resData.message)) return resData.message.join(', ');
    if (typeof resData.message === 'object' && resData.message !== null) {
      if (typeof resData.message.message === 'string') return resData.message.message;
      return JSON.stringify(resData.message);
    }
    if (typeof resData.error === 'string') return resData.error;
  }

  if (typeof err.message === 'string') return err.message;
  return fallback;
}
