import { useCallback, useEffect, useRef, useState } from 'react'
import type { ChatMessage, ChatUser } from '../api/types'
import { useAuth } from '../context/AuthContext'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Send, MessageSquare, Clock, AlertCircle, Paperclip, X, File, Image as ImageIcon, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export function ChatPanel() {
  const { repo, session } = useAuth()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [attachment, setAttachment] = useState<File | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [users, setUsers] = useState<ChatUser[]>([])
  const [mentionSearch, setMentionSearch] = useState<string | null>(null)

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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load()
  }, [load])

  useEffect(() => {
    void repo.getAllUsersForMention().then(setUsers).catch(console.error)
  }, [repo])

  useEffect(() => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]')
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight
      }
    }
  }, [messages])

  const send = async () => {
    const t = text.trim()
    if (!t && !attachment) return
    setSending(true)
    try {
      const msg = await repo.sendMessage(t, attachment || undefined)
      setMessages((m) => [...m, msg])
      setText('')
      setAttachment(null)
      setMentionSearch(null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e))
    } finally {
      setSending(false)
    }
  }

  const deleteMessage = async (id: number) => {
    try {
      await repo.deleteMessage(id)
      setMessages((prev) => prev.filter((m) => m.id !== id))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e))
    }
  }

  const filteredUsers = mentionSearch !== null
    ? users.filter(u =>
      u.name.toLowerCase().includes(mentionSearch) ||
      u.email?.toLowerCase().includes(mentionSearch)
    ).slice(0, 5)
    : []

  const selectMention = (user: ChatUser) => {
    const lastAt = text.lastIndexOf('@')
    if (lastAt !== -1) {
      const newText = text.slice(0, lastAt) + `@${user.name.replace(/\s+/g, '')} `
      setText(newText)
      setMentionSearch(null)
    }
  }

  const renderMessageText = (msg: ChatMessage, isMe: boolean) => {
    if (!msg.mentionedUsers?.length) return <span>{msg.messageText}</span>

    const parts = msg.messageText.split(/(@\w+)/g)
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        const username = part.slice(1).toLowerCase()
        const isMentioned = msg.mentionedUsers.some(u =>
          u.name.replace(/\s+/g, '').toLowerCase() === username
        )
        if (isMentioned) {
          return (
            <span
              key={i}
              className={cn(
                "font-bold",
                isMe ? "text-black" : "text-primary drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]"
              )}
            >
              {part}
            </span>
          )
        }
      }
      return <span key={i}>{part}</span>
    })
  }

  const renderAttachment = (url: string, name: string) => {
    const isImage = url.match(/\.(jpeg|jpg|gif|png|webp)(\?.*)?$/i)
    if (isImage) {
      return (
        <a href={url} target="_blank" rel="noopener noreferrer" className="block mt-2">
          <img src={url} alt={name} className="max-w-[200px] sm:max-w-xs rounded-lg shadow-md border border-slate-200 dark:border-white/10" />
        </a>
      )
    }
    return (
      <a href={url} download target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 mt-2 px-3 py-2 bg-black/20 hover:bg-black/40 rounded-lg transition-colors border border-slate-200 dark:border-white/5 w-fit">
        <File className="w-4 h-4 text-primary" />
        <span className="text-sm truncate max-w-[200px]">{name}</span>
      </a>
    )
  }

  return (
    <div className="h-[calc(100vh-8rem)] lg:h-[calc(100vh-12rem)] pb-20 lg:pb-8">
      <Card className="h-full border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 backdrop-blur-xl flex flex-col overflow-hidden">
        <CardHeader className="pb-4 border-b border-slate-200 dark:border-white/10">
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            Global Discussion
          </CardTitle>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col p-0 overflow-hidden relative">
          {err ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center space-y-4">
              <AlertCircle className="w-12 h-12 text-destructive opacity-50" />
              <div className="space-y-1">
                <p className="font-semibold text-slate-900 dark:text-white">Connection Error</p>
                <p className="text-sm text-muted-foreground">{err}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => void load()}>
                Try Again
              </Button>
            </div>
          ) : (
            <>
              <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                <div className="space-y-4">
                  {loading ? (
                    <div className="flex flex-col gap-4">
                      {[1, 2, 3, 4].map(i => (
                        <div key={i} className={cn("max-w-[80%] space-y-1", i % 2 === 0 ? "ml-auto" : "")}>
                          <div className="h-10 w-48 bg-slate-100 dark:bg-white/5 rounded-2xl animate-pulse" />
                        </div>
                      ))}
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full py-20 text-muted-foreground">
                      <Clock className="w-10 h-10 mb-2 opacity-20" />
                      <p>No messages in the thread yet.</p>
                    </div>
                  ) : (
                    messages.map((m) => {
                      const isMe = m.sender.id === session?.user.id
                      const isAdmin = session?.isSpc
                      const canDelete = isMe || isAdmin
                      return (
                        <div
                          key={m.id}
                          className={cn(
                            "flex flex-col max-w-[85%] space-y-1",
                            isMe ? "ml-auto items-end" : "items-start"
                          )}
                        >
                          <div className="flex items-center gap-2 px-1 relative group/msg">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">
                              {isMe ? 'You' : m.sender.name}
                            </span>
                            <span className="text-[10px] text-slate-400 dark:text-white/30">
                              {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {canDelete && (
                              <button
                                onClick={() => void deleteMessage(m.id)}
                                className="opacity-0 group-hover/msg:opacity-100 transition-opacity p-1 text-red-400 hover:bg-red-400/20 rounded-md"
                                title="Delete message"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                          <div
                            className={cn(
                              "px-4 py-2.5 rounded-2xl text-sm shadow-lg",
                              isMe
                                ? "bg-primary text-white rounded-tr-none shadow-primary/20"
                                : "bg-slate-200 dark:bg-white/10 text-slate-900 dark:text-white rounded-tl-none shadow-black/20"
                            )}
                          >
                            {m.messageText && renderMessageText(m, isMe)}
                            {m.attachmentUrl && m.attachmentName && renderAttachment(m.attachmentUrl, m.attachmentName)}
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </ScrollArea>

              <div className="relative p-4 border-t border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 flex flex-col gap-2">
                {mentionSearch !== null && filteredUsers.length > 0 && (
                  <div className="absolute bottom-full left-4 mb-2 w-64 bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl shadow-xl overflow-hidden z-50">
                    {filteredUsers.map(u => (
                      <button
                        key={u.id}
                        type="button"
                        className="w-full text-left px-4 py-2 text-sm text-slate-900 dark:text-white hover:bg-slate-200 dark:bg-white/10 transition-colors flex flex-col"
                        onClick={() => selectMention(u)}
                      >
                        <span className="font-medium">{u.name}</span>
                        {u.email && <span className="text-xs text-slate-500 dark:text-white/50 truncate w-full">{u.email}</span>}
                      </button>
                    ))}
                  </div>
                )}

                {attachment && (
                  <div className="flex items-center justify-between bg-slate-200 dark:bg-white/10 px-3 py-2 rounded-lg border border-slate-200 dark:border-white/5">
                    <div className="flex items-center gap-2 overflow-hidden">
                      {attachment.type.startsWith('image/') ? <ImageIcon className="w-4 h-4 text-primary shrink-0" /> : <File className="w-4 h-4 text-primary shrink-0" />}
                      <span className="text-sm text-slate-900 dark:text-white truncate">{attachment.name}</span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full hover:bg-white/20" onClick={() => setAttachment(null)}>
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                )}

                <form
                  className="flex w-full gap-2 items-end"
                  onSubmit={(e) => {
                    e.preventDefault()
                    void send()
                  }}
                >
                  <input
                    type="file"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setAttachment(e.target.files[0])
                      }
                      e.target.value = ''
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="shrink-0 bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:bg-white/10 h-10 w-10"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={sending || !!err}
                  >
                    <Paperclip className="w-4 h-4" />
                  </Button>
                  <Input
                    placeholder="Write a message..."
                    value={text}
                    disabled={sending || !!err}
                    onChange={(e) => {
                      const val = e.target.value
                      setText(val)
                      const lastAt = val.lastIndexOf('@')
                      if (lastAt !== -1 && !val.includes(' ', lastAt)) {
                        setMentionSearch(val.slice(lastAt + 1).toLowerCase())
                      } else {
                        setMentionSearch(null)
                      }
                    }}
                    className="bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:ring-primary/50"
                  />
                  <Button
                    type="submit"
                    size="icon"
                    disabled={sending || !!err || (!text.trim() && !attachment)}
                    className="shrink-0 shadow-lg shadow-primary/20 h-10 w-10"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </form>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
