/**
 * Modal theme utility for consistent hardcoded colors across light and dark modes
 */

export interface ModalThemeColors {
  overlay: string
  background: string
  headerBackground: string
  headerBorder: string
  text: string
  textSecondary: string
  textMuted: string
  border: string
  buttonPrimary: string
  buttonPrimaryText: string
  buttonSecondary: string
  buttonSecondaryText: string
  buttonDanger: string
  buttonDangerText: string
  buttonSuccess: string
  buttonSuccessText: string
  errorBackground: string
  errorBorder: string
  errorText: string
  successBackground: string
  successBorder: string
  successText: string
  visualizerBackground: string
  visualizerForeground: string
  visualizerActive: string
}

export const MODAL_THEME_COLORS: Record<'light' | 'dark', ModalThemeColors> = {
  light: {
    overlay: 'rgba(0, 0, 0, 0.8)',
    background: '#ffffff',
    headerBackground: '#f8f9fa',
    headerBorder: '#e9ecef',
    text: '#212529',
    textSecondary: '#6c757d',
    textMuted: '#868e96',
    border: '#dee2e6',
    buttonPrimary: '#007bff',
    buttonPrimaryText: '#ffffff',
    buttonSecondary: '#6c757d',
    buttonSecondaryText: '#ffffff',
    buttonDanger: '#dc3545',
    buttonDangerText: '#ffffff',
    buttonSuccess: '#28a745',
    buttonSuccessText: '#ffffff',
    errorBackground: '#f8d7da',
    errorBorder: '#f5c6cb',
    errorText: '#721c24',
    successBackground: '#d4edda',
    successBorder: '#c3e6cb',
    successText: '#155724',
    visualizerBackground: '#f8f9fa',
    visualizerForeground: '#6c757d',
    visualizerActive: '#dc3545',
  },
  dark: {
    overlay: 'rgba(0, 0, 0, 0.9)',
    background: '#1a1a1a',
    headerBackground: '#2d2d2d',
    headerBorder: '#404040',
    text: '#ffffff',
    textSecondary: '#b3b3b3',
    textMuted: '#999999',
    border: '#404040',
    buttonPrimary: '#0d6efd',
    buttonPrimaryText: '#ffffff',
    buttonSecondary: '#6c757d',
    buttonSecondaryText: '#ffffff',
    buttonDanger: '#dc3545',
    buttonDangerText: '#ffffff',
    buttonSuccess: '#198754',
    buttonSuccessText: '#ffffff',
    errorBackground: '#2c0b0e',
    errorBorder: '#842029',
    errorText: '#ea868f',
    successBackground: '#0f2419',
    successBorder: '#0a3622',
    successText: '#75b798',
    visualizerBackground: '#2d2d2d',
    visualizerForeground: '#b3b3b3',
    visualizerActive: '#dc3545',
  },
}

export function getModalThemeColors(theme: 'light' | 'dark'): ModalThemeColors {
  return MODAL_THEME_COLORS[theme]
}
