import http from 'http'
import { readFile } from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import sqlite3 from 'sqlite3'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const PORT = process.env.PORT || 4173 // default same as vite preview
const HOST = process.env.HOST || '0.0.0.0'
const BOARD_DB = process.env.BOARD_DB || path.join(__dirname, 'board.db')
const DIST_DIR = path.join(__dirname, 'dist')
const MAX_BODY_SIZE = 1024 * 1024 // 1MB safety guard

sqlite3.verbose()
const db = new sqlite3.Database(BOARD_DB)

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
  const row = await get('SELECT content, updated_at FROM board WHERE id = 1')
  return {
    content: row?.content || '',
    updatedAt: row?.updated_at || Date.now(),
  }
}

const sendJson = (res, status, data) => {
  const body = JSON.stringify(data)
  res.writeHead(status, {
    'Content-Type': 'application/json',
  })
  res.end(body)
}

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
}

const serveStatic = async (req, res) => {
  const safePath = decodeURIComponent(req.url.split('?')[0])
  const rel = safePath === '/' ? '/index.html' : safePath
  const candidate = path.normalize(path.join(DIST_DIR, rel))

  if (!candidate.startsWith(DIST_DIR)) {
    res.writeHead(400)
    return res.end('Bad request')
  }

  try {
    const data = await readFile(candidate)
    const ext = path.extname(candidate)
    const type = mimeTypes[ext] || 'application/octet-stream'
    res.writeHead(200, { 'Content-Type': type })
    res.end(data)
  } catch {
    // Fallback to SPA index
    try {
      const indexHtml = await readFile(path.join(DIST_DIR, 'index.html'))
      res.writeHead(200, { 'Content-Type': mimeTypes['.html'] })
      res.end(indexHtml)
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/plain' })
      res.end('Not found')
    }
  }
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    })
    return res.end()
  }

  if (req.url.startsWith('/api/board')) {
    try {
      await ensureDb()

      if (req.method === 'GET') {
        const data = await readBoard()
        return sendJson(res, 200, data)
      }

      if (req.method === 'POST') {
        let body = ''
        req.on('data', (chunk) => {
          body += chunk
          if (body.length > MAX_BODY_SIZE) {
            res.writeHead(413, { 'Content-Type': 'text/plain' })
            res.end('Payload too large')
            req.destroy()
          }
        })

        req.on('end', async () => {
          try {
            const parsed = JSON.parse(body || '{}')
            const content = typeof parsed.content === 'string' ? parsed.content : ''
            await run('UPDATE board SET content = ?, updated_at = ? WHERE id = 1', [
              content,
              Date.now(),
            ])
            const data = await readBoard()
            sendJson(res, 200, data)
          } catch (err) {
            console.error('Write error', err)
            sendJson(res, 400, { error: 'Invalid payload' })
          }
        })
        return
      }

      res.writeHead(405, { 'Content-Type': 'text/plain' })
      res.end('Method not allowed')
      return
    } catch (err) {
      console.error('Server error', err)
      sendJson(res, 500, { error: 'Server error' })
      return
    }
  }

  // Static files + SPA fallback
  serveStatic(req, res)
})

ensureDb()
  .then(() => {
    server.listen(PORT, HOST, () => {
      console.log(`Board server running at http://${HOST}:${PORT}`)
    })
  })
  .catch((err) => {
    console.error('Failed to initialize database', err)
    process.exit(1)
  })
