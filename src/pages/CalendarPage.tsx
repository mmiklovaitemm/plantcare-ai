import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft, ChevronRight, Droplets, Leaf,
  Sprout, Wind, Scissors, Plus, CalendarDays, LayoutGrid, PackagePlus,
} from 'lucide-react'
import { usePlants } from '../hooks/usePlants'
import { useCareSchedules, useLogCare } from '../hooks/useCareSchedule'
import AddPlantModal from '../components/AddPlantModal'
import type { Plant, CareSchedule, CareActionType } from '../types'

// ─── Action config ────────────────────────────────────────────────────────────
const ACTION: Record<CareActionType, {
  icon: React.ElementType
  labelKey: string
  badge: string
  badgeProjected: string
}> = {
  water:    { icon: Droplets,    labelKey: 'care.water',     badge: 'bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400',     badgeProjected: 'bg-blue-50 dark:bg-blue-950/20 text-blue-400 dark:text-blue-600 opacity-60' },
  fertilize:{ icon: Sprout,     labelKey: 'care.fertilize', badge: 'bg-green-100 dark:bg-green-950/50 text-green-600 dark:text-green-400', badgeProjected: 'bg-green-50 dark:bg-green-950/20 text-green-400 opacity-60' },
  mist:     { icon: Wind,       labelKey: 'care.mist',      badge: 'bg-cyan-100 dark:bg-cyan-950/50 text-cyan-600 dark:text-cyan-400',     badgeProjected: 'bg-cyan-50 dark:bg-cyan-950/20 text-cyan-400 opacity-60' },
  repot:    { icon: PackagePlus,labelKey: 'care.repot',     badge: 'bg-orange-100 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400', badgeProjected: 'bg-orange-50 dark:bg-orange-950/20 text-orange-400 opacity-60' },
  prune:    { icon: Scissors,   labelKey: 'care.prune',     badge: 'bg-purple-100 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400', badgeProjected: 'bg-purple-50 dark:bg-purple-950/20 text-purple-400 opacity-60' },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getLocaleDayNames(locale: string, format: 'long' | 'short'): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(2024, 0, 1 + i) // Jan 1 2024 = Monday
    return d.toLocaleDateString(locale, { weekday: format })
  })
}

function getLocaleMonthName(locale: string, monthIndex: number): string {
  return new Date(2024, monthIndex, 1).toLocaleDateString(locale, { month: 'long' })
}

function toDateStr(d: Date) { return d.toISOString().split('T')[0] }
function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() + n); return r }

function getMonthDays(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1)
  const last  = new Date(year, month + 1, 0)
  const pad   = (first.getDay() + 6) % 7
  const days: (Date | null)[] = Array(pad).fill(null)
  for (let d = 1; d <= last.getDate(); d++) days.push(new Date(year, month, d))
  while (days.length % 7 !== 0) days.push(null)
  return days
}

function getWeekDays(anchor: Date): Date[] {
  const day = (anchor.getDay() + 6) % 7 // Mon=0
  const mon = addDays(anchor, -day)
  return Array.from({ length: 7 }, (_, i) => addDays(mon, i))
}

// Generate all occurrences of a schedule within [rangeStart, rangeEnd]
function getOccurrences(
  schedule: CareSchedule,
  rangeStart: string,
  rangeEnd: string,
  todayStr: string,
): { dateStr: string; projected: boolean; status: 'overdue' | 'today' | 'upcoming' }[] {
  const results: { dateStr: string; projected: boolean; status: 'overdue' | 'today' | 'upcoming' }[] = []
  const interval = schedule.interval_days
  const end = new Date(rangeEnd + 'T00:00:00')
  let d = new Date(schedule.next_due + 'T00:00:00')

  // Advance to first occurrence within range (project forward if next_due is before range)
  let step = 0
  while (d < new Date(rangeStart + 'T00:00:00')) {
    d = addDays(d, interval)
    step++
  }

  while (d <= end) {
    const dateStr = toDateStr(d)
    const projected = step > 0
    const status: 'overdue' | 'today' | 'upcoming' =
      projected ? 'upcoming'
      : dateStr < todayStr ? 'overdue'
      : dateStr === todayStr ? 'today'
      : 'upcoming'
    results.push({ dateStr, projected, status })
    d = addDays(d, interval)
    step++
  }

  return results
}

