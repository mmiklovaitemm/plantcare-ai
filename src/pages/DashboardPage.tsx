import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Leaf, Droplets, CheckCircle2, AlertTriangle, HeartPulse, Sprout } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { usePlants } from '../hooks/usePlants'
import { useCareSchedules, useLogCare } from '../hooks/useCareSchedule'
import { supabase } from '../lib/supabase'
import AiSummaryWidget from '../components/AiSummaryWidget'

function getGreeting(t: (k: string) => string): string {
  const hour = new Date().getHours()
  if (hour < 12) return t('dashboard.greeting_morning')
  if (hour < 18) return t('dashboard.greeting_afternoon')
  return t('dashboard.greeting_evening')
}

function daysFromToday(dateStr: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dateStr)
  due.setHours(0, 0, 0, 0)
  return Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.4 } }),
}

export default function DashboardPage() {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const { data: plants } = usePlants()
  const { data: schedules } = useCareSchedules()
  const logCare = useLogCare()
  const [displayName, setDisplayName] = useState('')

  useEffect(() => {
    if (!user) return
    supabase
      .from('users')
      .select('name')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data?.name) setDisplayName(data.name)
      })
  }, [user])

  const today = new Date().toISOString().split('T')[0]

  const totalPlants = plants?.length ?? 0
  const healthyCount = plants?.filter(p => p.health_status === 'healthy').length ?? 0
  const attentionCount = plants?.filter(p => p.health_status !== 'healthy').length ?? 0

  const waterSchedules = schedules?.filter(s => s.action_type === 'water') ?? []

  const todayTasks = waterSchedules
    .filter(s => s.next_due <= today)
    .map(s => ({
      schedule: s,
      plant: plants?.find(p => p.id === s.plant_id),
      days: daysFromToday(s.next_due),
    }))
    .filter(t => t.plant)
    .sort((a, b) => a.days - b.days)

  const upcomingTasks = waterSchedules
    .filter(s => s.next_due > today)
    .map(s => ({
      schedule: s,
      plant: plants?.find(p => p.id === s.plant_id),
      days: daysFromToday(s.next_due),
    }))
    .filter(t => t.plant && t.days <= 7)
    .sort((a, b) => a.days - b.days)
    .slice(0, 5)

  async function handleWater(scheduleId: string, plantId: string, intervalDays: number) {
    await logCare.mutateAsync({
      plant_id: plantId,
      action_type: 'water',
      schedule_id: scheduleId,
      interval_days: intervalDays,
    })
  }

  const greeting = getGreeting(t)
  const firstName = displayName || user?.email?.split('@')[0] || ''

  return (
    <div className="p-6 max-w-5xl mx-auto">

      {/* Greeting */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-8"
      >
        <h1 className="font-[family-name:var(--font-heading)] text-3xl font-bold text-[#1A1A1A] dark:text-white">
          {greeting}{firstName ? `, ${firstName}` : ''}
        </h1>
        <p className="text-[#6B7280] dark:text-[#9ca3af] mt-1">
          {todayTasks.length === 0
            ? t('dashboard.noTasksToday')
            : t('dashboard.plantsNeedWatering', { count: todayTasks.length })}
        </p>
      </motion.div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          {
            icon: <Sprout className="w-5 h-5" />,
            value: totalPlants,
            label: t('dashboard.totalPlants'),
            color: 'text-[#4A7C59]',
            bg: 'bg-[#E8F5EC] dark:bg-[#22252c]',
          },
          {
            icon: <HeartPulse className="w-5 h-5" />,
            value: healthyCount,
            label: t('dashboard.healthy'),
            color: 'text-green-600 dark:text-green-400',
            bg: 'bg-green-50 dark:bg-green-950/30',
          },
          {
            icon: <AlertTriangle className="w-5 h-5" />,
            value: attentionCount,
            label: t('dashboard.needsAttention'),
            color: 'text-amber-600 dark:text-amber-400',
            bg: 'bg-amber-50 dark:bg-amber-950/30',
          },
        ].map((stat, i) => (
          <motion.div
            key={i}
            custom={i}
            initial="hidden"
            animate="visible"
            variants={cardVariants}
            className="bg-white dark:bg-[#1a1c20] rounded-2xl border border-[#E5EDE8] dark:border-[#2b2e35] p-5"
          >
            <div className={`inline-flex p-2.5 rounded-xl mb-3 ${stat.bg}`}>
              <span className={stat.color}>{stat.icon}</span>
            </div>
            <p className="text-2xl font-bold text-[#1A1A1A] dark:text-white">{stat.value}</p>
            <p className="text-xs text-[#6B7280] dark:text-[#9ca3af] mt-0.5">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="mb-6">
        <AiSummaryWidget
          plants={(plants ?? []).map(p => ({ id: p.id, nickname: p.nickname, health_status: p.health_status }))}
          schedules={(schedules ?? []).map(s => ({ plant_id: s.plant_id, action_type: s.action_type, next_due: s.next_due }))}
          isLt={i18n.language.startsWith('lt')}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Today's tasks */}
        <motion.div
          custom={3}
          initial="hidden"
          animate="visible"
          variants={cardVariants}
          className="bg-white dark:bg-[#1a1c20] rounded-2xl border border-[#E5EDE8] dark:border-[#2b2e35] p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <Droplets className="w-4 h-4 text-[#4A7C59]" />
            <h2 className="font-semibold text-[#1A1A1A] dark:text-white text-sm">{t('dashboard.todaysTasks')}</h2>
          </div>

          {todayTasks.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center">
              <div className="w-12 h-12 bg-[#E8F5EC] dark:bg-[#22252c] rounded-2xl flex items-center justify-center mb-3">
                <CheckCircle2 className="w-6 h-6 text-[#4A7C59]" />
              </div>
              <p className="text-sm font-medium text-[#1A1A1A] dark:text-white">{t('dashboard.noTasksToday')}</p>
              <p className="text-xs text-[#6B7280] dark:text-[#9ca3af] mt-1">{t('dashboard.allTakenCareOf')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {todayTasks.map(({ schedule, plant, days }) => (
                <div
                  key={schedule.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-[#F0F7F2] dark:bg-[#101114] border border-[#E5EDE8] dark:border-[#2b2e35]"
                >
                  {plant?.photo_url ? (
                    <img src={plant.photo_url} alt={plant?.nickname} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-[#E8F5EC] dark:bg-[#22252c] flex items-center justify-center flex-shrink-0">
                      <Leaf className="w-5 h-5 text-[#86EFAC]" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#1A1A1A] dark:text-white truncate">{plant?.nickname}</p>
                    <p className={`text-xs ${days < 0 ? 'text-red-500 dark:text-red-400' : 'text-amber-500 dark:text-amber-400'}`}>
                      {days < 0 ? t('care.overdueBy', { count: Math.abs(days) }) : t('care.dueToday')}
                    </p>
                  </div>
                  <button
                    onClick={() => handleWater(schedule.id, schedule.plant_id, schedule.interval_days)}
                    disabled={logCare.isPending}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#4A7C59] hover:bg-[#3A6647] text-white rounded-full text-xs font-medium transition-all disabled:opacity-60 flex-shrink-0"
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    {t('dashboard.waterNow')}
                  </button>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Upcoming watering */}
        <motion.div
          custom={4}
          initial="hidden"
          animate="visible"
          variants={cardVariants}
          className="bg-white dark:bg-[#1a1c20] rounded-2xl border border-[#E5EDE8] dark:border-[#2b2e35] p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <Leaf className="w-4 h-4 text-[#4A7C59]" />
            <h2 className="font-semibold text-[#1A1A1A] dark:text-white text-sm">{t('dashboard.weekOverview')}</h2>
          </div>

          {upcomingTasks.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center">
              <p className="text-sm text-[#6B7280] dark:text-[#9ca3af]">{t('dashboard.noUpcoming')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {upcomingTasks.map(({ schedule, plant, days }) => (
                <div
                  key={schedule.id}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#F0F7F2] dark:hover:bg-[#101114] transition-colors"
                >
                  {plant?.photo_url ? (
                    <img src={plant.photo_url} alt={plant?.nickname} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-[#E8F5EC] dark:bg-[#22252c] flex items-center justify-center flex-shrink-0">
                      <Leaf className="w-5 h-5 text-[#86EFAC]" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#1A1A1A] dark:text-white truncate">{plant?.nickname}</p>
                    <p className="text-xs text-[#6B7280] dark:text-[#9ca3af]">
                      {days === 1 ? t('dashboard.tomorrow') : t('dashboard.inDaysFull', { count: days })}
                    </p>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-[#E8F5EC] dark:bg-[#22252c] flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-[#4A7C59]">{days}d</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

      </div>
    </div>
  )
}
