import http from 'http'
import { readFile, writeFile, stat, access } from 'fs/promises'
import { constants as fsConstants } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const PORT = process.env.PORT || 4000
const HOST = process.env.HOST || '127.0.0.1'
const boardFile = path.join(__dirname, 'board.txt')
const MAX_BODY_SIZE = 1024 * 1024 // 1MB safety guard

const ensureBoardFile = async () => {
  try {
    await access(boardFile, fsConstants.F_OK)
  } catch {
    await writeFile(boardFile, '', 'utf8')
  }
}

const readBoard = async () => {
  const content = await readFile(boardFile, 'utf8')
  const { mtimeMs } = await stat(boardFile)
  return { content, updatedAt: mtimeMs }
}

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

  if (req.url !== '/api/board') {
    res.writeHead(404, { 'Content-Type': 'text/plain' })
    return res.end('Not found')
  }

  try {
    await ensureBoardFile()

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
          await writeFile(boardFile, content, 'utf8')
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
  } catch (err) {
    console.error('Server error', err)
    sendJson(res, 500, { error: 'Server error' })
  }
})

server.listen(PORT, HOST, () => {
  console.log(`Board server running at http://${HOST}:${PORT}`)
})
