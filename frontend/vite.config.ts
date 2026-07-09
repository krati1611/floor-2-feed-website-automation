import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { loadEnv } from 'vite'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the parent directory
  const env = loadEnv(mode, path.resolve(__dirname, '..'), '')
  
  return {
    plugins: [react()],
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(env.SUPABASE_URL),
      'import.meta.env.VITE_SUPABASE_KEY': JSON.stringify(env.SUPABASE_KEY),
    }
  }
})