// ─── Event type ───────────────────────────────────────────────────────────────
interface CalEvent {
  plant: Plant
  schedule: CareSchedule
  status: 'overdue' | 'today' | 'upcoming'
  projected: boolean
}

// ─── Day Popover ─────────────────────────────────────────────────────────────
function DayPopover({ date, events, onLog, logging, onClose, locale, t }: {
  date: Date
  events: CalEvent[]
  onLog: (s: CareSchedule, p: Plant) => void
  logging: boolean
  onClose: () => void
  locale: string
  t: (key: string) => string
}) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: -6 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -6 }}
        transition={{ duration: 0.15 }}
        className="absolute z-50 top-full left-1/2 -translate-x-1/2 mt-2 w-64 bg-white dark:bg-[#1a2e1f] rounded-2xl border border-[#E5EDE8] dark:border-[#2a3d2f] shadow-xl p-4"
      >
        <p className="text-xs font-semibold text-[#6B7280] dark:text-[#9ca3af] mb-3 uppercase tracking-wide">
          {date.toLocaleDateString(locale, { weekday: 'short', month: 'short', day: 'numeric' })}
        </p>
        <div className="space-y-2.5">
          {events.map(({ plant, schedule, status, projected }) => {
            const cfg = ACTION[schedule.action_type]
            const Icon = cfg.icon
            const canLog = (status === 'today' || status === 'overdue') && !projected
            return (
              <div key={schedule.id} className="flex items-center gap-2.5">
                {plant.photo_url ? (
                  <img src={plant.photo_url} alt={plant.nickname} className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-[#E8F5EC] dark:bg-[#0f2a18] flex items-center justify-center flex-shrink-0">
                    <Leaf className="w-4 h-4 text-[#86EFAC]" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-[#1A1A1A] dark:text-white truncate">{plant.nickname}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Icon className="w-3 h-3 text-[#6B7280]" />
                    <span className="text-[10px] text-[#6B7280] dark:text-[#9ca3af]">
                      {t(cfg.labelKey)}{projected ? ` (${t('calendar.estimated').toLowerCase()})` : ''}
                    </span>
                  </div>
                </div>
                {canLog && (
                  <button
                    onClick={() => onLog(schedule, plant)}
                    disabled={logging}
                    className="text-[10px] px-2.5 py-1 bg-[#4A7C59] hover:bg-[#3A6647] text-white rounded-full font-medium transition-all disabled:opacity-60 flex-shrink-0"
                  >
                    {t('calendar.done')}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </motion.div>
    </>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
type ViewMode = 'month' | 'week'

export default function CalendarPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.startsWith('lt') ? 'lt' : 'en'
  const { data: plants } = usePlants()
  const { data: schedules } = useCareSchedules()
  const logCare = useLogCare()

  const today = new Date()
  const todayStr = toDateStr(today)

  const [view, setView] = useState<ViewMode>('month')
  const [anchor, setAnchor] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [addPlantOpen, setAddPlantOpen] = useState(false)

  // ── Navigation ──────────────────────────────────────────────────────────────
  function prev() {
    setSelectedDay(null)
    if (view === 'month') setAnchor(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))
    else setAnchor(d => addDays(d, -7))
  }
  function next() {
    setSelectedDay(null)
    if (view === 'month') setAnchor(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))
    else setAnchor(d => addDays(d, 7))
  }

  // ── Range for current view ──────────────────────────────────────────────────
  const { rangeStart, rangeEnd } = useMemo(() => {
    if (view === 'month') {
      const last = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0)
      return { rangeStart: toDateStr(anchor), rangeEnd: toDateStr(last) }
    } else {
      const days = getWeekDays(anchor)
      return { rangeStart: toDateStr(days[0]), rangeEnd: toDateStr(days[6]) }
    }
  }, [view, anchor])

  // ── Build event map ─────────────────────────────────────────────────────────
  const eventMap = useMemo(() => {
    const map: Record<string, CalEvent[]> = {}
    if (!schedules || !plants) return map
    schedules.forEach(schedule => {
      const plant = plants.find(p => p.id === schedule.plant_id)
      if (!plant) return
      const occurrences = getOccurrences(schedule, rangeStart, rangeEnd, todayStr)
      occurrences.forEach(({ dateStr, projected, status }) => {
        if (!map[dateStr]) map[dateStr] = []
        map[dateStr].push({ plant, schedule, status, projected })
      })
    })
    return map
  }, [schedules, plants, rangeStart, rangeEnd, todayStr])

  async function handleLog(schedule: CareSchedule, plant: Plant) {
    await logCare.mutateAsync({
      plant_id: plant.id,
      action_type: schedule.action_type,
      schedule_id: schedule.id,
      interval_days: schedule.interval_days,
    })
    setSelectedDay(null)
  }

  // ── Locale-based day/month names ────────────────────────────────────────────
  const weekdaysLong  = getLocaleDayNames(locale, 'long')
  const weekdaysShort = getLocaleDayNames(locale, 'short').map(d => d.slice(0, 3))

  // ── Header label ────────────────────────────────────────────────────────────
  const headerLabel = view === 'month'
    ? `${getLocaleMonthName(locale, anchor.getMonth())} ${anchor.getFullYear()}`
    : (() => {
        const days = getWeekDays(anchor)
        const s = days[0]; const e = days[6]
        if (s.getMonth() === e.getMonth())
          return `${getLocaleMonthName(locale, s.getMonth())} ${s.getFullYear()}`
        return `${getLocaleMonthName(locale, s.getMonth())} – ${getLocaleMonthName(locale, e.getMonth())} ${e.getFullYear()}`
      })()

  // ── Month days ──────────────────────────────────────────────────────────────
  const monthDays = useMemo(() =>
    view === 'month' ? getMonthDays(anchor.getFullYear(), anchor.getMonth()) : [],
  [view, anchor])

  // ── Week days ───────────────────────────────────────────────────────────────
  const weekDays = useMemo(() =>
    view === 'week' ? getWeekDays(anchor) : [],
  [view, anchor])

  // ── Legend entries ──────────────────────────────────────────────────────────
  const legendItems = [
    { cls: ACTION.water.badge,    label: t('care.water') },
    { cls: ACTION.fertilize.badge,label: t('care.fertilize') },
    { cls: ACTION.mist.badge,     label: t('care.mist') },
    { cls: ACTION.repot.badge,    label: t('care.repot') },
    { cls: ACTION.prune.badge,    label: t('care.prune') },
  ]

  return (
    <div className="p-6 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-[family-name:var(--font-heading)] text-2xl font-bold text-[#1A1A1A] dark:text-white">
            {t('nav.calendar')}
          </h1>
          <p className="text-sm text-[#6B7280] dark:text-[#9ca3af] mt-0.5">
            {t('calendar.subtitle')}
          </p>
        </div>
        <button
          onClick={() => setAddPlantOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#4A7C59] hover:bg-[#3A6647] text-white rounded-full text-sm font-medium transition-all shadow-sm"
        >
          <Plus className="w-4 h-4" />
          {t('collection.addPlant')}
        </button>
      </div>

      <div className="bg-white dark:bg-[#1a2e1f] rounded-2xl border border-[#E5EDE8] dark:border-[#2a3d2f] overflow-hidden">

        {/* Calendar toolbar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5EDE8] dark:border-[#2a3d2f]">
          <button onClick={prev} className="p-2 rounded-xl hover:bg-[#F0F7F2] dark:hover:bg-[#0f1a13] text-[#6B7280] transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>

          <h2 className="font-[family-name:var(--font-heading)] text-lg font-bold text-[#1A1A1A] dark:text-white">
            {headerLabel}
          </h2>

          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex bg-[#F0F7F2] dark:bg-[#0f1a13] rounded-xl p-1 gap-1">
              <button
                onClick={() => { setView('month'); setAnchor(new Date(today.getFullYear(), today.getMonth(), 1)) }}
                className={`p-1.5 rounded-lg transition-all ${view === 'month' ? 'bg-white dark:bg-[#1a2e1f] shadow-sm text-[#4A7C59]' : 'text-[#6B7280] hover:text-[#4A7C59]'}`}
                title={t('calendar.monthView')}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => { setView('week'); setAnchor(today) }}
                className={`p-1.5 rounded-lg transition-all ${view === 'week' ? 'bg-white dark:bg-[#1a2e1f] shadow-sm text-[#4A7C59]' : 'text-[#6B7280] hover:text-[#4A7C59]'}`}
                title={t('calendar.weekView')}
              >
                <CalendarDays className="w-4 h-4" />
              </button>
            </div>
            <button onClick={next} className="p-2 rounded-xl hover:bg-[#F0F7F2] dark:hover:bg-[#0f1a13] text-[#6B7280] transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 border-b border-[#E5EDE8] dark:border-[#2a3d2f]">
          {(view === 'week' ? weekdaysLong : weekdaysShort).map((d, i) => (
            <div key={d} className={`py-3 text-center text-xs font-semibold uppercase tracking-wide ${
              view === 'week' && weekDays[i] && toDateStr(weekDays[i]) === todayStr
                ? 'text-[#4A7C59]' : 'text-[#6B7280] dark:text-[#9ca3af]'
            }`}>
              {view === 'week' ? d.slice(0, 3) : d}
            </div>
          ))}
        </div>

        {/* ── MONTH VIEW ── */}
        {view === 'month' && (
          <div className="grid grid-cols-7">
            {monthDays.map((date, i) => {
              if (!date) return (
                <div key={i} className="min-h-[88px] bg-[#F9FBFA] dark:bg-[#111d14] border-b border-r border-[#E5EDE8] dark:border-[#2a3d2f]" />
              )
              const dateStr = toDateStr(date)
              const isToday = dateStr === todayStr
              const isPast  = dateStr < todayStr
              const events  = eventMap[dateStr] ?? []
              const isSelected = selectedDay === dateStr

              return (
                <div
                  key={dateStr}
                  onClick={() => events.length > 0 && setSelectedDay(isSelected ? null : dateStr)}
                  className={`relative min-h-[88px] p-2 border-b border-r border-[#E5EDE8] dark:border-[#2a3d2f] transition-colors ${
                    events.length > 0 ? 'cursor-pointer hover:bg-[#F0F7F2] dark:hover:bg-[#0f2a18]' : ''
                  } ${isSelected ? 'bg-[#F0F7F2] dark:bg-[#0f2a18]' : ''}`}
                >
                  <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-medium ${
                    isToday  ? 'bg-[#4A7C59] text-white'
                    : isPast ? 'text-[#9ca3af]'
                    :          'text-[#1A1A1A] dark:text-white'
                  }`}>
                    {date.getDate()}
                  </span>

                  {events.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {events.slice(0, 3).map(({ schedule, plant, status, projected }, j) => {
                        const cfg = ACTION[schedule.action_type]
                        const Icon = cfg.icon
                        const cls = projected
                          ? cfg.badgeProjected
                          : status === 'overdue' ? 'bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400'
                          : status === 'today'   ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400'
                          : cfg.badge
                        return (
                          <span key={j} title={`${plant.nickname} – ${t(cfg.labelKey)}`}
                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium leading-none ${cls} ${projected ? 'border border-dashed border-current' : ''}`}>
                            <Icon className="w-2.5 h-2.5" />
                            <span className="max-w-[44px] truncate">{plant.nickname}</span>
                          </span>
                        )
                      })}
                      {events.length > 3 && (
                        <span className="text-[10px] text-[#6B7280] self-center">+{events.length - 3}</span>
                      )}
                    </div>
                  )}

                  <AnimatePresence>
                    {isSelected && events.length > 0 && (
                      <DayPopover date={date} events={events} onLog={handleLog} logging={logCare.isPending} onClose={() => setSelectedDay(null)} locale={locale} t={t} />
                    )}
                  </AnimatePresence>
                </div>
              )
            })}
          </div>
        )}

        {/* ── WEEK VIEW ── */}
        {view === 'week' && (
          <div className="grid grid-cols-7 min-h-[400px]">
            {weekDays.map(date => {
              const dateStr = toDateStr(date)
              const isToday = dateStr === todayStr
              const events  = eventMap[dateStr] ?? []
              const isSelected = selectedDay === dateStr

              return (
                <div key={dateStr}
                  className={`relative border-r border-[#E5EDE8] dark:border-[#2a3d2f] p-2 ${isToday ? 'bg-[#F0F7F2] dark:bg-[#0f2a18]' : ''} ${isSelected ? 'ring-2 ring-inset ring-[#4A7C59]/30' : ''}`}
                >
                  {/* Day number */}
                  <div className="flex justify-center mb-2">
                    <span className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-semibold ${
                      isToday ? 'bg-[#4A7C59] text-white' : 'text-[#1A1A1A] dark:text-white'
                    }`}>
                      {date.getDate()}
                    </span>
                  </div>

                  {/* Events */}
                  <div className="space-y-1.5">
                    {events.map(({ plant, schedule, status, projected }, j) => {
                      const cfg = ACTION[schedule.action_type]
                      const Icon = cfg.icon
                      const canLog = (status === 'today' || status === 'overdue') && !projected
                      const cls = projected
                        ? cfg.badgeProjected
                        : status === 'overdue' ? 'bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400'
                        : status === 'today'   ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400'
                        : cfg.badge

                      return (
                        <div key={j}
                          className={`rounded-xl p-1.5 ${cls} ${projected ? 'border border-dashed border-current' : ''}`}
                        >
                          <div className="flex items-center gap-1.5 mb-1">
                            {plant.photo_url ? (
                              <img src={plant.photo_url} alt={plant.nickname} className="w-5 h-5 rounded-md object-cover flex-shrink-0" />
                            ) : (
                              <Leaf className="w-3.5 h-3.5 flex-shrink-0" />
                            )}
                            <span className="text-[10px] font-semibold truncate">{plant.nickname}</span>
                          </div>
                          <div className="flex items-center justify-between gap-1">
                            <div className="flex items-center gap-1">
                              <Icon className="w-2.5 h-2.5" />
                              <span className="text-[9px]">{t(cfg.labelKey)}{projected ? ` ${t('calendar.estimated').slice(0,4).toLowerCase()}.` : ''}</span>
                            </div>
                            {canLog && (
                              <button
                                onClick={() => handleLog(schedule, plant)}
                                disabled={logCare.isPending}
                                className="text-[9px] px-1.5 py-0.5 bg-[#4A7C59] text-white rounded-full font-medium disabled:opacity-60"
                                title={t('calendar.done')}
                              >
                                ✓
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 px-1">
        {legendItems.map(({ cls, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${cls}`}>{label}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium border border-dashed border-[#4A7C59] text-[#4A7C59] opacity-60">{t('calendar.estimated')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400">{t('care.overdue')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">{t('care.dueToday')}</span>
        </div>
      </div>

      <AddPlantModal open={addPlantOpen} onClose={() => setAddPlantOpen(false)} />
    </div>
  )
}
