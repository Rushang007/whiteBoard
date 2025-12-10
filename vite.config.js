import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFile, writeFile, stat, access } from 'fs/promises'
import { constants as fsConstants } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const boardFile = path.join(__dirname, 'board.txt')

const ensureBoardFile = async () => {
  try {
    await access(boardFile, fsConstants.F_OK)
  } catch {
    await writeFile(boardFile, '', 'utf8')
  }
}

const readBoard = async () => {
  await ensureBoardFile()
  const content = await readFile(boardFile, 'utf8')
  const { mtimeMs } = await stat(boardFile)
  return { content, updatedAt: mtimeMs }
}

const writeBoard = async (content) => {
  await ensureBoardFile()
  await writeFile(boardFile, content ?? '', 'utf8')
  return readBoard()
}

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
                res.statusCode = 400
                res.end(JSON.stringify({ error: 'Invalid payload' }))
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
                res.statusCode = 400
                res.end(JSON.stringify({ error: 'Invalid payload' }))
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
