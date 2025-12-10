import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'url'
import sqlite3 from 'sqlite3'
import path from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const dbPath = process.env.BOARD_DB || path.join(__dirname, 'board.db')

sqlite3.verbose()
const db = new sqlite3.Database(dbPath)

const run = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function runCb(err) {
      if (err) reject(err)
      else resolve(this)
    })
  })

const get = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err)
      else resolve(row)
    })
  })

const ensureDb = async () => {
  await run(
    `CREATE TABLE IF NOT EXISTS board (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      content TEXT NOT NULL DEFAULT '',
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
    )`
  )
  const row = await get('SELECT id FROM board WHERE id = 1')
  if (!row) {
    await run('INSERT INTO board (id, content, updated_at) VALUES (1, "", strftime(\'%s\',\'now\') * 1000)')
  }
}

const readBoard = async () => {
  await ensureDb()
  const row = await get('SELECT content, updated_at FROM board WHERE id = 1')
  return { content: row?.content || '', updatedAt: row?.updated_at || Date.now() }
}

const writeBoard = async (content) => {
  await ensureDb()
  await run('UPDATE board SET content = ?, updated_at = ? WHERE id = 1', [
    content ?? '',
    Date.now(),
  ])
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
