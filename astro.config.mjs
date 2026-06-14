// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import tailwindcss from '@tailwindcss/vite';

import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  adapter: node({
    mode: 'standalone',
  }),

  output: 'server',

  server: {
    port: 3000,
    host: true,
  },

  vite: {
    plugins: [tailwindcss()],
  },

  integrations: [react()],
});