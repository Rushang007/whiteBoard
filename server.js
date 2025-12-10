import http from 'http'
import { readBoard, writeBoard } from './storage.js'

const PORT = process.env.PORT || 4000
const HOST = process.env.HOST || '0.0.0.0'
const MAX_BODY_SIZE = 5 * 1024 * 1024 // 5MB - supports 50,000+ characters easily

const sendJson = (res, status, data) => {
  const body = JSON.stringify(data)
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  })
  res.end(body)
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

  if (req.url === '/health') {
    return sendJson(res, 200, { ok: true })
  }

  if (req.url !== '/api/board') {
    res.writeHead(404, { 'Content-Type': 'text/plain' })
    return res.end('Not found')
  }

  try {
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
          const data = await writeBoard(content)
          sendJson(res, 200, data)
        } catch (err) {
          console.error('Write error', err)
          const errorMsg = err.message || 'Invalid payload'
          sendJson(res, err.message?.includes('too large') ? 413 : 400, { error: errorMsg })
        }
      })
      return
    }

    res.writeHead(405, { 'Content-Type': 'text/plain' })
    res.end('Method not allowed')
  } catch (err) {
    console.error('Server error', err)
    sendJson(res, 500, { error: 'Server error' })
  }
})

server.listen(PORT, HOST, () => {
  console.log(`Board server running at http://${HOST}:${PORT}`)
})

