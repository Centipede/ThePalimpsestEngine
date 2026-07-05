import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [vue({
      template: {
        compilerOptions: {
          isCustomElement: tag => tag.startsWith('sl-')
        }
      }
    })],
    build: {
      outDir: '../Palimpsest/static',
      emptyOutDir: true,
      rollupOptions: {
        input: {
          shoelace: resolve(__dirname, 'src/shoelace.ts'),
          'palimpsest-web': resolve(__dirname, 'src/main.ts'),
        },
        output: {
          entryFileNames: '[name].js',
          chunkFileNames: '[name]-[hash].js',
          assetFileNames: '[name][extname]',
        },
      },
    },
    server: {
      port: 5174,
      proxy: {
        '/testbooks': {
          target: `http://${env.TESTSERVER_HOST}:${env.TESTSERVER_PORT}`,
          changeOrigin: true,
          headers: {
            Authorization: `Token ${env.API_TOKEN}`,
          },
        },
        '/media': {
          target: `http://${env.TESTSERVER_HOST}:${env.TESTSERVER_PORT}`,
          changeOrigin: true,
        },
      },
    },
  }
})
