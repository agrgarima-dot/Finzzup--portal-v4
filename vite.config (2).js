import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: [
      'recharts',
      'd3-scale',
      'd3-shape', 
      'd3-array',
      'd3-interpolate',
      'd3-color',
      'd3-format',
      'd3-time',
      'd3-time-format',
      'd3-path',
    ],
  },
  build: {
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
})
