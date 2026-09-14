/**
 * Utility functions for error handling throughout the application
 */

import { ReactNode } from 'react';

/**
 * Safe JSON parsing with error handling
 * @param json The JSON string to parse
 * @param fallback Fallback value if parsing fails
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T;
  } catch (error) {
    console.error('Error parsing JSON:', error);
    return fallback;
  }
}

/**
 * Try to execute a function and return a fallback if it fails
 * @param fn The function to try executing
 * @param fallback The fallback value if the function fails
 */
export function tryCatch<T, F>(fn: () => T, fallback: F): T | F {
  try {
    return fn();
  } catch (error) {
    console.error('Error in tryCatch:', error);
    return fallback;
  }
}

/**
 * Safe access to nested object properties
 * @param obj The object to access
 * @param path The path to the property as a string (e.g. 'user.profile.name')
 * @param fallback The fallback value if the property doesn't exist
 */
function safeAccess<T>(obj: any, path: string, fallback: T): T {
  try {
    const keys = path.split('.');
    let current = obj;
    
    for (const key of keys) {
      if (current === null || current === undefined) {
        return fallback;
      }
      current = current[key];
    }
    
    return current === null || current === undefined ? fallback : current;
  } catch (error) {
    console.error(`Error accessing ${path}:`, error);
    return fallback;
  }
}

/**
 * Safe render that handles null, undefined, and errors
 * @param component The component or element to render
 * @param fallback Fallback if the component is null, undefined, or throws
 */
function safeRender(component: ReactNode | null | undefined, fallback: ReactNode = null): ReactNode {
  if (component === null || component === undefined) {
    return fallback;
  }
  
  try {
    return component;
  } catch (error) {
    console.error('Error rendering component:', error);
    return fallback;
  }
}

/**
 * Log an error to the console and potentially to an error monitoring service
 * @param error The error object
 * @param context Additional context information
 */
export function logError(error: unknown, context: Record<string, any> = {}): void {
  console.error('Application error:', error, context);
  
  // Send to error monitoring service if available
  if (window.Sentry) {
    window.Sentry.captureException(error, { 
      extra: context 
    });
  }
}

/**
 * Handle API errors consistently
 * @param error The error from the API call
 * @param fallbackMessage Default message if none can be extracted
 */
export function handleApiError(error: unknown, fallbackMessage = 'An unexpected error occurred'): string {
  if (typeof error === 'string') {
    return error;
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === 'object' && error !== null) {
    // Try to extract message from common API error formats
    const errorObj = error as any;
    
    if (errorObj.message) {
      return errorObj.message;
    }
    
    if (errorObj.error?.message) {
      return errorObj.error.message;
    }
    
    if (errorObj.data?.message) {
      return errorObj.data.message;
    }
  }
  
  return fallbackMessage;
}

/**
 * Generate a fallback ID for when the real ID is missing
 */
function generateFallbackId(): string {
  return `fallback-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Detect if the application is running in a development environment
 */
function isDevelopment(): boolean {
  return import.meta.env.DEV || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
}