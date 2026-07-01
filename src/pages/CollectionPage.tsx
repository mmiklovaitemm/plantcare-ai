import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Plus, Search, Leaf, Loader2 } from 'lucide-react'
import { usePlants } from '../hooks/usePlants'
import { useCareSchedules } from '../hooks/useCareSchedule'
import PlantCard from '../components/PlantCard'
import AddPlantModal from '../components/AddPlantModal'

export default function CollectionPage() {
  const { t } = useTranslation()
  const { data: plants, isLoading } = usePlants()
  const { data: schedules } = useCareSchedules()
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)

  const filtered = plants?.filter(p =>
    p.nickname.toLowerCase().includes(search.toLowerCase()) ||
    (p.room?.toLowerCase().includes(search.toLowerCase()) ?? false)
  ) ?? []

  return (
    <div className="p-6 max-w-6xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-[family-name:var(--font-heading)] text-2xl font-bold text-[#1A1A1A] dark:text-white">
            {t('collection.title')}
          </h1>
          <p className="text-sm text-[#6B7280] dark:text-[#9ca3af] mt-0.5">
            {t('dashboard.plantsCount', { count: plants?.length ?? 0 })}
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#4A7C59] hover:bg-[#3A6647] text-white rounded-full text-sm font-medium transition-all shadow-sm"
        >
          <Plus className="w-4 h-4" />
          {t('collection.addPlant')}
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280]" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t('collection.searchPlants')}
          className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#1a1c20] border border-[#E5EDE8] dark:border-[#2b2e35] rounded-xl text-sm text-[#1A1A1A] dark:text-white placeholder-[#6B7280] focus:outline-none focus:ring-2 focus:ring-[#4A7C59]/30 focus:border-[#4A7C59] transition-all"
        />
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-6 h-6 text-[#4A7C59] animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-24 text-center"
        >
          <div className="w-20 h-20 bg-[#E8F5EC] dark:bg-[#22252c] rounded-2xl flex items-center justify-center mb-4">
            <Leaf className="w-10 h-10 text-[#86EFAC]" />
          </div>
          <h3 className="font-[family-name:var(--font-heading)] text-lg font-semibold text-[#1A1A1A] dark:text-white mb-1">
            {search ? t('collection.noResults') : 'No plants yet'}
          </h3>
          <p className="text-sm text-[#6B7280] dark:text-[#9ca3af] mb-6">
            {search ? t('collection.tryDifferent') : t('collection.empty')}
          </p>
          {!search && (
            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#4A7C59] hover:bg-[#3A6647] text-white rounded-full text-sm font-medium transition-all"
            >
              <Plus className="w-4 h-4" />
              {t('collection.addPlant')}
            </button>
          )}
        </motion.div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filtered.map(plant => (
            <PlantCard
              key={plant.id}
              plant={plant}
              waterSchedule={schedules?.find(s => s.plant_id === plant.id && s.action_type === 'water')}
            />
          ))}
        </div>
      )}

      <AddPlantModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  )
}
