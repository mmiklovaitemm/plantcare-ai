import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { User, Globe, Palette, LogOut, Loader2, CheckCircle2, Moon, Sun, Lock } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useTheme } from '../hooks/useTheme'

const card = 'bg-white dark:bg-[#1a2e1f] rounded-2xl border border-[#E5EDE8] dark:border-[#2a3d2f] p-6'
const inputCls = 'w-full px-4 py-3 border border-[#E5EDE8] dark:border-[#2a3d2f] rounded-xl text-sm text-[#1A1A1A] dark:text-white bg-white dark:bg-[#0f1a13] placeholder-[#6B7280] focus:outline-none focus:ring-2 focus:ring-[#4A7C59]/30 focus:border-[#4A7C59] transition-all'
const labelCls = 'block text-xs font-medium text-[#6B7280] dark:text-[#9ca3af] mb-2 uppercase tracking-wide'

const v = {
  hidden: { opacity: 0, y: 14 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.07, duration: 0.35 } }),
}

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className="w-9 h-9 bg-[#E8F5EC] dark:bg-[#0f2a18] rounded-xl flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <h2 className="font-semibold text-[#1A1A1A] dark:text-white text-base">{title}</h2>
    </div>
  )
}

export default function SettingsPage() {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const { theme, toggle } = useTheme()

  const [name, setName] = useState('')
  const [city, setCity] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loadingProfile, setLoadingProfile] = useState(true)

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    if (!user) return
    supabase
      .from('users')
      .select('name, city')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setName(data.name ?? '')
          setCity(data.city ?? '')
        }
        setLoadingProfile(false)
      })
  }, [user])

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setSaving(true)
    await supabase.from('users').update({ name, city }).eq('id', user.id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    setPasswordMsg(null)
    if (newPassword.length < 6) {
      setPasswordMsg({ type: 'error', text: t('settings.passwordTooShort') })
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: t('settings.passwordMismatch') })
      return
    }
    setSavingPassword(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setSavingPassword(false)
    if (error) {
      setPasswordMsg({ type: 'error', text: error.message })
    } else {
      setPasswordMsg({ type: 'success', text: t('settings.passwordChanged') })
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => setPasswordMsg(null), 3000)
    }
  }

  function setLanguage(lang: string) {
    i18n.changeLanguage(lang)
    localStorage.setItem('i18nextLng', lang)
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">

      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="font-[family-name:var(--font-heading)] text-2xl font-bold text-[#1A1A1A] dark:text-white">
          {t('settings.title')}
        </h1>
        <p className="text-sm text-[#6B7280] dark:text-[#9ca3af] mt-1">{t('settings.subtitle')}</p>
      </motion.div>

      {/* Main grid: 3fr left (Profile) | 2fr right (Language + Appearance) */}
      <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-4 items-start mb-4">

        {/* Profile – left, spans 2 right-rows */}
        <motion.div custom={0} initial="hidden" animate="visible" variants={v}
          className={`${card} lg:row-span-2`}>
          <SectionHeader
            icon={<User className="w-4 h-4 text-[#4A7C59]" />}
            title={t('settings.profile')}
          />

          {loadingProfile ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-5 h-5 text-[#4A7C59] animate-spin" />
            </div>
          ) : (
            <form onSubmit={handleSaveProfile} className="space-y-5">
              {/* Email – read only */}
              <div>
                <label className={labelCls}>Email</label>
                <div className="w-full px-4 py-3 border border-[#E5EDE8] dark:border-[#2a3d2f] rounded-xl text-sm text-[#6B7280] dark:text-[#9ca3af] bg-[#F0F7F2] dark:bg-[#0f1a13]">
                  {user?.email}
                </div>
              </div>

              {/* Name + City side by side */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>{t('settings.name')}</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder={t('settings.name')}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>{t('settings.city')}</label>
                  <input
                    type="text"
                    value={city}
                    onChange={e => setCity(e.target.value)}
                    placeholder={t('settings.city')}
                    className={inputCls}
                  />
                </div>
              </div>

              {/* Save */}
              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 bg-[#4A7C59] hover:bg-[#3A6647] text-white rounded-full text-sm font-medium transition-all disabled:opacity-60 min-w-[120px] justify-center"
                >
                  {saving
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : saved
                    ? <CheckCircle2 className="w-4 h-4" />
                    : null}
                  {saved ? 'Saved!' : t('settings.save')}
                </button>
              </div>
            </form>
          )}
        </motion.div>

        {/* Language – right top */}
        <motion.div custom={1} initial="hidden" animate="visible" variants={v} className={card}>
          <SectionHeader
            icon={<Globe className="w-4 h-4 text-[#4A7C59]" />}
            title={t('settings.language')}
          />
          <div className="flex gap-3">
            {[
              { code: 'en', label: 'English', flag: '🇬🇧' },
              { code: 'lt', label: 'Lietuvių', flag: '🇱🇹' },
            ].map(lang => (
              <button
                key={lang.code}
                onClick={() => setLanguage(lang.code)}
                className={`flex-1 flex items-center justify-center gap-2.5 py-3 rounded-xl border text-sm font-medium transition-all ${
                  i18n.language === lang.code
                    ? 'bg-[#4A7C59] text-white border-[#4A7C59]'
                    : 'border-[#E5EDE8] dark:border-[#2a3d2f] text-[#1A1A1A] dark:text-white hover:border-[#4A7C59]'
                }`}
              >
                <span className="text-base">{lang.flag}</span>
                {lang.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Appearance – right bottom */}
        <motion.div custom={2} initial="hidden" animate="visible" variants={v} className={card}>
          <SectionHeader
            icon={<Palette className="w-4 h-4 text-[#4A7C59]" />}
            title={t('settings.appearance')}
          />
          <div className="flex gap-3">
            {[
              { value: 'light', label: 'Light', icon: <Sun className="w-4 h-4" /> },
              { value: 'dark',  label: 'Dark',  icon: <Moon className="w-4 h-4" /> },
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => { if (theme !== opt.value) toggle() }}
                className={`flex-1 flex items-center justify-center gap-2.5 py-3 rounded-xl border text-sm font-medium transition-all ${
                  theme === opt.value
                    ? 'bg-[#4A7C59] text-white border-[#4A7C59]'
                    : 'border-[#E5EDE8] dark:border-[#2a3d2f] text-[#1A1A1A] dark:text-white hover:border-[#4A7C59]'
                }`}
              >
                {opt.icon}
                {opt.label}
              </button>
            ))}
          </div>
        </motion.div>

      </div>

      {/* Password change – full width */}
      <motion.div custom={3} initial="hidden" animate="visible" variants={v} className={`${card} mb-4`}>
        <SectionHeader
          icon={<Lock className="w-4 h-4 text-[#4A7C59]" />}
          title={t('settings.changePassword')}
        />
        <form onSubmit={handleChangePassword} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>{t('settings.newPassword')}</label>
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="••••••••"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>{t('settings.confirmPassword')}</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className={inputCls}
            />
          </div>
          {passwordMsg && (
            <p className={`sm:col-span-2 text-sm px-1 ${passwordMsg.type === 'success' ? 'text-[#4A7C59]' : 'text-red-500'}`}>
              {passwordMsg.text}
            </p>
          )}
          <div className="sm:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={savingPassword || !newPassword}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#4A7C59] hover:bg-[#3A6647] text-white rounded-full text-sm font-medium transition-all disabled:opacity-60 min-w-[120px] justify-center"
            >
              {savingPassword
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : passwordMsg?.type === 'success'
                ? <CheckCircle2 className="w-4 h-4" />
                : null}
              {passwordMsg?.type === 'success' ? t('settings.passwordChanged') : t('settings.save')}
            </button>
          </div>
        </form>
      </motion.div>

      {/* Account – full width bottom */}
      <motion.div custom={4} initial="hidden" animate="visible" variants={v}
        className={`${card} flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4`}>
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 bg-red-50 dark:bg-red-950/30 rounded-xl flex items-center justify-center shrink-0">
            <LogOut className="w-4 h-4 text-red-500" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#1A1A1A] dark:text-white">{t('settings.account')}</p>
            <p className="text-xs text-[#6B7280] dark:text-[#9ca3af] truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={() => supabase.auth.signOut()}
          className="flex items-center justify-center gap-2 w-full sm:w-auto shrink-0 whitespace-nowrap px-5 py-2.5 border border-red-200 dark:border-red-900 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-full text-sm font-medium transition-all"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {t('auth.signOut')}
        </button>
      </motion.div>

    </div>
  )
}
