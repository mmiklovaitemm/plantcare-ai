import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Loader2, Bot, Sparkles, ImagePlus, X, Download, Copy, Check } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { sendChatMessageStream, type ChatMessage, type ImageData } from '../lib/gemini'
import { usePlants } from '../hooks/usePlants'

const SUGGESTIONS = {
  en: [
    "Why are my plant leaves turning yellow?",
    "How do I know if I'm overwatering?",
    "Which plants are best for low light?",
    "How often should I fertilize my plants?",
    "How do I fix root rot?",
  ],
  lt: [
    "Kodėl mano augalo lapai gelsta?",
    "Kaip žinoti, ar per daug laistau?",
    "Kokie augalai tinka mažai šviesai?",
    "Kaip dažnai tręšti augalus?",
    "Kaip išgydyti šaknų puvimą?",
  ],
}

const STORAGE_KEY = 'plantcare-ai-chat-messages'
const PREFILL_KEY = 'plantcare-ai-prefill'

function buildSystemPrompt(
  plants: { nickname: string; health_status: string; room: string | null }[],
  language: string,
): string {
  const lang = language.startsWith('lt') ? 'Lithuanian' : 'English'
  const plantList = plants.length
    ? plants.map(p => `- ${p.nickname} (${p.health_status}${p.room ? ', ' + p.room : ''})`).join('\n')
    : 'No plants added yet.'

  return `You are PlantCare AI, a friendly and knowledgeable plant care assistant.
Respond in ${lang}. Keep answers concise, practical, and encouraging.
Use markdown for **bold** and bullet lists when helpful, but keep responses under 200 words unless asked for more detail.
If the user sends a photo, analyze the plant's condition carefully and give specific advice.

The user's current plants:
${plantList}

When relevant, reference their specific plants by name. Focus on practical, actionable advice.`
}

