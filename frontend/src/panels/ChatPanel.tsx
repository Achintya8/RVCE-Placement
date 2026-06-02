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
  const [text, setText] = useState(() => localStorage.getItem('chat_draft_msg') ?? '')
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
      localStorage.removeItem('chat_draft_msg')
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
      <div className="min-w-0 max-w-full break-words [overflow-wrap:anywhere]">
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
            pre: ({ children }) => <pre className="max-w-full bg-black/10 dark:bg-white/10 p-2 rounded text-[0.85em] font-mono overflow-x-auto mb-2 last:mb-0">{children}</pre>,
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
        <a href={url} target="_blank" rel="noopener noreferrer" className="block mt-2 max-w-full overflow-hidden rounded-lg">
          <img src={url} alt={name} className="block h-auto max-h-[min(48vh,520px)] w-auto max-w-full rounded-lg border border-slate-200 object-contain shadow-md dark:border-white/10" />
        </a>
      )
    }
    return (
      <a href={url} download target="_blank" rel="noopener noreferrer" className="mt-2 flex max-w-full items-center gap-2 rounded-lg border border-slate-200 bg-black/10 px-3 py-2 transition-colors hover:bg-black/20 dark:border-white/5 dark:bg-white/10 dark:hover:bg-white/15">
        <File className="w-4 h-4 text-primary" />
        <span className="min-w-0 truncate text-sm">{name}</span>
      </a>
    )
  }

  return (
    <div className="h-full min-h-0 w-full">
      <Card className="flex h-full min-h-0 flex-col overflow-hidden rounded-none border-0 bg-slate-50 shadow-none backdrop-blur-xl dark:bg-[#0b1220] md:rounded-2xl md:border md:border-slate-200/70 md:bg-white/90 md:shadow-2xl md:shadow-slate-950/10 md:dark:border-white/10 md:dark:bg-[#0f172a]/95">
        <CardContent className="relative flex min-h-0 flex-1 flex-col overflow-hidden p-0">
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
              <div className="z-40 border-b border-slate-200/80 bg-white/[0.92] px-3 pb-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-[#0b1220]/[0.92] sm:px-4 md:rounded-t-2xl">
                <div className="mx-auto flex w-full max-w-5xl items-center gap-3 pl-12">
                  {searchActive ? (
                    <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 shadow-inner dark:border-white/10 dark:bg-white/5">
                      <Search className="h-4 w-4 shrink-0 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search messages..."
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value)
                          setCurrentMatchIdx(0)
                        }}
                        className="min-w-0 flex-1 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none dark:text-slate-100"
                        autoFocus
                      />
                    </div>
                  ) : (
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-950 dark:text-white sm:text-base">
                        Placement Chat
                      </p>
                      <p className="truncate text-[11px] font-medium text-slate-500 dark:text-slate-400">
                        Announcements, replies, and placement updates
                      </p>
                    </div>
                  )}

                  <div className="flex shrink-0 items-center gap-1.5">
                    {searchActive && (
                      <>
                        <span className="hidden text-xs font-medium text-slate-500 dark:text-slate-400 sm:inline">
                          {searchQuery.trim()
                            ? matches.length > 0
                              ? `${currentMatchIdx + 1} of ${matches.length}`
                              : 'No matches'
                            : 'Search'}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 rounded-xl text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10"
                          disabled={matches.length === 0}
                          onClick={() => jumpToMatch((currentMatchIdx - 1 + matches.length) % matches.length)}
                          title="Previous match"
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 rounded-xl text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10"
                          disabled={matches.length === 0}
                          onClick={() => jumpToMatch((currentMatchIdx + 1) % matches.length)}
                          title="Next match"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    <Button
                      onClick={() => {
                        if (searchActive) {
                          setSearchActive(false)
                          setSearchQuery('')
                          setCurrentMatchIdx(0)
                        } else {
                          setSearchActive(true)
                        }
                      }}
                      variant="secondary"
                      size="icon"
                      className="h-9 w-9 rounded-xl border border-slate-200 bg-slate-100 text-slate-600 shadow-none hover:bg-slate-200 dark:border-white/10 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/15"
                      title={searchActive ? 'Close search' : 'Search messages'}
                    >
                      {searchActive ? <X className="h-4 w-4" /> : <Search className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>

              {/* WhatsApp-style scroll to bottom button */}
              {showScrollBtn && (
                <button
                  onClick={scrollToBottom}
                  className="absolute bottom-[calc(5.75rem+env(safe-area-inset-bottom))] right-4 z-50 flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-lg transition-all duration-200 animate-in fade-in zoom-in-95 hover:scale-105 hover:shadow-xl active:scale-95 dark:border-white/10 dark:bg-slate-800 md:right-6"
                  title="Scroll to latest messages"
                >
                  <ChevronDown className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                </button>
              )}

              <ScrollArea className="min-h-0 flex-1 bg-slate-100/70 px-3 py-4 dark:bg-[#111827] sm:px-4" ref={scrollRef}>
                <div className="mx-auto w-full max-w-5xl space-y-4">
                  {loading ? (
                    <div className="flex flex-col gap-4">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className={cn("w-full max-w-[17rem] space-y-1", i % 2 === 0 ? "ml-auto" : "")}>
                          <div className="h-10 w-full rounded-2xl bg-white shadow-sm animate-pulse dark:bg-white/5" />
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
                              "mb-2 flex min-w-0 max-w-[86%] flex-col space-y-1 sm:max-w-[76%] lg:max-w-[38rem]",
                              isMe ? "ml-auto items-end" : "items-start"
                            )}
                          >
                            <div className="group/msg relative flex max-w-full items-center gap-1.5 px-1 sm:gap-2">
                              <span className="min-w-0 truncate text-[11px] font-bold uppercase tracking-normal text-muted-foreground">
                                {isMe ? 'You' : m.sender.name}
                              </span>
                              <span className="shrink-0 text-[11px] text-slate-400 dark:text-white/30">
                                {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              <button
                                onClick={() => setReplyingTo(m)}
                                className="rounded-md p-1.5 text-slate-400 opacity-75 transition-opacity hover:bg-slate-200 hover:text-primary group-hover/msg:opacity-100 dark:hover:bg-white/10 md:opacity-0"
                                title="Reply to message"
                              >
                                <CornerUpLeft className="w-4 h-4" />
                              </button>
                              {canDelete && (
                                <button
                                  onClick={() => void deleteMessage(m.id)}
                                  className="rounded-md p-1.5 text-red-400 opacity-75 transition-opacity hover:bg-red-400/20 group-hover/msg:opacity-100 md:opacity-0"
                                  title="Delete message"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                            <div
                              id={`msg-${m.id}`}
                              className={cn(
                                "min-w-0 max-w-full overflow-hidden rounded-[16px] border px-3.5 py-2.5 text-[0.95rem] shadow-sm transition-all duration-300 sm:px-4 sm:text-base",
                                isMe
                                  ? "rounded-tr-none border-sky-200 bg-sky-50 text-sky-950 shadow-sky-100/30 dark:border-sky-400/20 dark:bg-sky-500/[0.12] dark:text-sky-100"
                                  : "rounded-tl-none border-slate-200/80 bg-white text-slate-900 dark:border-white/10 dark:bg-slate-800/80 dark:text-slate-100",
                                isCurrentMatch && "ring-2 ring-yellow-400 dark:ring-yellow-500 scale-[1.01] shadow-[0_0_15px_rgba(234,179,8,0.4)]"
                              )}
                            >
                              {m.parentMessage && (
                                <div
                                  onClick={() => scrollToMessage(m.parentMessage!.id)}
                                  className={cn(
                                    "mb-2 min-w-0 cursor-pointer rounded-r-lg border-l-4 p-2 text-left text-sm transition-all",
                                    isMe
                                      ? "border-sky-400 bg-sky-100/70 hover:bg-sky-200/60 dark:bg-sky-500/10 dark:hover:bg-sky-500/15"
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

              <div className="relative flex flex-col gap-2 border-t border-slate-200 bg-white/95 px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 backdrop-blur-xl dark:border-white/10 dark:bg-[#0b1220]/95 sm:px-4">
                {mentionSearch !== null && filteredUsers.length > 0 && (
                  <div className="absolute bottom-full left-3 z-50 mb-2 w-[min(20rem,calc(100vw-1.5rem))] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900 sm:left-4">
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
                  <div className="mx-auto flex w-full max-w-5xl items-center justify-between rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 dark:border-white/5 dark:bg-white/10">
                    <div className="flex min-w-0 items-center gap-2 overflow-hidden">
                      {attachment.type.startsWith('image/') ? <ImageIcon className="w-4 h-4 text-primary shrink-0" /> : <File className="w-4 h-4 text-primary shrink-0" />}
                      <span className="text-sm text-slate-900 dark:text-white truncate">{attachment.name}</span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full hover:bg-white/20" onClick={() => setAttachment(null)}>
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                )}

                {replyingTo && (
                  <div className="mx-auto flex w-full max-w-5xl items-center justify-between rounded-lg border border-l-4 border-slate-200 border-l-primary bg-white px-3 py-2 shadow-sm animate-in slide-in-from-bottom-2 duration-200 dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex min-w-0 flex-col overflow-hidden text-left">
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
                  className="mx-auto flex w-full max-w-5xl items-end gap-2"
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
                    className="h-10 w-10 shrink-0 rounded-xl border-slate-200 bg-slate-100 hover:bg-slate-200 dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/15"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={sending || !!err}
                  >
                    <Paperclip className="w-4 h-4" />
                  </Button>
                  <Textarea
                    placeholder="Type a message"
                    value={text}
                    disabled={sending || !!err}
                    onChange={(e) => {
                      const val = e.target.value
                      setText(val)
                      localStorage.setItem('chat_draft_msg', val)
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
                    className="min-h-[40px] min-w-0 max-h-[150px] flex-1 resize-none rounded-xl border-slate-200 bg-slate-100 py-2 text-slate-900 focus:ring-primary/50 dark:border-white/10 dark:bg-white/10 dark:text-white"
                  />
                  <Button
                    type="submit"
                    size="icon"
                    disabled={sending || !!err || (!text.trim() && !attachment)}
                    className="h-10 w-10 shrink-0 rounded-xl shadow-lg shadow-primary/20"
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
