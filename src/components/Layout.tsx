import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  LayoutDashboard, Leaf, BookOpen, Calendar,
  BookMarked, Settings, LogOut, Sun, Moon, Bot
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useTheme } from '../hooks/useTheme'

const navItems = [
  { to: '/dashboard',    icon: LayoutDashboard, key: 'nav.dashboard' },
  { to: '/collection',   icon: Leaf,            key: 'nav.collection' },
  { to: '/encyclopedia', icon: BookOpen,        key: 'nav.encyclopedia' },
  { to: '/calendar',     icon: Calendar,        key: 'nav.calendar' },
  { to: '/journal',      icon: BookMarked,      key: 'nav.journal' },
  { to: '/ai',           icon: Bot,             key: 'nav.ai' },
  { to: '/settings',     icon: Settings,        key: 'nav.settings' },
]

// Mobile bottom nav: 5 most used items
const mobileNavItems = [
  { to: '/dashboard',  icon: LayoutDashboard, key: 'nav.dashboard' },
  { to: '/collection', icon: Leaf,            key: 'nav.collection' },
  { to: '/calendar',   icon: Calendar,        key: 'nav.calendar' },
  { to: '/journal',    icon: BookMarked,      key: 'nav.journal' },
  { to: '/ai',         icon: Bot,             key: 'nav.ai' },
]

export default function Layout() {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const { theme, toggle: toggleTheme } = useTheme()
  const navigate = useNavigate()

  const isLT = i18n.language.startsWith('lt')

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/auth')
  }

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
      isActive
        ? 'bg-[#4A7C59] text-white shadow-sm'
        : 'text-[#6B7280] dark:text-[#9ca3af] hover:bg-[#F0F7F2] dark:hover:bg-[#1a1c20] hover:text-[#4A7C59] dark:hover:text-[#86EFAC]'
    }`

  const bottomNavClass = ({ isActive }: { isActive: boolean }) =>
    `flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200 ${
      isActive
        ? 'text-[#4A7C59] dark:text-[#86EFAC]'
        : 'text-[#6B7280] dark:text-[#9ca3af]'
    }`

  return (
    <div className="min-h-screen bg-[#F0F7F2] dark:bg-[#101114] transition-colors duration-300">

      {/* ── Desktop sidebar ── */}
      <aside className="hidden lg:flex flex-col fixed inset-y-0 left-0 w-60 bg-white dark:bg-[#1a1c20] border-r border-[#E5EDE8] dark:border-[#2b2e35] z-40 transition-colors duration-300">

        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-[#E5EDE8] dark:border-[#2b2e35]">
          <div className="flex items-center justify-center w-9 h-9 bg-[#4A7C59] rounded-xl">
            <Leaf className="w-5 h-5 text-white" />
          </div>
          <span className="font-[family-name:var(--font-heading)] font-bold text-lg text-[#1A1A1A] dark:text-white">
            PlantCare
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, key }) => (
            <NavLink key={to} to={to} className={navLinkClass}>
              <Icon className="w-4 h-4 shrink-0" />
              {t(key)}
            </NavLink>
          ))}
        </nav>

        {/* Bottom controls */}
        <div className="px-3 py-4 border-t border-[#E5EDE8] dark:border-[#2b2e35] space-y-1">
          {/* Language + theme row */}
          <div className="flex items-center gap-2 px-3 py-2">
            <button
              onClick={() => i18n.changeLanguage(isLT ? 'en' : 'lt')}
              className="flex-1 text-xs font-medium text-[#6B7280] dark:text-[#9ca3af] hover:text-[#4A7C59] dark:hover:text-[#86EFAC] transition-colors text-left"
            >
              {isLT ? '🇬🇧 EN' : '🇱🇹 LT'}
            </button>
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-lg text-[#6B7280] dark:text-[#9ca3af] hover:text-[#4A7C59] dark:hover:text-[#86EFAC] hover:bg-[#F0F7F2] dark:hover:bg-[#101114] transition-all"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>

          {/* User */}
          <div className="px-3 py-2">
            <p className="text-xs text-[#6B7280] dark:text-[#9ca3af] truncate">{user?.email}</p>
          </div>

          {/* Sign out */}
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-[#6B7280] dark:text-[#9ca3af] hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-500 transition-all duration-200"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {t('auth.signOut')}
          </button>
        </div>
      </aside>

      {/* ── Mobile header ── */}
      <header className="lg:hidden fixed top-0 inset-x-0 h-14 bg-white dark:bg-[#1a1c20] border-b border-[#E5EDE8] dark:border-[#2b2e35] flex items-center justify-between px-4 z-40 transition-colors duration-300">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 bg-[#4A7C59] rounded-xl">
            <Leaf className="w-4 h-4 text-white" />
          </div>
          <span className="font-[family-name:var(--font-heading)] font-bold text-[#1A1A1A] dark:text-white">
            PlantCare
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => i18n.changeLanguage(isLT ? 'en' : 'lt')}
            className="text-xs font-medium text-[#6B7280] dark:text-[#9ca3af] px-2 py-1 rounded-lg hover:bg-[#F0F7F2] dark:hover:bg-[#101114] transition-colors">
            {isLT ? 'EN' : 'LT'}
          </button>
          <button onClick={toggleTheme}
            className="p-1.5 rounded-lg text-[#6B7280] dark:text-[#9ca3af] hover:bg-[#F0F7F2] dark:hover:bg-[#101114] transition-all">
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <NavLink to="/settings"
            aria-label={t('nav.settings')}
            className={({ isActive }) => `p-1.5 rounded-lg transition-all ${
              isActive
                ? 'text-[#4A7C59] dark:text-[#86EFAC] bg-[#F0F7F2] dark:bg-[#101114]'
                : 'text-[#6B7280] dark:text-[#9ca3af] hover:bg-[#F0F7F2] dark:hover:bg-[#101114]'
            }`}>
            <Settings className="w-4 h-4" />
          </NavLink>
        </div>
      </header>

      {/* ── Main content ── */}
      <main className="lg:pl-60 pt-14 lg:pt-0 pb-20 lg:pb-0 min-h-screen">
        <Outlet />
      </main>

      {/* ── Mobile bottom nav ── */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-white dark:bg-[#1a1c20] border-t border-[#E5EDE8] dark:border-[#2b2e35] flex items-center justify-around px-2 py-2 z-40 transition-colors duration-300">
        {mobileNavItems.map(({ to, icon: Icon, key }) => (
          <NavLink key={to} to={to} className={bottomNavClass}>
            <Icon className="w-5 h-5" />
            <span className="text-[10px]">{t(key)}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
