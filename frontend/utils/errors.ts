/**
 * Error handling and UI feedback utilities
 */

import Swal from 'sweetalert2';

/**
 * Error handler with user-facing feedback via SweetAlert2
 * @param error - Error object
 * @param defaultMessage - Default message if error details not available
 * @param title - Custom title for alert
 */
export function handleApiError(
  error: any,
  defaultMessage = 'Une erreur est survenue',
  title = 'Erreur'
): void {
  let message = defaultMessage;

  // Extract error message from various formats
  if (error?.message) {
    message = error.message;
  } else if (error?.error) {
    message = error.error;
  } else if (typeof error === 'string') {
    message = error;
  }

  // Show error alert
  Swal.fire({
    icon: 'error',
    title,
    text: message,
    background: '#18181b',
    color: '#fff',
    confirmButtonColor: '#eab308',
  });

  // Log to console for debugging
  console.error('[API Error]', {
    message,
    details: error,
  });
}

/**
 * Success handler with optional SweetAlert2 notification
 * @param message - Success message
 * @param title - Alert title
 */
export function handleSuccess(
  message = 'Opération réussie',
  title = 'Succès'
): void {
  Swal.fire({
    icon: 'success',
    title,
    text: message,
    timer: 1500,
    showConfirmButton: false,
    background: '#18181b',
    color: '#fff',
  });
}

/**
 * Warning handler with SweetAlert2
 * @param message - Warning message
 * @param title - Alert title
 */
export function handleWarning(
  message: string,
  title = 'Attention'
): void {
  Swal.fire({
    icon: 'warning',
    title,
    text: message,
    background: '#18181b',
    color: '#fff',
    confirmButtonColor: '#eab308',
  });
}

/**
 * Confirm dialog with SweetAlert2
 * @param title - Dialog title
 * @param message - Dialog message
 * @param confirmText - Confirm button text
 * @param cancelText - Cancel button text
 * @returns Promise<boolean> - True if confirmed, false if cancelled
 */
export async function confirmDialog(
  title: string,
  message: string,
  confirmText = 'Confirmer',
  cancelText = 'Annuler'
): Promise<boolean> {
  const result = await Swal.fire({
    icon: 'question',
    title,
    text: message,
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: cancelText,
    confirmButtonColor: '#eab308',
    cancelButtonColor: '#6b7280',
    background: '#18181b',
    color: '#fff',
  });

  return result.isConfirmed;
}

/**
 * Info dialog with SweetAlert2
 * @param title - Dialog title
 * @param message - Dialog message
 */
export function showInfo(title: string, message: string): void {
  Swal.fire({
    icon: 'info',
    title,
    text: message,
    background: '#18181b',
    color: '#fff',
    confirmButtonColor: '#eab308',
  });
}

/**
 * Get user-friendly error message based on error type
 * @param error - Error object
 * @returns User-friendly error message
 */
export function getErrorMessage(error: any): string {
  if (!error) return 'Une erreur inconnue est survenue';

  // API error with specific message
  if (error.message) return error.message;

  // Network error
  if (error instanceof TypeError && error.message === 'Failed to fetch') {
    return 'Erreur de connexion au serveur. Vérifiez votre connexion.';
  }

  // HTTP error status
  if (error.status) {
    switch (error.status) {
      case 400:
        return 'Requête invalide';
      case 401:
        return 'Authentification requise';
      case 403:
        return 'Accès refusé';
      case 404:
        return 'Ressource non trouvée';
      case 500:
        return 'Erreur serveur';
      case 503:
        return 'Service indisponible';
      default:
        return `Erreur HTTP ${error.status}`;
    }
  }

  // Generic message
  return 'Une erreur est survenue';
}
