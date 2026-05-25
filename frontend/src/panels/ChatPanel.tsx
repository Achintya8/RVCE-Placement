import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ChatMessage, ChatUser } from '@/types'
import { useAuthStore, repo } from '../store/useAuthStore'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Send, Clock, AlertCircle, Paperclip, X, File, Image as ImageIcon, Trash2, CornerUpLeft, Search, ChevronUp, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export function ChatPanel() {
  const session = useAuthStore((state) => state.session)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [attachment, setAttachment] = useState<File | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const isLoadingRef = useRef(false)
  const [showScrollBtn, setShowScrollBtn] = useState(false)
  const isAtBottomRef = useRef(true)

  const [users, setUsers] = useState<ChatUser[]>([])
  const [mentionSearch, setMentionSearch] = useState<string | null>(null)
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null)

  // Search states
  const [searchActive, setSearchActive] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentMatchIdx, setCurrentMatchIdx] = useState(0)

  const load = useCallback(async (background = false) => {
    if (isLoadingRef.current) return
    isLoadingRef.current = true
    if (!background) {
      setLoading(true)
      setErr(null)
    }
    try {
      const res = await repo.getMessages()
      setMessages([...res.messages].reverse())
    } catch (e) {
      if (!background) {
        setErr(e instanceof Error ? e.message : String(e))
      }
    } finally {
      isLoadingRef.current = false
      if (!background) {
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load()
  }, [load])

  // Real-time Service Worker Push Notification message listener
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    const handleSWMessage = (event: MessageEvent) => {
      const payload = event.data as {
        type?: string
        notification?: {
          title?: string
          body?: string
          data?: {
            type?: string
            messageId?: string
            senderId?: string
          }
        }
      } | undefined

      if (payload?.type !== 'PUSH_NOTIFICATION') return

      const pushType = payload.notification?.data?.type
      if (pushType === 'chat_message' || pushType === 'message_mention' || pushType === 'announcement') {
        void load(true) // Background refresh (no loader skeletons!)
      }
    }

    navigator.serviceWorker.addEventListener('message', handleSWMessage)
    return () => {
      navigator.serviceWorker.removeEventListener('message', handleSWMessage)
    }
  }, [load])

  // Listen for background sync completion to refresh chat messages
  useEffect(() => {
    const handleSyncComplete = (event: Event) => {
      const customEvent = event as CustomEvent<{ url?: string }>
      if (customEvent.detail?.url?.startsWith('/messages')) {
        void load(true) // Refresh chat message list silently
      }
    }
    window.addEventListener('offline-sync-complete', handleSyncComplete)
    return () => {
      window.removeEventListener('offline-sync-complete', handleSyncComplete)
    }
  }, [load])

  // Periodic fallback background polling to sync messages when active
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') {
        void load(true) // Background refresh (no loader skeletons!)
      }
    }, 500)

    return () => clearInterval(timer)
  }, [load])

  useEffect(() => {
    void repo.getAllUsersForMention().then(setUsers).catch(console.error)
  }, [])

  // Track scroll position to know if user is near the bottom
  useEffect(() => {
    const scrollContainer = scrollRef.current?.querySelector('[data-radix-scroll-area-viewport]')
    if (!scrollContainer) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainer
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight
      const atBottom = distanceFromBottom < 80
      isAtBottomRef.current = atBottom
      setShowScrollBtn(!atBottom)
    }

    scrollContainer.addEventListener('scroll', handleScroll, { passive: true })
    return () => scrollContainer.removeEventListener('scroll', handleScroll)
  }, [loading])

  // Only auto-scroll when user is already near the bottom
  useEffect(() => {
    if (!isAtBottomRef.current) return
    const scrollContainer = scrollRef.current?.querySelector('[data-radix-scroll-area-viewport]')
    if (scrollContainer) {
      scrollContainer.scrollTop = scrollContainer.scrollHeight
    }
  }, [messages])

  const scrollToBottom = () => {
    const scrollContainer = scrollRef.current?.querySelector('[data-radix-scroll-area-viewport]')
    if (scrollContainer) {
      scrollContainer.scrollTo({ top: scrollContainer.scrollHeight, behavior: 'smooth' })
    }
  }

  const send = async () => {
    const t = text.trim()
    if (!t && !attachment) return
    setSending(true)
    try {
      const msg = await repo.sendMessage(t, attachment || undefined, replyingTo?.id || undefined)
      setMessages((m) => [...m, msg])
      setText('')
      setAttachment(null)
      setMentionSearch(null)
      setReplyingTo(null)
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

  const scrollToMessage = (id: number) => {
    const el = document.getElementById(`msg-${id}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.classList.add('bg-primary/20', 'dark:bg-white/20', 'ring-2', 'ring-primary', 'scale-[1.02]')
      setTimeout(() => {
        el.classList.remove('bg-primary/20', 'dark:bg-white/20', 'ring-2', 'ring-primary', 'scale-[1.02]')
      }, 1500)
    }
  }

  const formatDividerDate = (dateStr: string | Date) => {
    const date = new Date(dateStr)
    const today = new Date()
    const yesterday = new Date()
    yesterday.setDate(today.getDate() - 1)

    const isSameDay = (d1: Date, d2: Date) =>
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()

    if (isSameDay(date, today)) {
      return 'Today'
    } else if (isSameDay(date, yesterday)) {
      return 'Yesterday'
    } else {
      return date.toLocaleDateString([], { day: 'numeric', month: 'long', year: 'numeric' })
    }
  }

  // Memoized search matches
  const matches = useMemo(() => {
    if (!searchQuery.trim()) return []
    return messages.filter(m =>
      m.messageText?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [messages, searchQuery])

  const jumpToMatch = (idx: number) => {
    if (matches.length === 0) return
    setCurrentMatchIdx(idx)
    scrollToMessage(matches[idx].id)
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

  const prepareMarkdown = (msg: ChatMessage) => {
    let md = msg.messageText || ''
    if (msg.mentionedUsers?.length) {
      msg.mentionedUsers.forEach(u => {
        const usernameWithoutSpaces = u.name.replace(/\s+/g, '')
        const escaped = usernameWithoutSpaces.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const regex = new RegExp(`@${escaped}\\b`, 'gi')
        md = md.replace(regex, `[@${usernameWithoutSpaces}](mention:${usernameWithoutSpaces})`)
      })
    }
    return md
  }

  const renderMessageText = (msg: ChatMessage, isMe: boolean) => {
    const md = prepareMarkdown(msg)
    return (
      <div className="break-words">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            a: ({ href, children, ...props }) => {
              if (href?.startsWith('mention:')) {
                return (
                  <span className={cn("font-bold", isMe ? "text-indigo-600 dark:text-indigo-300 font-extrabold" : "text-primary font-bold")}>
                    {children}
                  </span>
                )
              }
              return <a href={href} target="_blank" rel="noopener noreferrer" className="underline hover:opacity-80" {...props}>{children}</a>
            },
            p: ({ children }) => <p className="mb-2 last:mb-0 whitespace-pre-wrap leading-relaxed">{children}</p>,
            ul: ({ children }) => <ul className="list-disc pl-5 mb-2 last:mb-0 space-y-1">{children}</ul>,
            ol: ({ children }) => <ol className="list-decimal pl-5 mb-2 last:mb-0 space-y-1">{children}</ol>,
            li: ({ children }) => <li>{children}</li>,
            strong: ({ children }) => <strong className="font-bold">{children}</strong>,
            em: ({ children }) => <em className="italic">{children}</em>,
            code: ({ children }) => <code className="bg-black/10 dark:bg-white/10 px-1 py-0.5 rounded text-[0.85em] font-mono">{children}</code>,
            pre: ({ children }) => <pre className="bg-black/10 dark:bg-white/10 p-2 rounded text-[0.85em] font-mono overflow-x-auto mb-2 last:mb-0">{children}</pre>,
          }}
        >
          {md}
        </ReactMarkdown>
      </div>
    )
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
    <div className="h-[calc(100vh-9rem)] w-full">
      <Card className="h-full border-0 rounded-none bg-slate-100 dark:bg-white/5 backdrop-blur-xl flex flex-col overflow-hidden">
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
              {/* Animated Search Bar */}
              {searchActive && (
                <div className="flex items-center justify-between bg-white dark:bg-slate-900 px-4 py-2.5 border-b border-slate-200 dark:border-white/10 shadow-sm animate-in slide-in-from-top duration-200 z-50">
                  <div className="flex items-center gap-2 flex-1 max-w-md">
                    <Search className="w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search messages..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value)
                        setCurrentMatchIdx(0)
                      }}
                      className="bg-transparent text-sm border-0 focus:ring-0 focus:outline-none w-full text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
                      autoFocus
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    {matches.length > 0 && (
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                        {currentMatchIdx + 1} of {matches.length} matches
                      </span>
                    )}
                    {searchQuery.trim() && matches.length === 0 && (
                      <span className="text-xs text-red-500 font-mono">No matches</span>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-8 h-8 rounded-full"
                      disabled={matches.length === 0}
                      onClick={() => jumpToMatch((currentMatchIdx - 1 + matches.length) % matches.length)}
                    >
                      <ChevronUp className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-8 h-8 rounded-full"
                      disabled={matches.length === 0}
                      onClick={() => jumpToMatch((currentMatchIdx + 1) % matches.length)}
                    >
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-8 h-8 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      onClick={() => {
                        setSearchActive(false)
                        setSearchQuery('')
                        setCurrentMatchIdx(0)
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Floating Search Toggle Button */}
              {!searchActive && (
                <Button
                  onClick={() => setSearchActive(true)}
                  variant="secondary"
                  size="icon"
                  className="absolute top-4 right-4 z-40 rounded-full w-10 h-10 shadow-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-300 backdrop-blur-md opacity-90 hover:opacity-100 scale-100 active:scale-95"
                  title="Search messages"
                >
                  <Search className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                </Button>
              )}

              {/* WhatsApp-style scroll to bottom button */}
              {showScrollBtn && (
                <button
                  onClick={scrollToBottom}
                  className="absolute bottom-[90px] right-5 z-50 flex items-center justify-center w-10 h-10 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-200 animate-in fade-in zoom-in-95"
                  title="Scroll to latest messages"
                >
                  <ChevronDown className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                </button>
              )}

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
                    messages.map((m, idx) => {
                      const isMe = m.sender.id === session?.user.id
                      const isAdmin = session?.isSpc
                      const canDelete = isMe || isAdmin

                      const prevMsg = idx > 0 ? messages[idx - 1] : null
                      const isNewDay = !prevMsg || 
                        new Date(m.createdAt).toDateString() !== new Date(prevMsg.createdAt).toDateString()

                      const isCurrentMatch = matches.length > 0 && matches[currentMatchIdx]?.id === m.id

                      let startX = 0
                      let startY = 0

                      return (
                        <div
                          key={m.id}
                          className="w-full flex flex-col"
                          onTouchStart={(e) => {
                            startX = e.touches[0].clientX
                            startY = e.touches[0].clientY
                          }}
                          onTouchEnd={(e) => {
                            const diffX = e.changedTouches[0].clientX - startX
                            const diffY = e.changedTouches[0].clientY - startY
                            if (diffX > 60 && Math.abs(diffY) < 30) {
                              setReplyingTo(m)
                              if ('vibrate' in navigator) {
                                navigator.vibrate(20)
                              }
                            }
                          }}
                        >
                          {isNewDay && (
                            <div className="flex justify-center my-6">
                              <span className="bg-slate-200/80 dark:bg-white/10 text-slate-600 dark:text-slate-300 text-xs font-semibold px-3.5 py-1.5 rounded-full shadow-sm">
                                {formatDividerDate(m.createdAt)}
                              </span>
                            </div>
                          )}
                          <div
                            className={cn(
                              "flex flex-col max-w-[75%] space-y-1 mb-2",
                              isMe ? "ml-auto items-end" : "items-start"
                            )}
                          >
                            <div className="flex items-center gap-2 px-1 relative group/msg">
                              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-tight">
                                {isMe ? 'You' : m.sender.name}
                              </span>
                              <span className="text-[11px] text-slate-400 dark:text-white/30">
                                {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              <button
                                onClick={() => setReplyingTo(m)}
                                className="opacity-0 max-md:opacity-75 group-hover/msg:opacity-100 transition-opacity p-1.5 text-slate-400 hover:text-primary hover:bg-slate-200 dark:hover:bg-white/10 rounded-md"
                                title="Reply to message"
                              >
                                <CornerUpLeft className="w-4 h-4" />
                              </button>
                              {canDelete && (
                                <button
                                  onClick={() => void deleteMessage(m.id)}
                                  className="opacity-0 max-md:opacity-75 group-hover/msg:opacity-100 transition-opacity p-1.5 text-red-400 hover:bg-red-400/20 rounded-md"
                                  title="Delete message"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                            <div
                              id={`msg-${m.id}`}
                              className={cn(
                                "px-4 py-2 rounded-[16px] text-base transition-all duration-300 border shadow-sm",
                                isMe
                                  ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-200 border-indigo-100 dark:border-indigo-900/50 rounded-tr-none shadow-indigo-100/30"
                                  : "bg-slate-100 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 border-slate-200/50 dark:border-slate-800/50 rounded-tl-none",
                                isCurrentMatch && "ring-2 ring-yellow-400 dark:ring-yellow-500 scale-[1.01] shadow-[0_0_15px_rgba(234,179,8,0.4)]"
                              )}
                            >
                              {m.parentMessage && (
                                <div
                                  onClick={() => scrollToMessage(m.parentMessage!.id)}
                                  className={cn(
                                    "mb-2 p-2 border-l-4 rounded-r-lg text-sm cursor-pointer transition-all text-left",
                                    isMe
                                      ? "bg-indigo-100/70 dark:bg-indigo-900/40 border-indigo-400 hover:bg-indigo-200/60 dark:hover:bg-indigo-900/60"
                                      : "bg-black/5 dark:bg-white/5 border-primary hover:bg-black/10 dark:hover:bg-white/10"
                                  )}
                                >
                                  <div
                                    className={cn(
                                      "font-bold truncate mb-0.5",
                                      isMe ? "text-indigo-700 dark:text-indigo-300" : "text-primary"
                                    )}
                                  >
                                    {m.parentMessage.senderName === session?.user.name ? 'You' : m.parentMessage.senderName}
                                  </div>
                                  <div
                                    className={cn(
                                      "truncate",
                                      isMe 
                                        ? "text-indigo-900/80 dark:text-indigo-300/80" 
                                        : "text-slate-700 dark:text-slate-300"
                                    )}
                                  >
                                    {m.parentMessage.messageText || 'Sent an attachment'}
                                  </div>
                                </div>
                              )}
                              {m.messageText && renderMessageText(m, isMe)}
                              {m.attachmentUrl && m.attachmentName && renderAttachment(m.attachmentUrl, m.attachmentName)}
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </ScrollArea>

              <div className="relative p-4 border-t border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 flex flex-col gap-2">
                {mentionSearch !== null && filteredUsers.length > 0 && (
                  <div className="absolute bottom-full left-4 mb-2 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden z-50">
                    {filteredUsers.map(u => (
                      <button
                        key={u.id}
                        type="button"
                        className="w-full text-left px-4 py-2 text-sm text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors flex flex-col"
                        onClick={() => selectMention(u)}
                      >
                        <span className="font-medium">{u.name}</span>
                        {u.email && <span className="text-xs text-slate-500 dark:text-slate-400 truncate w-full">{u.email}</span>}
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

                {replyingTo && (
                  <div className="flex items-center justify-between bg-white dark:bg-slate-900 px-3 py-2 rounded-lg border-l-4 border-primary border border-slate-200 dark:border-slate-800 shadow-sm animate-in slide-in-from-bottom-2 duration-200">
                    <div className="flex flex-col text-left overflow-hidden">
                      <span className="text-[10px] font-bold text-primary uppercase tracking-wider">
                        Replying to {replyingTo.sender.id === session?.user.id ? 'You' : replyingTo.sender.name}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[80vw]">
                        {replyingTo.messageText || 'Sent an attachment'}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 shrink-0"
                      onClick={() => setReplyingTo(null)}
                    >
                      <X className="w-3 h-3 text-slate-500" />
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
                  <Textarea
                    placeholder="Write a message... (Markdown supported, Shift+Enter for new line)"
                    value={text}
                    disabled={sending || !!err}
                    onChange={(e) => {
                      const val = e.target.value
                      setText(val)
                      const lastAt = val.lastIndexOf('@')
                      if (lastAt !== -1 && !val.includes(' ', lastAt) && !val.includes('\n', lastAt)) {
                        setMentionSearch(val.slice(lastAt + 1).toLowerCase())
                      } else {
                        setMentionSearch(null)
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
                        e.preventDefault()
                        if (text.trim() || attachment) void send()
                        return
                      }

                      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey || e.shiftKey)) {
                        e.preventDefault()
                        const textarea = e.currentTarget
                        const start = textarea.selectionStart
                        const end = textarea.selectionEnd
                        
                        const lineStart = text.lastIndexOf('\n', start - 1) + 1
                        const currentLine = text.slice(lineStart, start)
                        const match = currentLine.match(/^(\d+)\.\s/)
                        
                        let insertStr = '\n'
                        if (match) {
                          if (currentLine === match[0]) {
                             const newText = text.slice(0, lineStart) + text.slice(start)
                             setText(newText)
                             setTimeout(() => {
                               textarea.focus()
                               textarea.setSelectionRange(lineStart, lineStart)
                             }, 0)
                             return
                          } else {
                             const nextNum = parseInt(match[1], 10) + 1
                             insertStr = `\n${nextNum}. `
                          }
                        } else if (currentLine.match(/^-\s/)) {
                          if (currentLine === '- ') {
                             const newText = text.slice(0, lineStart) + text.slice(start)
                             setText(newText)
                             setTimeout(() => {
                               textarea.focus()
                               textarea.setSelectionRange(lineStart, lineStart)
                             }, 0)
                             return
                          } else {
                             insertStr = '\n- '
                          }
                        }
                        
                        const newText = text.slice(0, start) + insertStr + text.slice(end)
                        setText(newText)
                        setTimeout(() => {
                          textarea.focus()
                          textarea.setSelectionRange(start + insertStr.length, start + insertStr.length)
                        }, 0)
                        return
                      }

                      if (e.ctrlKey || e.metaKey) {
                        const key = e.key.toLowerCase()
                        if (['b', 'i', 'u', 'm'].includes(key)) {
                          e.preventDefault()
                          const textarea = e.currentTarget
                          const start = textarea.selectionStart
                          const end = textarea.selectionEnd
                          const selected = text.slice(start, end)
                          let newText = text
                          let newCursorPos = start

                          if (key === 'b') {
                            newText = text.slice(0, start) + `**${selected}**` + text.slice(end)
                            newCursorPos = selected ? end + 4 : start + 2
                          } else if (key === 'i') {
                            newText = text.slice(0, start) + `*${selected}*` + text.slice(end)
                            newCursorPos = selected ? end + 2 : start + 1
                          } else if (key === 'u') {
                            if (selected) {
                              const lines = selected.split('\n')
                              const bulleted = lines.map(l => `- ${l}`).join('\n')
                              newText = text.slice(0, start) + bulleted + text.slice(end)
                              newCursorPos = start + bulleted.length
                            } else {
                              const lineStart = text.lastIndexOf('\n', start - 1) + 1
                              newText = text.slice(0, lineStart) + '- ' + text.slice(lineStart)
                              newCursorPos = start + 2
                            }
                          } else if (key === 'm') {
                            if (selected) {
                              const lines = selected.split('\n')
                              const numberedLines = lines.map((line, i) => `${i + 1}. ${line}`).join('\n')
                              newText = text.slice(0, start) + numberedLines + text.slice(end)
                              newCursorPos = start + numberedLines.length
                            } else {
                              const lineStart = text.lastIndexOf('\n', start - 1) + 1
                              newText = text.slice(0, lineStart) + '1. ' + text.slice(lineStart)
                              newCursorPos = start + 3
                            }
                          }

                          setText(newText)
                          setTimeout(() => {
                            textarea.focus()
                            textarea.setSelectionRange(newCursorPos, newCursorPos)
                          }, 0)
                        }
                      }
                    }}
                    className="min-h-[40px] max-h-[150px] bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:ring-primary/50 resize-none py-2"
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
