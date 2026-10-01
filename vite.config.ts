import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Three.js sozinho já passa de 500 kB; o aviso padrão não ajuda aqui
  build: { chunkSizeWarningLimit: 1600 },
  // Permite abrir pelo tablet/celular na mesma rede (http://IP-do-computador:5173)
  server: { host: true },
})
