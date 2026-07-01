import { useTranslation } from 'react-i18next'
import { Trash2, Droplets, Leaf, CheckCircle2 } from 'lucide-react'
import { useDeletePlant } from '../hooks/usePlants'
import { useLogCare } from '../hooks/useCareSchedule'
import type { Plant, CareSchedule } from '../types'

const healthConfig = {
  healthy: { labelKey: 'health.healthy', dot: 'bg-green-400', text: 'text-green-600 dark:text-green-400' },
  needs_attention: { labelKey: 'health.needsAttention', dot: 'bg-amber-400', text: 'text-amber-600 dark:text-amber-400' },
  critical: { labelKey: 'health.critical', dot: 'bg-red-400', text: 'text-red-600 dark:text-red-400' },
}

function getCareStatus(nextDue: string): 'overdue' | 'today' | 'upcoming' {
  const today = new Date().toISOString().split('T')[0]
  if (nextDue < today) return 'overdue'
  if (nextDue === today) return 'today'
  return 'upcoming'
}

function daysUntil(nextDue: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(nextDue)
  due.setHours(0, 0, 0, 0)
  return Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

interface Props {
  plant: Plant
  waterSchedule?: CareSchedule
}

export default function PlantCard({ plant, waterSchedule }: Props) {
  const { t } = useTranslation()
  const deletePlant = useDeletePlant()
  const logCare = useLogCare()
  const health = healthConfig[plant.health_status]

  const careStatus = waterSchedule ? getCareStatus(waterSchedule.next_due) : null
  const days = waterSchedule ? daysUntil(waterSchedule.next_due) : null

  const careLabel =
    careStatus === 'overdue' ? t('care.overdueBy', { count: Math.abs(days!) }) :
    careStatus === 'today'   ? t('care.waterToday') :
    days !== null            ? t('dashboard.inDays', { count: days }) : null

  const careColor =
    careStatus === 'overdue' ? 'text-red-500 dark:text-red-400' :
    careStatus === 'today'   ? 'text-amber-500 dark:text-amber-400' :
    'text-[#6B7280] dark:text-[#9ca3af]'

  async function handleWater(e: React.MouseEvent) {
    e.stopPropagation()
    if (!waterSchedule) return
    await logCare.mutateAsync({
      plant_id: plant.id,
      action_type: 'water',
      schedule_id: waterSchedule.id,
      interval_days: waterSchedule.interval_days,
    })
  }

  return (
    <div className="group bg-white dark:bg-[#1a2e1f] rounded-2xl border border-[#E5EDE8] dark:border-[#2a3d2f] p-5 hover:shadow-md hover:border-[#86EFAC] dark:hover:border-[#4A7C59] transition-all duration-200"
    >
      {/* Photo */}
      <div className="w-full aspect-square rounded-xl bg-[#F0F7F2] dark:bg-[#0f1a13] flex items-center justify-center mb-4 overflow-hidden relative">
        {plant.photo_url ? (
          <img src={plant.photo_url} alt={plant.nickname} className="w-full h-full object-cover" />
        ) : (
          <Leaf className="w-10 h-10 text-[#86EFAC]" />
        )}

        {/* Delete btn */}
        <button
          onClick={() => deletePlant.mutate(plant.id)}
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-white/80 dark:bg-black/50 text-[#6B7280] hover:text-red-500 transition-all"
          aria-label="Delete"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Name + room */}
      <h3 className="font-semibold text-[#1A1A1A] dark:text-white text-sm truncate">{plant.nickname}</h3>
      {plant.room && <p className="text-xs text-[#6B7280] dark:text-[#9ca3af] mt-0.5">{plant.room}</p>}

      {/* Health */}
      <div className={`flex items-center gap-1.5 mt-2 ${health.text}`}>
        <span className={`w-2 h-2 rounded-full ${health.dot}`} />
        <span className="text-xs font-medium">{t(health.labelKey)}</span>
      </div>

      {/* Care status + water button */}
      {waterSchedule ? (
        <div className="mt-3 flex items-center justify-between">
          <div className={`flex items-center gap-1.5 text-xs font-medium ${careColor}`}>
            <Droplets className="w-3.5 h-3.5" />
            {careLabel}
          </div>
          {(careStatus === 'today' || careStatus === 'overdue') && (
            <button
              onClick={handleWater}
              disabled={logCare.isPending}
              className="flex items-center gap-1 px-2.5 py-1 bg-[#4A7C59] hover:bg-[#3A6647] text-white rounded-full text-xs font-medium transition-all disabled:opacity-60"
            >
              <CheckCircle2 className="w-3 h-3" />
              {t('care.done')}
            </button>
          )}
        </div>
      ) : (
        <p className="mt-3 text-xs text-[#6B7280] dark:text-[#9ca3af]">{t('care.noSchedule')}</p>
      )}
    </div>
  )
}
