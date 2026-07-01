import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, Lock, Leaf, ArrowRight, Loader2, Sun, Moon } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useTheme } from '../hooks/useTheme'

type Mode = 'login' | 'register'

export default function AuthPage() {
  const { t, i18n } = useTranslation()
  const { user, loading } = useAuth()
  const { theme, toggle: toggleTheme } = useTheme()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (loading) return null
  if (user) return <Navigate to="/dashboard" replace />

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setSubmitting(true)

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
    } else {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setError(error.message)
      else setSuccess(t('auth.checkEmail'))
    }

    setSubmitting(false)
  }

  const isLT = i18n.language.startsWith('lt')

  return (
    <div className="min-h-screen bg-[#F0F7F2] dark:bg-[#0f1a13] flex items-center justify-center px-4 transition-colors duration-300">

      {/* Top-right controls */}
      <div className="fixed top-4 right-4 flex items-center gap-2">
        {/* Language toggle */}
        <button
          onClick={() => i18n.changeLanguage(isLT ? 'en' : 'lt')}
          className="px-3 py-1.5 text-xs font-medium rounded-full border border-[#E5EDE8] dark:border-[#2a3d2f] bg-white dark:bg-[#1a2e1f] text-[#4A7C59] dark:text-[#86EFAC] hover:bg-[#F0F7F2] dark:hover:bg-[#243328] transition-all"
        >
          {isLT ? 'EN' : 'LT'}
        </button>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="p-1.5 rounded-full border border-[#E5EDE8] dark:border-[#2a3d2f] bg-white dark:bg-[#1a2e1f] text-[#6B7280] dark:text-[#86EFAC] hover:bg-[#F0F7F2] dark:hover:bg-[#243328] transition-all"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>

      <div className="w-full max-w-md">

        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#4A7C59] rounded-2xl mb-4 shadow-lg">
            <Leaf className="w-8 h-8 text-white" />
          </div>
          <h1 className="font-[family-name:var(--font-heading)] text-3xl font-bold text-[#1A1A1A] dark:text-white">
            PlantCare AI
          </h1>
          <p className="text-[#6B7280] dark:text-[#9ca3af] mt-1 text-sm">
            {t('auth.tagline')}
          </p>
        </motion.div>

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-[#1a2e1f] rounded-2xl shadow-sm border border-[#E5EDE8] dark:border-[#2a3d2f] p-8 transition-colors duration-300"
        >
          {/* Mode toggle */}
          <div className="flex bg-[#F0F7F2] dark:bg-[#0f1a13] rounded-xl p-1 mb-6">
            {(['login', 'register'] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(null); setSuccess(null) }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  mode === m
                    ? 'bg-white dark:bg-[#1a2e1f] text-[#4A7C59] dark:text-[#86EFAC] shadow-sm'
                    : 'text-[#6B7280] dark:text-[#9ca3af] hover:text-[#4A7C59] dark:hover:text-[#86EFAC]'
                }`}
              >
                {m === 'login' ? t('auth.signIn') : t('auth.signUp')}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-[#1A1A1A] dark:text-white mb-1.5">
                {t('auth.email')}
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280] dark:text-[#9ca3af]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="name@example.com"
                  className="w-full pl-10 pr-4 py-2.5 border border-[#E5EDE8] dark:border-[#2a3d2f] rounded-xl text-sm text-[#1A1A1A] dark:text-white bg-white dark:bg-[#0f1a13] placeholder-[#6B7280] dark:placeholder-[#4b5563] focus:outline-none focus:ring-2 focus:ring-[#4A7C59]/30 focus:border-[#4A7C59] transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-[#1A1A1A] dark:text-white mb-1.5">
                {t('auth.password')}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280] dark:text-[#9ca3af]" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  minLength={6}
                  className="w-full pl-10 pr-4 py-2.5 border border-[#E5EDE8] dark:border-[#2a3d2f] rounded-xl text-sm text-[#1A1A1A] dark:text-white bg-white dark:bg-[#0f1a13] placeholder-[#6B7280] dark:placeholder-[#4b5563] focus:outline-none focus:ring-2 focus:ring-[#4A7C59]/30 focus:border-[#4A7C59] transition-all"
                />
              </div>
            </div>

            {/* Error / Success */}
            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 px-3 py-2 rounded-lg"
                >
                  {error}
                </motion.p>
              )}
              {success && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-sm text-[#4A7C59] dark:text-[#86EFAC] bg-[#E8F5EC] dark:bg-[#0f2a18] px-3 py-2 rounded-lg"
                >
                  {success}
                </motion.p>
              )}
            </AnimatePresence>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 bg-[#4A7C59] hover:bg-[#3A6647] text-white py-2.5 rounded-full font-medium text-sm transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  {mode === 'login' ? t('auth.signIn') : t('auth.signUp')}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  )
}
