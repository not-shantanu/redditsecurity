import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Microsoft Fluent Design System Colors
        ms: {
          primary: '#0078D4', // Microsoft Blue
          primaryHover: '#106EBE',
          primaryPressed: '#005A9E',
          secondary: '#F3F2F1',
          secondaryHover: '#EDEBE9',
          secondaryPressed: '#E1DFDD',
          neutral: '#323130',
          neutralSecondary: '#605E5C',
          neutralTertiary: '#A19F9D',
          neutralLight: '#F3F2F1',
          neutralLighter: '#FAF9F8',
          error: '#D13438',
          errorHover: '#A4262C',
          success: '#107C10',
          warning: '#FFAA44',
          border: '#EDEBE9',
          borderHover: '#C8C6C4',
          background: '#FFFFFF',
          backgroundHover: '#F3F2F1',
        },
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      fontFamily: {
        sans: ['Segoe UI', 'Segoe UI Web (West European)', 'Segoe UI', '-apple-system', 'BlinkMacSystemFont', 'Roboto', 'Helvetica Neue', 'sans-serif'],
      },
      borderRadius: {
        'ms': '2px', // Microsoft Fluent Design System: 2px border radius standard
      },
      spacing: {
        // Microsoft Fluent Design System spacing tokens (4px base unit)
        // Reference: https://fluent2.microsoft.design/layout
        'ms-xs': '4px',   // 1 * 4px
        'ms-sm': '8px',   // 2 * 4px
        'ms-md': '12px',  // 3 * 4px
        'ms-lg': '16px',  // 4 * 4px (standard card padding)
        'ms-xl': '20px',  // 5 * 4px
        'ms-2xl': '24px', // 6 * 4px
        'ms-3xl': '32px', // 8 * 4px
        'ms-4xl': '40px', // 10 * 4px (standard button height)
        'ms-5xl': '48px', // 12 * 4px
      },
      boxShadow: {
        'ms-sm': '0 1.6px 3.6px 0 rgba(0, 0, 0, 0.132), 0 0.3px 0.9px 0 rgba(0, 0, 0, 0.108)',
        'ms-md': '0 3.2px 7.2px 0 rgba(0, 0, 0, 0.132), 0 0.6px 1.8px 0 rgba(0, 0, 0, 0.108)',
        'ms-lg': '0 6.4px 14.4px 0 rgba(0, 0, 0, 0.132), 0 1.2px 3.6px 0 rgba(0, 0, 0, 0.108)',
      },
    },
  },
  plugins: [],
};
export default config;

