import { useCallback, useEffect, useState } from 'react'
import type { ChatMessage } from '../api/types'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

export function ChatPanel() {
  const { repo, session } = useAuth()
  const { showToast } = useToast()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setErr(null)
    try {
      const res = await repo.getMessages()
      setMessages([...res.messages].reverse())
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [repo])

  useEffect(() => {
    void load()
  }, [load])

  const send = async () => {
    const t = text.trim()
    if (!t) return
    setSending(true)
    try {
      const msg = await repo.sendMessage(t)
      setMessages((m) => [...m, msg])
      setText('')
    } catch (e) {
      showToast(e instanceof Error ? e.message : String(e))
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="plc-chat">
      <h2 className="plc-chat-title">Global Chat</h2>
      {err ? (
        <div className="plc-empty">
          <p className="plc-error-text">{err}</p>
          <button type="button" className="plc-btn-outline" onClick={() => void load()}>
            Retry
          </button>
        </div>
      ) : (
        <div className="plc-chat-list">
          {loading ? (
            <div className="plc-empty">Loading messages…</div>
          ) : messages.length === 0 ? (
            <div className="plc-empty">No messages yet</div>
          ) : (
            messages.map((m) => {
              const mine = m.sender.id === session?.user.id
              return (
                <div
                  key={m.id}
                  className={`plc-chat-bubble ${mine ? 'is-me' : 'is-other'}`}
                >
                  <div className="plc-chat-meta">
                    {m.sender.name} · {new Date(m.createdAt).toLocaleString()}
                  </div>
                  <div>{m.messageText}</div>
                </div>
              )
            })
          )}
        </div>
      )}
      <div className="plc-chat-input-row">
        <input
          placeholder="Type a message…"
          value={text}
          disabled={sending || !!err}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              void send()
            }
          }}
        />
        <button
          type="button"
          className="plc-btn plc-btn-primary"
          style={{ width: 'auto', margin: 0 }}
          disabled={sending || !!err}
          onClick={() => void send()}
        >
          Send
        </button>
      </div>
    </div>
  )
}
