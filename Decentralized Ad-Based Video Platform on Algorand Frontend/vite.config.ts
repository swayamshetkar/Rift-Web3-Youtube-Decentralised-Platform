import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],

  // Optimize dependencies - include problematic ones
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
    include: ['@perawallet/connect'],
  },

  // Server config for development
  server: {
    fs: {
      allow: ['.']
    }
  },

  // Define global variables for the build
  define: {
    global: 'globalThis',
    'process.env': '{}',
    'process.platform': '"browser"',
    'process.version': '""',
  },

  // Build config
  build: {
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true,
    },
  },
})
