/**
 * Formatting utilities for consistent data presentation
 */

/**
 * Format price in millimes to DT (Dinars Tunisiens) or millimes
 * @param mil - Price in millimes
 * @returns Formatted price string
 */
export function formatPrice(mil: number): string {
  if (!mil || mil === 0) return '0.000 DT';
  
  // If less than 10000 millimes, show in millimes
  if (mil < 10000) {
    return `${Math.round(mil)} mil`;
  }
  
  // Convert to DT (1 DT = 1000 millimes)
  const dt = mil / 1000;
  return `${dt.toLocaleString('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  })} DT`;
}

/**
 * Format duration in seconds to HH:MM:SS
 * @param seconds - Duration in seconds
 * @returns Formatted duration string
 */
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

/**
 * Format date to French locale
 * @param dateStr - ISO date string or Date object
 * @param includeTime - Whether to include time
 * @returns Formatted date string
 */
export function formatDate(dateStr: string | Date, includeTime = false): string {
  const date = dateStr instanceof Date ? dateStr : new Date(dateStr);
  
  const options: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  };
  
  if (includeTime) {
    options.hour = '2-digit';
    options.minute = '2-digit';
  }
  
  return date.toLocaleDateString('fr-FR', options);
}

/**
 * Format time from ISO string
 * @param timeStr - ISO time string or Date object
 * @returns Formatted time string (HH:MM)
 */
export function formatTime(timeStr: string | Date): string {
  const date = timeStr instanceof Date ? timeStr : new Date(timeStr);
  return date.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format date + time together
 * @param dateStr - ISO date string or Date object
 * @returns Formatted date and time string
 */
export function formatDateTime(dateStr: string | Date): string {
  return formatDate(dateStr, true);
}

/**
 * Format month name in French
 * @param month - Month number (0-11)
 * @returns French month name
 */
export function getMonthName(month: number): string {
  const monthNames = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];
  return monthNames[month] || '';
}

/**
 * Format day name in French
 * @param day - Day number (0-6, where 0 is Sunday)
 * @returns French day name
 */
export function getDayName(day: number): string {
  const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  return dayNames[day] || '';
}

/**
 * Format percentage
 * @param numerator - Numerator
 * @param denominator - Denominator
 * @returns Formatted percentage string
 */
export function formatPercentage(numerator: number, denominator: number): string {
  if (denominator === 0) return '0%';
  const percentage = (numerator / denominator) * 100;
  return `${percentage.toFixed(1)}%`;
}
