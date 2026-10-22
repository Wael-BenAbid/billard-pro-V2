/**
 * Centralized API utilities for all HTTP requests
 * Handles authentication, error management, and request consistency
 */

// Dynamic API URL - works for both development and Docker
export const API_URL = import.meta.env.VITE_API_URL || 
  (typeof window !== 'undefined' && window.location.port === '5173' 
    ? 'http://localhost:8000/api' 
    : '/api');

// ============================================
// JWT AUTHENTICATION
// ============================================
const ACCESS_KEY = 'billard_access';
const REFRESH_KEY = 'billard_refresh';

/** Event fired when the session can no longer be refreshed (user must log in again) */
export const AUTH_EXPIRED_EVENT = 'billard:auth-expired';

export function setAuthTokens(access: string, refresh?: string): void {
  localStorage.setItem(ACCESS_KEY, access);
  if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
}

export function clearAuthTokens(): void {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

// Shared so that parallel 401s trigger a single refresh call
let refreshPromise: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  const refresh = localStorage.getItem(REFRESH_KEY);
  if (!refresh) return false;

  if (!refreshPromise) {
    refreshPromise = fetch(`${API_URL}/auth/token/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    })
      .then(async res => {
        if (!res.ok) return false;
        const data = await res.json();
        setAuthTokens(data.access, data.refresh);
        return true;
      })
      .catch(() => false)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

function withAuthHeader(init: RequestInit): RequestInit {
  const headers = new Headers(init.headers);
  const access = localStorage.getItem(ACCESS_KEY);
  if (access) headers.set('Authorization', `Bearer ${access}`);
  return { ...init, headers };
}

/**
 * Drop-in replacement for fetch() that sends the JWT access token,
 * refreshes it once on 401 and retries the request.
 */
export async function authFetch(input: string, init: RequestInit = {}): Promise<Response> {
  let response = await fetch(input, withAuthHeader(init));

  if (response.status === 401) {
    if (await refreshAccessToken()) {
      response = await fetch(input, withAuthHeader(init));
    } else {
      clearAuthTokens();
      window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
    }
  }
  return response;
}

/**
 * Error response interface for consistent error handling
 */
export interface ApiError {
  status: number;
  message: string;
  details?: unknown;
}

/**
 * Generic API call wrapper with error handling
 * @param endpoint - API endpoint (without base URL)
 * @param options - Fetch options
 * @returns Response data or throws ApiError
 */
export async function apiCall<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  try {
    const url = `${API_URL}${endpoint}`;
    
    // Add default headers
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const response = await authFetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw {
        status: response.status,
        message: errorData.error || `HTTP ${response.status}`,
        details: errorData,
      } as ApiError;
    }

    if (response.status === 204) {
      return {} as T; // No content
    }

    return await response.json() as T;
  } catch (error) {
    // ApiError is a type-only interface, so detect it structurally
    if (error && typeof error === 'object' && 'status' in error && 'message' in error) {
      throw error;
    }

    if (error instanceof SyntaxError) {
      throw {
        status: 0,
        message: 'Invalid response format',
        details: error,
      } as ApiError;
    }

    if (error instanceof TypeError) {
      throw {
        status: 0,
        message: 'Network error',
        details: error,
      } as ApiError;
    }

    throw {
      status: 0,
      message: 'Unknown error',
      details: error,
    } as ApiError;
  }
}

/**
 * GET request
 */
export function apiGet<T = any>(endpoint: string): Promise<T> {
  return apiCall<T>(endpoint, {
    method: 'GET',
  });
}

/**
 * POST request
 */
export function apiPost<T = any>(endpoint: string, data?: any): Promise<T> {
  return apiCall<T>(endpoint, {
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * PUT request
 */
export function apiPut<T = any>(endpoint: string, data?: any): Promise<T> {
  return apiCall<T>(endpoint, {
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * PATCH request
 */
export function apiPatch<T = any>(endpoint: string, data?: any): Promise<T> {
  return apiCall<T>(endpoint, {
    method: 'PATCH',
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * DELETE request
 */
export function apiDelete<T = any>(endpoint: string): Promise<T> {
  return apiCall<T>(endpoint, {
    method: 'DELETE',
  });
}
