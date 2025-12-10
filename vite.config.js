import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readBoard, writeBoard } from './storage.js'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'board-api',
      configureServer(server) {
        server.middlewares.use('/api/board', async (req, res) => {
          if (req.method === 'GET') {
            const data = await readBoard()
            res.setHeader('Content-Type', 'application/json')
            return res.end(JSON.stringify(data))
          }

          if (req.method === 'POST') {
            let body = ''
            req.on('data', (chunk) => {
              body += chunk
            })
            req.on('end', async () => {
              try {
                const parsed = JSON.parse(body || '{}')
                const content = typeof parsed.content === 'string' ? parsed.content : ''
                const data = await writeBoard(content)
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify(data))
              } catch (err) {
                console.error(err)
                const errorMsg = err.message || 'Invalid payload'
                res.statusCode = err.message?.includes('too large') ? 413 : 400
                res.end(JSON.stringify({ error: errorMsg }))
              }
            })
            return
          }

          res.statusCode = 405
          res.end('Method not allowed')
        })
      },
      configurePreviewServer(server) {
        server.middlewares.use('/api/board', async (req, res) => {
          if (req.method === 'GET') {
            const data = await readBoard()
            res.setHeader('Content-Type', 'application/json')
            return res.end(JSON.stringify(data))
          }

          if (req.method === 'POST') {
            let body = ''
            req.on('data', (chunk) => {
              body += chunk
            })
            req.on('end', async () => {
              try {
                const parsed = JSON.parse(body || '{}')
                const content = typeof parsed.content === 'string' ? parsed.content : ''
                const data = await writeBoard(content)
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify(data))
              } catch (err) {
                console.error(err)
                const errorMsg = err.message || 'Invalid payload'
                res.statusCode = err.message?.includes('too large') ? 413 : 400
                res.end(JSON.stringify({ error: errorMsg }))
              }
            })
            return
          }

          res.statusCode = 405
          res.end('Method not allowed')
        })
      },
    },
  ],
})
