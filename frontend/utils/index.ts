/**
 * Central exports for all utility functions
 * Import from this file instead of individual files
 */

// API utilities
export { API_URL, apiCall, apiGet, apiPost, apiPut, apiPatch, apiDelete, type ApiError } from './api';

// Formatting utilities
export {
  formatPrice,
  formatDuration,
  formatDate,
  formatTime,
  formatDateTime,
  getMonthName,
  getDayName,
  formatPercentage,
} from './formatting';

// Date/Time utilities (backward compatible)
export { calculateDuration, formatElapsedTime } from './dateTimeUtils';

// Error handling utilities
export {
  handleApiError,
  handleSuccess,
  handleWarning,
  confirmDialog,
  showInfo,
  getErrorMessage,
} from './errors';
