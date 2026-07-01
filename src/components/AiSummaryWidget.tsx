import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, RefreshCw, Loader2 } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { sendChatMessage } from '../lib/gemini'

const CACHE_KEY = 'plantcare-ai-summary'
const CACHE_DATE_KEY = 'plantcare-ai-summary-date'

interface Props {
  plants: { id: string; nickname: string; health_status: string }[]
  schedules: { plant_id: string; action_type: string; next_due: string }[]
  isLt: boolean
}

export default function AiSummaryWidget({ plants, schedules, isLt }: Props) {
  const [summary, setSummary] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!plants.length) return
    const today = new Date().toISOString().split('T')[0]
    const cachedDate = localStorage.getItem(CACHE_DATE_KEY)
    const cached = localStorage.getItem(CACHE_KEY)
    if (cachedDate === today && cached) {
      setSummary(cached)
    } else {
      generate()
    }
  }, [plants.length])

  async function generate() {
    if (!plants.length || !import.meta.env.VITE_GEMINI_API_KEY) return
    setLoading(true)
    try {
      const today = new Date().toISOString().split('T')[0]
      const overdueNames = schedules
        .filter(s => s.action_type === 'water' && s.next_due <= today)
        .map(s => plants.find(p => p.id === s.plant_id)?.nickname)
        .filter(Boolean)

      const systemPrompt = `You are PlantCare AI. Generate a brief, friendly weekly plant care summary in ${isLt ? 'Lithuanian' : 'English'}.
Keep it under 70 words. Be warm and practical. Use **bold** for plant names or key actions. Use bullet points if listing more than 2 items.`

      const userMsg = `My plants: ${plants.map(p => `${p.nickname} (${p.health_status})`).join(', ')}.
${overdueNames.length ? `Need watering now: ${overdueNames.join(', ')}.` : 'All plants are watered.'}
Give me a quick care tip and a motivating note for this week.`

      const result = await sendChatMessage([{ role: 'user', content: userMsg }], systemPrompt)
      setSummary(result)
      localStorage.setItem(CACHE_KEY, result)
      localStorage.setItem(CACHE_DATE_KEY, new Date().toISOString().split('T')[0])
    } catch (e) {
      console.error('AI summary error:', e)
    } finally {
      setLoading(false)
    }
  }

  if (!plants.length || !import.meta.env.VITE_GEMINI_API_KEY) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.45, duration: 0.4 }}
      className="bg-gradient-to-br from-[#F0F7F2] to-white dark:from-[#22252c] dark:to-[#1a1c20] rounded-2xl border border-[#C6E0CC] dark:border-[#2b2e35] p-5"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-[#4A7C59] rounded-lg flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <h2 className="font-semibold text-[#1A1A1A] dark:text-white text-sm">
            {isLt ? 'AI savaitės patarimai' : 'AI Weekly Tips'}
          </h2>
        </div>
        <button
          onClick={generate}
          disabled={loading}
          title={isLt ? 'Atnaujinti' : 'Refresh'}
          className="p-1.5 rounded-lg hover:bg-[#E8F5EC] dark:hover:bg-[#101114] text-[#6B7280] hover:text-[#4A7C59] transition-colors disabled:opacity-40"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading && !summary ? (
        <div className="flex items-center gap-2 text-sm text-[#6B7280] dark:text-[#9ca3af] py-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-[#4A7C59]" />
          {isLt ? 'Generuojama...' : 'Generating...'}
        </div>
      ) : summary ? (
        <div className="text-sm text-[#374151] dark:text-[#d1d5db] leading-relaxed">
          <ReactMarkdown
            components={{
              p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
              ul: ({ children }) => <ul className="list-disc pl-4 mb-1 space-y-0.5">{children}</ul>,
              li: ({ children }) => <li>{children}</li>,
              strong: ({ children }) => <strong className="font-semibold text-[#4A7C59] dark:text-[#86efac]">{children}</strong>,
            }}
          >
            {summary}
          </ReactMarkdown>
        </div>
      ) : null}
    </motion.div>
  )
}