function fileToBase64(file: File): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      const [header, data] = dataUrl.split(',')
      const mimeType = header.match(/:(.*?);/)?.[1] ?? 'image/jpeg'
      resolve({ data, mimeType })
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function exportChat(messages: ChatMessage[]) {
  const lines = messages.map(m =>
    `[${m.role === 'user' ? 'You' : 'PlantCare AI'}]\n${m.content}`
  ).join('\n\n---\n\n')
  const blob = new Blob([lines], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `plantcare-chat-${new Date().toISOString().split('T')[0]}.txt`
  a.click()
  URL.revokeObjectURL(url)
}

interface BubbleProps {
  msg: ChatMessage
  isStreaming?: boolean
}

function Bubble({ msg, isStreaming }: BubbleProps) {
  const [copied, setCopied] = useState(false)
  const isUser = msg.role === 'user'

  async function handleCopy() {
    if (isUser || !msg.content) return
    await navigator.clipboard.writeText(msg.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
    >
      {!isUser && (
        <div className="w-8 h-8 rounded-xl bg-[#4A7C59] flex items-center justify-center flex-shrink-0 mt-0.5">
          <Bot className="w-4 h-4 text-white" />
        </div>
      )}

      <div className="flex flex-col gap-1.5 max-w-[75%]">
        {/* Image preview in message */}
        {msg.imagePreview && (
          <img
            src={msg.imagePreview}
            alt="uploaded"
            className={`rounded-xl object-cover max-h-48 w-auto ${isUser ? 'self-end' : 'self-start'}`}
          />
        )}

        {/* Text bubble */}
        {(msg.content || isStreaming) && (
          <div
            onClick={isUser ? undefined : handleCopy}
            title={isUser ? undefined : (copied ? 'Copied!' : 'Click to copy')}
            className={`relative group px-4 py-3 rounded-2xl text-sm leading-relaxed ${
              isUser
                ? 'bg-[#4A7C59] text-white rounded-tr-sm'
                : 'bg-white dark:bg-[#1a2e1f] border border-[#E5EDE8] dark:border-[#2a3d2f] text-[#1A1A1A] dark:text-white rounded-tl-sm cursor-pointer hover:border-[#86EFAC] dark:hover:border-[#4A7C59] transition-colors'
            }`}
          >
            {isUser ? (
              <span className="whitespace-pre-wrap">{msg.content}</span>
            ) : (
              <>
                <ReactMarkdown
                  components={{
                    p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
                    ul: ({ children }) => <ul className="list-disc pl-4 mb-1 space-y-0.5">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal pl-4 mb-1 space-y-0.5">{children}</ol>,
                    li: ({ children }) => <li className="leading-snug">{children}</li>,
                    strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                    em: ({ children }) => <em className="italic">{children}</em>,
                  }}
                >
                  {msg.content || (isStreaming ? '▋' : '')}
                </ReactMarkdown>
                {/* Copy icon */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {copied
                    ? <Check className="w-3 h-3 text-[#4A7C59]" />
                    : <Copy className="w-3 h-3 text-[#9ca3af]" />
                  }
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </motion.div>
  )
}

export default function AIChatPage() {
  const { t, i18n } = useTranslation()
  const location = useLocation()
  const { data: plants } = usePlants()

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })

  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const hasKey = !!import.meta.env.VITE_GEMINI_API_KEY
  const isLt = i18n.language.startsWith('lt')
  const suggestions = isLt ? SUGGESTIONS.lt : SUGGESTIONS.en

  // Auto-send prefill from Encyclopedia
  useEffect(() => {
    const prefill = localStorage.getItem(PREFILL_KEY) || (location.state as { prefill?: string })?.prefill
    if (prefill) {
      localStorage.removeItem(PREFILL_KEY)
      send(prefill)
    }
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    try {
      // Strip imagePreview before persisting (images are large)
      const toSave = messages.map(({ imagePreview: _, ...m }) => m)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave.slice(-50)))
    } catch { /* ignore storage errors */ }
  }, [messages])

  const plantContext = (plants ?? []).map(p => ({
    nickname: p.nickname,
    health_status: p.health_status,
    room: p.room,
  }))

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    const reader = new FileReader()
    reader.onload = () => setImagePreview(reader.result as string)
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  function clearImage() {
    setImageFile(null)
    setImagePreview(null)
  }

  async function send(text: string) {
    if ((!text.trim() && !imageFile) || loading) return
    setError(null)

    let image: ImageData | undefined
    const preview = imagePreview
    if (imageFile) {
      image = await fileToBase64(imageFile)
      clearImage()
    }

    const userMsg: ChatMessage = {
      role: 'user',
      content: text.trim(),
      imagePreview: preview ?? undefined,
    }
    const next = [...messages, userMsg]
    setMessages([...next, { role: 'assistant', content: '' }])
    setInput('')
    setLoading(true)

    try {
      const system = buildSystemPrompt(plantContext, i18n.language)
      await sendChatMessageStream(next, system, (chunk) => {
        setMessages(prev => {
          const updated = [...prev]
          const last = updated[updated.length - 1]
          if (last?.role === 'assistant') {
            updated[updated.length - 1] = { ...last, content: last.content + chunk }
          }
          return updated
        })
      }, image)
    } catch (e) {
      setMessages(prev => prev.slice(0, -1))
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send(input)
    }
  }

  const isLastStreaming = loading && messages[messages.length - 1]?.role === 'assistant'

  return (
    <div className="flex flex-col h-[calc(100vh-8.5rem)] lg:h-screen">

      {/* Header */}
      <div className="flex-shrink-0 px-4 sm:px-6 py-4 border-b border-[#E5EDE8] dark:border-[#2a3d2f] bg-white dark:bg-[#1a2e1f]">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#4A7C59] rounded-xl flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-[family-name:var(--font-heading)] text-lg font-bold text-[#1A1A1A] dark:text-white">
                {t('ai.chat')}
              </h1>
              <p className="text-xs text-[#6B7280] dark:text-[#9ca3af]">
                Powered by Gemini · {isLt
                  ? `Žino tavo ${plantContext.length} augal${plantContext.length === 1 ? 'ą' : 'us'}`
                  : `Knows your ${plantContext.length} plant${plantContext.length !== 1 ? 's' : ''}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <button
                onClick={() => exportChat(messages)}
                title={isLt ? 'Eksportuoti' : 'Export chat'}
                className="p-2 rounded-lg text-[#6B7280] hover:text-[#4A7C59] hover:bg-[#F0F7F2] dark:hover:bg-[#0f1a13] transition-colors"
              >
                <Download className="w-4 h-4" />
              </button>
            )}
            {messages.length > 0 && (
              <button
                onClick={() => { setMessages([]); localStorage.removeItem(STORAGE_KEY) }}
                className="text-xs text-[#6B7280] hover:text-red-500 transition-colors px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30"
              >
                {isLt ? 'Išvalyti' : 'Clear'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* No API key warning */}
      {!hasKey && (
        <div className="flex-shrink-0 px-6 py-3 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-900">
          <p className="text-xs text-amber-700 dark:text-amber-400 max-w-3xl mx-auto">
            ⚠️ Add your <code className="font-mono bg-amber-100 dark:bg-amber-900/50 px-1 rounded">VITE_GEMINI_API_KEY</code> to <code className="font-mono bg-amber-100 dark:bg-amber-900/50 px-1 rounded">.env</code> and restart the dev server to enable AI chat.
          </p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
        <div className="max-w-3xl mx-auto space-y-4">

          {/* Empty state */}
          {messages.length === 0 && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="text-center py-12">
              <div className="w-16 h-16 bg-[#E8F5EC] dark:bg-[#0f2a18] rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-[#4A7C59]" />
              </div>
              <h3 className="font-[family-name:var(--font-heading)] text-lg font-semibold text-[#1A1A1A] dark:text-white mb-1">
                {isLt ? 'Klausk apie augalus' : 'Ask me anything about plants'}
              </h3>
              <p className="text-sm text-[#6B7280] dark:text-[#9ca3af] mb-8">
                {isLt
                  ? 'Žinau tavo augalus ir galiu padėti su priežiūra, diagnozėmis ir patarimais.'
                  : 'I know your plants and can help with care, diagnoses, and tips.'}
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {suggestions.map(s => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    disabled={!hasKey}
                    className="px-4 py-2 bg-white dark:bg-[#1a2e1f] border border-[#E5EDE8] dark:border-[#2a3d2f] rounded-full text-sm text-[#4A7C59] hover:border-[#4A7C59] hover:bg-[#F0F7F2] dark:hover:bg-[#0f2a18] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Message bubbles */}
          {messages.map((msg, i) => (
            <Bubble
              key={i}
              msg={msg}
              isStreaming={isLastStreaming && i === messages.length - 1}
            />
          ))}

          {/* Loading indicator — only before first chunk */}
          <AnimatePresence>
            {loading && messages[messages.length - 1]?.content === '' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#4A7C59] flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="px-4 py-3 bg-white dark:bg-[#1a2e1f] border border-[#E5EDE8] dark:border-[#2a3d2f] rounded-2xl rounded-tl-sm flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 text-[#4A7C59] animate-spin" />
                  <span className="text-sm text-[#6B7280] dark:text-[#9ca3af]">
                    {isLt ? 'Galvoja…' : 'Thinking…'}
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="text-xs text-red-500 bg-red-50 dark:bg-red-950/30 px-4 py-2 rounded-xl text-center">
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div className="flex-shrink-0 px-4 sm:px-6 py-4 border-t border-[#E5EDE8] dark:border-[#2a3d2f] bg-white dark:bg-[#1a2e1f]">
        <div className="max-w-3xl mx-auto">

          {/* Image preview bar */}
          <AnimatePresence>
            {imagePreview && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-2 overflow-hidden"
              >
                <div className="relative inline-block">
                  <img src={imagePreview} alt="preview" className="h-20 w-auto rounded-xl object-cover border border-[#E5EDE8] dark:border-[#2a3d2f]" />
                  <button
                    onClick={clearImage}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#4A7C59] rounded-full flex items-center justify-center text-white shadow"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex gap-2 items-end">
            {/* Image upload button */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageSelect}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={!hasKey || loading}
              title={isLt ? 'Pridėti nuotrauką' : 'Add photo'}
              className="w-11 h-11 flex items-center justify-center border border-[#E5EDE8] dark:border-[#2a3d2f] rounded-2xl text-[#6B7280] hover:text-[#4A7C59] hover:border-[#4A7C59] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0 bg-white dark:bg-[#0f1a13]"
            >
              <ImagePlus className="w-4 h-4" />
            </button>

            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              disabled={!hasKey || loading}
              placeholder={hasKey
                ? (isLt ? 'Klausk apie savo augalus…' : 'Ask about your plants…')
                : 'Add API key to enable chat'}
              rows={1}
              className="flex-1 px-4 py-3 border border-[#E5EDE8] dark:border-[#2a3d2f] rounded-2xl text-sm text-[#1A1A1A] dark:text-white bg-white dark:bg-[#0f1a13] placeholder-[#6B7280] focus:outline-none focus:ring-2 focus:ring-[#4A7C59]/30 focus:border-[#4A7C59] transition-all resize-none disabled:opacity-50"
              style={{ maxHeight: '120px', overflowY: 'hidden' }}
              onInput={e => {
                const el = e.currentTarget
                el.style.height = 'auto'
                el.style.height = `${Math.min(el.scrollHeight, 120)}px`
                el.style.overflowY = el.scrollHeight > 120 ? 'auto' : 'hidden'
              }}
            />
            <button
              onClick={() => send(input)}
              disabled={!hasKey || loading || (!input.trim() && !imageFile)}
              className="w-11 h-11 flex items-center justify-center bg-[#4A7C59] hover:bg-[#3A6647] text-white rounded-2xl transition-all disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
