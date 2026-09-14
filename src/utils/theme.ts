/**
 * Utility functions for working with design tokens and themes
 */

/**
 * Sets a CSS custom property on the document root
 * @param property - The CSS property name (without --) 
 * @param value - The value to set
 */
function setCSSVariable(property: string, value: string): void {
  document.documentElement.style.setProperty(`--${property}`, value);
}

/**
 * Gets a CSS custom property from the document root
 * @param property - The CSS property name (without --)
 * @returns The property value
 */
function getCSSVariable(property: string): string {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(`--${property}`)
    .trim();
}

/**
 * Applies a theme by setting multiple CSS variables at once
 * @param theme - Object containing property-value pairs
 */
export function applyTheme(theme: Record<string, string>): void {
  Object.entries(theme).forEach(([property, value]) => {
    setCSSVariable(property, value);
  });
}

/**
 * Converts a hex color to RGB values
 * @param hex - Hex color code
 * @returns RGB values as an object
 */
function hexToRGB(hex: string): { r: number; g: number; b: number } {
  // Remove # if present
  hex = hex.replace('#', '');
  
  // Parse hex values
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  return { r, g, b };
}

/**
 * Creates a CSS rgba color string
 * @param hex - Hex color code
 * @param alpha - Alpha value (0-1)
 * @returns CSS rgba string
 */
function hexToRGBA(hex: string, alpha: number): string {
  const { r, g, b } = hexToRGB(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Determines if a color is light or dark
 * @param hex - Hex color code
 * @returns Boolean indicating if color is light
 */
function isLightColor(hex: string): boolean {
  const { r, g, b } = hexToRGB(hex);
  // Calculate perceived brightness using the formula: (0.299*R + 0.587*G + 0.114*B)
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 128;
}

/**
 * Gets appropriate text color (black or white) based on background color
 * @param bgHex - Background color hex code
 * @returns Text color hex code
 */
function getContrastTextColor(bgHex: string): string {
  return isLightColor(bgHex) ? '#000000' : '#ffffff';
}

/**
 * Tenant branding configuration
 */
export interface BrandingConfig {
  productName: string;
  primaryColor: string;
  accentColor: string;
  fontFamily: string;
  logo?: string;
}

export const DEFAULT_BRANDING: BrandingConfig = {
  productName: 'AI-grade network',
  primaryColor: '#0057B8',
  accentColor: '#009FDB',
  fontFamily: 'Inter',
};

/**
 * Applies tenant branding by mapping brand colors to CSS custom properties.
 * Called on tenant switch and branding editor save.
 */
export function applyBranding(branding: BrandingConfig): void {
  const root = document.documentElement;
  const { primaryColor, accentColor } = branding;

  // Map to existing Tailwind/Figma tokens
  root.style.setProperty('--color-brand-primary', primaryColor);
  root.style.setProperty('--color-brand-accent', accentColor);

  // Generate hover variant (darken primary by 10%)
  const { r, g, b } = hexToRGB(primaryColor);
  const darken = (v: number) => Math.max(0, Math.floor(v * 0.85));
  root.style.setProperty('--color-brand-primary-hover', `rgb(${darken(r)}, ${darken(g)}, ${darken(b)})`);

  // Light tint of accent for backgrounds
  root.style.setProperty('--color-brand-accent-light', hexToRGBA(accentColor, 0.1));

  // Font family
  if (branding.fontFamily && branding.fontFamily !== 'Inter') {
    root.style.setProperty('--font-family-brand', branding.fontFamily);
  } else {
    root.style.removeProperty('--font-family-brand');
  }
}

/**
 * Resets branding to AT&T defaults
 */
export function resetBranding(): void {
  applyBranding(DEFAULT_BRANDING);
}