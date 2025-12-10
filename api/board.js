import { readBoard, writeBoard } from '../storage.js'

const MAX_BODY_SIZE = 5 * 1024 * 1024 // 5MB

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(204).end()
  }

  try {
    if (req.method === 'GET') {
      const data = await readBoard()
      return res.status(200).json(data)
    }

    if (req.method === 'POST') {
      const contentLength = parseInt(req.headers['content-length'] || '0', 10)
      if (contentLength > MAX_BODY_SIZE) {
        return res.status(413).json({ error: 'Payload too large' })
      }

      // Handle body parsing for Vercel
      let body = req.body
      if (typeof body === 'string') {
        try {
          body = JSON.parse(body)
        } catch {
          body = {}
        }
      } else if (Buffer.isBuffer(body)) {
        try {
          body = JSON.parse(body.toString('utf8'))
        } catch {
          body = {}
        }
      } else if (!body || typeof body !== 'object') {
        body = {}
      }

      const content = typeof body?.content === 'string' ? body.content : ''
      const data = await writeBoard(content)
      return res.status(200).json(data)
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    console.error('API error', err)
    const statusCode = err.message?.includes('too large') ? 413 : 500
    return res.status(statusCode).json({ error: err.message || 'Server error' })
  }
}
