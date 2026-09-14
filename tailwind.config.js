/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  important: true,
  theme: {
    screens: {
      'xs': '320px',     // Mobile
      'sm': '640px',     // Mobile landscape
      'md': '768px',     // Tablet
      'lg': '1024px',    // Desktop
      'xl': '1440px',    // Ultra-Wide
      '2xl': '1920px',   // 4k+
    },
    extend: {
      fontFamily: {
        sans: ['ATT Aleck Sans', 'Inter var', 'system-ui', 'sans-serif'],
      },
      colors: {
        // AT&T Flywheel Design System - Figma-matched (SDCI.fig)
        fw: {
          // Brand
          'att-blue': '#009fdb',
          'functional-blue': '#0074b3',

          // AT&T Blue ramp
          blue: {
            DEFAULT: '#009fdb',
            '000': '#00abeb',
            '100': '#66c8f0',
            '200': '#99daf5',
            light: '#e6f6fd',
            functional: '#0074b3',
          },

          // Cobalt - Primary interactive scale
          cobalt: {
            '100': '#e6f0fa',   // Ghost button bg
            '400': '#3374cc',
            '600': '#0057b8',   // PRIMARY - buttons, links, active nav
            '700': '#00388f',   // Pressed/hover states
            '800': '#00235a',   // Deep pressed states
          },

          // Flywheel Gray Scale (Figma-matched)
          gray: {
            '100': '#f8fafb',   // Page wash background
            '200': '#f3f4f6',   // Subtle backgrounds
            '300': '#dcdfe3',   // Borders, dividers (25x in Figma)
            '400': '#bdc2c7',   // Disabled states
            '500': '#878c94',   // Muted text, placeholders
            '600': '#686e74',   // Secondary text
            '700': '#454b52',   // Body text (32x in Figma)
            '800': '#1d2329',   // Dark text, headings (79x in Figma)
            '900': '#13171b',   // Darkest
          },

          // Semantic Colors
          green: {
            '400': '#4aaf42',
            '600': '#2d7e24',   // Success
          },
          orange: {
            '400': '#ff8f4d',
            '600': '#ea712f',   // Warning
          },
          red: {
            '400': '#ff5c73',
            '600': '#c70032',   // Error
          },

          // Accent Colors (from Figma)
          purple: '#af29bb',    // Visual Designer, secondary flows
        },
        // Shorthand grays
        gray: {
          50: '#f8fafb',
          100: '#f3f4f6',
          200: '#dcdfe3',
          300: '#dcdfe3',
          400: '#bdc2c7',
          500: '#878c94',
          600: '#686e74',
          700: '#454b52',
          800: '#1d2329',
          900: '#13171b',
        },
        brand: {
          blue: '#0057b8',      // Cobalt 600 - PRIMARY interactive
          lightBlue: '#e6f6fd',
          darkBlue: '#00388f',  // Cobalt 700 - pressed states
          accent: '#009fdb',    // AT&T Blue
          neutral: '#686e74',
          purple: '#af29bb',    // Figma purple accent
        },
        complementary: {
          teal: '#00a3a6',
          orange: '#ea712f',
          green: '#2d7e24',
          purple: '#af29bb',
        }
      },
      textColor: {
        // Flywheel Text Tokens - Figma-matched
        'fw-heading': '#1d2329',   // Gray 800 (Figma heading color)
        'fw-body': '#454b52',      // Gray 700
        'fw-bodyLight': '#5c6167', // Gray 650 — darkened from #686e74 for WCAG AA (4.5:1) on fw-neutral/fw-wash chips
        'fw-disabled': '#878c94',  // Gray 500
        'fw-legal': '#5c6167',     // Gray 650 (kept in step with fw-bodyLight)
        'fw-link': '#0057b8',      // Cobalt 600 - primary interactive
        'fw-linkHover': '#00388f', // Cobalt 700
        'fw-linkPrimary': '#ffffff',
        'fw-linkSecondary': '#0057b8', // Cobalt 600
        'fw-success': '#1e6b17',   // darkened from #2d7e24 for WCAG AA text contrast on fw-successLight tint
        'fw-warn': '#9a4708',      // accessible burnt-amber for amber TEXT (clears 4.5:1 even on fw-warnLight tint)
        'fw-error': '#c70032',
        'fw-info': '#0074b3',
        'fw-purple': '#af29bb',    // Purple accent text
      },
      backgroundColor: {
        // Flywheel Background Tokens - Figma-matched
        'fw-heading': '#1d2329',   // Gray 800 — dark action surfaces, tooltips
        'fw-base': '#ffffff',
        'fw-wash': '#f8fafb',      // Gray 100 - page background
        'fw-neutral': '#f3f4f6',   // Gray 200
        'fw-accent': '#e6f6fd',    // AT&T Blue light tint
        'fw-primary': '#0057b8',   // Cobalt 600 - PRIMARY
        'fw-ctaPrimary': '#0057b8',
        'fw-ctaPrimaryHover': '#00388f', // Cobalt 700
        'fw-ctaGhost': '#e6f0fa',  // Cobalt 100
        'fw-disabled': '#dcdfe3',  // Gray 300
        'fw-active': '#0057b8',    // Cobalt 600 - active/selected state
        'fw-success': '#2d7e24',
        'fw-warn': '#ea712f',
        'fw-error': '#c70032',
        'fw-purple': '#af29bb',
        'fw-successLight': 'rgb(98 208 45 / 0.15)',  // 15% opacity
        'fw-warnLight': 'rgb(249 124 0 / 0.15)',
        'fw-infoLight': 'rgb(0 132 255 / 0.15)',
        'fw-purpleLight': 'rgb(175 41 187 / 0.15)',
        'fw-errorLight': 'rgb(199 0 50 / 0.15)',
      },
      borderColor: {
        // Flywheel Border Tokens - Figma-matched
        'fw-primary': '#686e74',   // Gray 600
        'fw-secondary': '#dcdfe3', // Gray 300 - most common border
        'fw-active': '#0057b8',    // Cobalt 600
        'fw-hover': '#0057b8',
        'fw-focus': '#1d2329',     // Gray 800
        'fw-disabled': '#dcdfe3',
        'fw-success': '#2d7e24',
        'fw-warn': '#ea712f',
        'fw-error': '#c70032',
        'fw-ctaPrimary': '#0057b8',
        'fw-purple': '#af29bb',
        'fw-successLight': 'rgb(98 208 45 / 0.3)',
        'fw-warnLight': 'rgb(249 124 0 / 0.3)',
        'fw-errorLight': 'rgb(199 0 50 / 0.3)',
        'fw-infoLight': 'rgb(0 132 255 / 0.3)',
        'fw-purpleLight': 'rgb(175 41 187 / 0.3)',
      },
      /* Ring tokens.
         `ringColor` does NOT inherit the fw names from textColor /
         backgroundColor / borderColor — those are extended separately — so
         until now `ring-fw-active` was the ONLY fw ring that existed.
         Everything else (ring-fw-link in 124 places, ring-brand-blue,
         ring-blue-500) compiled to nothing and silently fell back to
         Tailwind's stock `rgb(59 130 246 / 0.5)`: verified in the browser,
         where `ring-fw-link` and a bare `ring-2` returned the identical
         value. The result was a generic blue focus ring, in a product whose
         palette contains no such blue.

         fw-active stays #0074b3, the functional blue, and stays the focus
         ring: it is deliberately NOT the CTA cobalt, so a focus ring around a
         cobalt button is still visible. The rest are declared at their true
         palette values so a name never resolves to something it does not
         say. */
      ringColor: {
        'fw-active': '#0074b3',    // Functional Blue — the focus ring
        'fw-base': '#ffffff',      // white cutout ring (nav dots) — was silently stock blue
        'fw-link': '#0057b8',      // Cobalt 600
        'fw-ctaPrimary': '#0057b8',
        'fw-error': '#c70032',
        'fw-success': '#2d7e24',
        'fw-focus': '#1d2329',     // Gray 800
      },
      outlineColor: {
        'fw-active': '#0074b3',
        'fw-link': '#0057b8',
      },
      accentColor: {
        'fw-link': '#0057b8',      // native control tint (checkbox, range)
      },
      /* Same trap as ringColor: this scale is separate too, so a
         `decoration-fw-*` would have silently compiled to nothing. */
      textDecorationColor: {
        'fw-secondary': '#dcdfe3',
        'fw-bodyLight': '#5c6167',
      },
      fontSize: {
        // Figma typography scale (bumped +2px each step for demo legibility)
        'figma-xs': ['0.75rem', { lineHeight: '1.125rem', letterSpacing: '-0.03em' }],      // 12px - bodyXS
        'figma-sm': ['0.875rem', { lineHeight: '1.25rem', letterSpacing: '-0.03em' }],      // 14px - bodyS
        'figma-base': ['1rem', { lineHeight: '1.5rem', letterSpacing: '-0.03em' }],         // 16px - bodyBase
        'figma-lg': ['1.125rem', { lineHeight: '1.625rem', letterSpacing: '-0.03em' }],     // 18px - h6
        'figma-xl': ['1.625rem', { lineHeight: '2.125rem', letterSpacing: '-0.03em' }],     // 26px - h5
        'figma-2xl': ['2.125rem', { lineHeight: '2.625rem', letterSpacing: '-0.03em' }],    // 34px - h4
        'figma-3xl': ['2.625rem', { lineHeight: '3.125rem', letterSpacing: '-0.03em' }],    // 42px - h3
        'figma-4xl': ['3.125rem', { lineHeight: '3.625rem', letterSpacing: '-0.03em' }],    // 50px - h2
        'figma-5xl': ['3.625rem', { lineHeight: '4.125rem', letterSpacing: '-0.03em' }],    // 58px - h1
        // Tag variants (positive letter-spacing)
        'tag-sm': ['0.875rem', { lineHeight: '1.25rem', letterSpacing: '0.04em' }],         // 14px tag
        'tag-xs': ['0.75rem', { lineHeight: '1.125rem', letterSpacing: '0.04em' }],         // 12px tag
      },
      borderRadius: {
        'full': '9999px',    // Buttons, pills, search, tags, badges, progress bars
        'lg': '0.5rem',      // 8px - Inputs, dropdowns, metric cells
        'md': '0.375rem',    // 6px
        'xl': '0.75rem',     // 12px
        '2xl': '1rem',       // 16px - Cards, containers, tables
        '3xl': '1.5rem',     // 24px - Modals, role cards
      },
      width: {
        'sidebar': '186px',        // Vertical tab group sidebar
        'sidebar-overlay': '320px', // Overlay nav panel
        'search': '560px',         // Search bar width
      },
      height: {
        'input': '2.5rem',   // 40px - Standard input height
        'btn': '2.25rem',    // 36px - Standard button height
        'btn-sm': '1.75rem', // 28px - Small button
        'btn-lg': '2.75rem', // 44px - Large button
        'nav': '4rem',       // 64px - Nav bar height
        'separator': '1.25rem', // 20px - Vertical separator lines
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms')({
      strategy: 'class',
    }),
    require('@tailwindcss/typography'),
  ],
  future: {
    hoverOnlyWhenSupported: true,
  },
  // Content purging is handled automatically in Tailwind CSS v3+
};