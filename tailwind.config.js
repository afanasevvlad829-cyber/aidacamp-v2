/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/pages/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}',
    './src/components/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}',
  ],
  theme: {
    extend: {
      colors: {
        // lanit-v5 design tokens (dark theme)
        'lanit-bg': '#0C0E11',
        'lanit-bg2': '#111418',
        'lanit-bg3': '#181C22',
        'lanit-bg4': '#1F2530',
        'lanit-txt': '#E4E6EF',
        'lanit-txt2': '#9098AB',
        'lanit-or': '#FF5A1F',      // brand orange
        'lanit-or2': '#FF7A3D',
        'lanit-green': '#22C76A',
        'lanit-blue': '#4A9EFF',
        'lanit-surface': 'rgba(255,255,255,0.04)',
        'lanit-bdr': 'rgba(255,255,255,0.07)',
        'lanit-bdr2': 'rgba(255,255,255,0.13)',
        'lanit-code-bg': '#0F1419',
        'lanit-code-text': '#E6EDF3',
        'lanit-code-comment': '#8B949E',
        'lanit-code-dark': '#1e2430',
        'lanit-error': '#EF4444',
        'lanit-warn': '#FACC15',
        'lanit-amber': '#FB923C',
        'lanit-white': '#ffffff',
      },
      gap: {
        'lanit-xs': '6px',
        'lanit-sm': '10px',
        'lanit-md': '16px',
        'lanit-lg': '24px',
        'lanit-xl': '36px',
        'lanit-2xl': '48px',
      },
      padding: {
        'lanit-xs': '8px',
        'lanit-sm': '16px',
        'lanit-md': '24px',
        'lanit-lg': '48px',
        'lanit-xl': '80px',
      },
      fontSize: {
        'lanit-xs': '12px',
        'lanit-sm': '16px',
        'lanit-base': '17px',
        'lanit-md': '18px',
        'lanit-lg': '20px',
        'lanit-xl': '22px',
        'lanit-2xl': '24px',
        'lanit-3xl': '28px',
      },
      lineHeight: {
        'lanit-tight': '1.1',
        'lanit-snug': '1.25',
        'lanit-normal': '1.6',
        'lanit-relaxed': '1.75',
      },
      borderRadius: {
        'lanit-xs': '4px',
        'lanit-sm': '8px',
        'lanit-md': '12px',
        'lanit-lg': '16px',
        'lanit-xl': '20px',
        'lanit-2xl': '28px',
        'lanit-full': '9999px',
      },
      boxShadow: {
        'lanit': '0 24px 64px rgba(0,0,0,0.55)',
      },
    },
  },
  plugins: [],
}
