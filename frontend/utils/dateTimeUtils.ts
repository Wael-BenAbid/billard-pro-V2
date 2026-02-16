/**
 * Date/Time utilities - re-exports from formatting.ts for backward compatibility
 * These functions are now centralized in formatting.ts
 */

export { formatTime, formatDate, formatPrice, formatDateTime, getMonthName, getDayName } from './formatting';

/**
 * Calculate duration between two ISO date strings
 * @param startTime - Start ISO date string
 * @param stopTime - End ISO date string
 * @returns Formatted duration string (Xh YYm ZZs)
 */
export const calculateDuration = (startTime: string, stopTime: string): string => {
  const start = new Date(startTime).getTime();
  const end = new Date(stopTime).getTime();
  const diff = Math.floor((end - start) / 1000);
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  const s = diff % 60;
  return `${h}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`;
};

/**
 * Format elapsed time since a start date (live timer format)
 * @param startTime - Start ISO date string
 * @returns Formatted time string (HH:MM:SS)
 */
export const formatElapsedTime = (startTime: string): string => {
  const start = new Date(startTime).getTime();
  const now = Date.now();
  const diff = Math.floor((now - start) / 1000);
  
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  const s = diff % 60;
  
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

