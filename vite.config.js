import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: [
      'recharts',
      'recharts/es6/chart/AreaChart',
      'recharts/es6/chart/BarChart', 
      'recharts/es6/chart/LineChart',
    ],
  },
})
