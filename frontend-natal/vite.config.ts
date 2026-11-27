import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // evita recarregamentos em loop quando a imagem de compartilhamento é gerada
  optimizeDeps: { include: ['react-dom/server'] },
  // Porta fixa: se a 5173 estiver ocupada, o Vite avisa em vez de pular para 5174, 5175...
  // (o login do Google volta para o endereço exato da porta usada).
  server: { port: 5173, strictPort: true },
})
