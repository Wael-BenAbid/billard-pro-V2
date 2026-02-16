/**
 * Centralized API utilities for all HTTP requests
 * Handles authentication, error management, and request consistency
 */

// Dynamic API URL - works for both development and Docker
export const API_URL = import.meta.env.VITE_API_URL || 
  (typeof window !== 'undefined' && window.location.port === '5173' 
    ? 'http://localhost:8000/api' 
    : '/api');

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

    const response = await fetch(url, {
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
    if (error instanceof ApiError) {
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
