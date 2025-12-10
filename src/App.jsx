import { useEffect, useRef, useState } from 'react'
import './App.css'

const POLL_INTERVAL = 1500
const SAVE_DEBOUNCE = 300

function App() {
  const [content, setContent] = useState('')
  const saveTimer = useRef(null)
  const lastServerVersion = useRef(0)

  const fetchBoard = async () => {
    try {
      const res = await fetch('/api/board')
      if (!res.ok) throw new Error('Failed to load board')
      const data = await res.json()
      setContent(data.content || '')
      lastServerVersion.current = data.updatedAt ?? Date.now()
    } catch (err) {
      console.error(err)
    }
  }

  const saveBoard = async (nextContent) => {
    try {
      const res = await fetch('/api/board', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: nextContent }),
      })
      if (!res.ok) throw new Error('Failed to save')
      const data = await res.json()
      lastServerVersion.current = data.updatedAt ?? Date.now()
    } catch (err) {
      console.error(err)
    }
  }

  const handleChange = (e) => {
    const nextValue = e.target.value
    setContent(nextValue)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      saveBoard(nextValue)
    }, SAVE_DEBOUNCE)
  }

  useEffect(() => {
    let pollId
    const start = async () => {
      await fetchBoard()
      pollId = setInterval(async () => {
        try {
          const res = await fetch('/api/board')
          if (!res.ok) throw new Error('poll failed')
          const data = await res.json()
          if ((data.updatedAt ?? 0) !== lastServerVersion.current) {
            lastServerVersion.current = data.updatedAt ?? Date.now()
            setContent(data.content || '')
          }
        } catch (err) {
          console.error(err)
        }
      }, POLL_INTERVAL)
    }
    start()
    return () => {
      if (pollId) clearInterval(pollId)
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [])

  return (
    <div className="fullscreen">
      <textarea
        className="board-input"
        value={content}
        onChange={handleChange}
        placeholder="Start writing. Everyone sees the same board."
        spellCheck="false"
      />
    </div>
  )
}

export default App
