import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    extend: {
      colors: {
        base: '#f7f5ef',
        panel: '#fffdf7',
        ink: '#171412',
        brand: '#0f766e',
        pop: '#ea580c'
      },
      boxShadow: {
        soft: '0 10px 30px rgba(20, 18, 10, 0.08)'
      }
    }
  },
  plugins: []
};

export default config;
