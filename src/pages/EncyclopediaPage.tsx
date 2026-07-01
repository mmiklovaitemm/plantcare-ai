import { useState, useCallback, memo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Leaf, Loader2, Droplets, Sun, X, MessageSquare } from 'lucide-react'
import { searchPerenual, getPlantImage, parseCareData, type PerenualSpecies } from '../lib/perenual'
import { useAddPlant } from '../hooks/usePlants'
import { useAddCareSchedule } from '../hooks/useCareSchedule'
import { useAuth } from '../hooks/useAuth'

const PREFILL_KEY = 'plantcare-ai-prefill'

function PlantImage({ src, alt }: { src: string | null; alt: string }) {
  const [failed, setFailed] = useState(false)

  if (!src || failed) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-3">
        <Leaf className="w-9 h-9 text-[#6BAF7A]" />
        <span className="text-[10px] text-[#6B7280] text-center leading-tight px-1">{alt}</span>
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
      onError={() => setFailed(true)}
    />
  )
}

const MemoPlantImage = memo(PlantImage)

const LT_TO_EN: Record<string, string> = {
  // Fikusai
  'fikusas': 'ficus', 'fikusai': 'ficus',
  // Monstera
  'monstera': 'monstera',
  // Kaktusai
  'kaktusas': 'cactus', 'kaktusai': 'cactus',
  // Orchidėjos
  'orchidėja': 'orchid', 'orchidėjos': 'orchid',
  // Sukulentai
  'sukulentas': 'succulent', 'sukulentai': 'succulent',
  // Alavijas
  'alavijas': 'aloe vera', 'alavijų': 'aloe vera',
  // Palmė
  'palmė': 'palm', 'palmės': 'palm',
  // Sansevieria / uodegė
  'uodegė': 'sansevieria', 'sansevieria': 'sansevieria',
  // Efusas / Drakenė
  'drakenė': 'dracaena',
  // Begonija
  'begonija': 'begonia', 'begonijos': 'begonia',
  // Violetė
  'violetė': 'violet', 'violetės': 'violet',
  // Rožė
  'rožė': 'rose', 'rožės': 'rose',
  // Tulpė
  'tulpė': 'tulip', 'tulpės': 'tulip',
  // Bambusas
  'bambusas': 'bamboo',
  // Paparčiai
  'papartis': 'fern', 'paparčiai': 'fern',
  // Alokazija
  'alokazija': 'alocasia',
  // Kaladijus
  'kaladijus': 'caladium',
  // Potosas
  'potosas': 'pothos',
  // Difenbachija
  'difenbachija': 'dieffenbachia',
  // Spiderfleinas
  'voratinklis': 'spider plant',
  // Lavanda
  'levanda': 'lavender', 'lavanda': 'lavender',
  // Rozmarinas
  'rozmarinas': 'rosemary',
  // Bazilikas
  'bazilikas': 'basil',
  // Mėta
  'mėta': 'mint',
}

function translateQuery(query: string): string {
  const lower = query.toLowerCase().trim()
  return LT_TO_EN[lower] ?? query
}

let debounceTimer: ReturnType<typeof setTimeout>

function debounce(fn: () => void, ms: number) {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(fn, ms)
}

function WateringBadge({ watering }: { watering: string }) {
  const { t } = useTranslation()
  const w = watering?.toLowerCase()
  const config =
    w === 'frequent' ? { labelKey: 'encyclopedia.wateringFrequent', cls: 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400' } :
    w === 'minimum'  ? { labelKey: 'encyclopedia.wateringMinimal',  cls: 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400' } :
    w === 'none'     ? { labelKey: 'encyclopedia.wateringNone',     cls: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400' } :
                       { labelKey: 'encyclopedia.wateringAverage',  cls: 'bg-green-50 text-green-600 dark:bg-green-950/40 dark:text-green-400' }
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${config.cls}`}>{t(config.labelKey)}</span>
  )
}

function ModalImage({ image, name, onClose }: { image: string | null; name: string; onClose: () => void }) {
  const [failed, setFailed] = useState(false)

  if (!image || failed) {
    return (
      <div className="w-full h-36 bg-[#E8F5EC] dark:bg-[#0f2a18] flex items-center justify-center relative">
        <Leaf className="w-12 h-12 text-[#86EFAC]" />
        <button onClick={onClose} className="absolute top-3 right-3 p-1.5 bg-black/20 rounded-lg text-[#4A7C59]">
          <X className="w-4 h-4" />
        </button>
      </div>
    )
  }

  return (
    <div className="w-full h-52 relative">
      <img src={image} alt={name} className="w-full h-full object-cover" onError={() => setFailed(true)} />
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
      <button onClick={onClose} className="absolute top-3 right-3 p-1.5 bg-black/40 rounded-lg text-white">
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

interface DetailModalProps {
  plant: PerenualSpecies
  onClose: () => void
  onAdd: (plant: PerenualSpecies) => void
  onAskAi: (plant: PerenualSpecies) => void
  adding: boolean
  added: boolean
}

function DetailModal({ plant, onClose, onAdd, onAskAi, adding, added }: DetailModalProps) {
  const { t } = useTranslation()
  const image = getPlantImage(plant)
  const care = parseCareData(plant)
  const sunlight = Array.isArray(plant.sunlight) ? plant.sunlight.join(', ') : plant.sunlight

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/40 dark:bg-black/60 z-50 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md z-50 px-4"
      >
        <div className="bg-white dark:bg-[#1a2e1f] rounded-2xl border border-[#E5EDE8] dark:border-[#2a3d2f] shadow-xl overflow-hidden">
          <ModalImage image={image} name={plant.common_name} onClose={onClose} />

          <div className="p-6">
            <h2 className="font-[family-name:var(--font-heading)] text-xl font-bold text-[#1A1A1A] dark:text-white">
              {plant.common_name}
            </h2>
            <p className="text-sm text-[#6B7280] dark:text-[#9ca3af] mt-0.5 italic">
              {plant.scientific_name?.[0]}
            </p>

            <div className="mt-5 space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-[#F0F7F2] dark:bg-[#0f1a13]">
                <Droplets className="w-4 h-4 text-[#4A7C59] flex-shrink-0" />
                <div>
                  <p className="text-xs text-[#6B7280] dark:text-[#9ca3af]">{t('encyclopedia.watering')}</p>
                  <p className="text-sm font-medium text-[#1A1A1A] dark:text-white">{care.wateringLabel}</p>
                </div>
              </div>

              {sunlight && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-[#F0F7F2] dark:bg-[#0f1a13]">
                  <Sun className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-[#6B7280] dark:text-[#9ca3af]">{t('encyclopedia.sunlight')}</p>
                    <p className="text-sm font-medium text-[#1A1A1A] dark:text-white capitalize">{sunlight}</p>
                  </div>
                </div>
              )}

              {plant.cycle && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-[#F0F7F2] dark:bg-[#0f1a13]">
                  <Leaf className="w-4 h-4 text-[#4A7C59] flex-shrink-0" />
                  <div>
                    <p className="text-xs text-[#6B7280] dark:text-[#9ca3af]">{t('encyclopedia.lifeCycle')}</p>
                    <p className="text-sm font-medium text-[#1A1A1A] dark:text-white capitalize">{plant.cycle}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-5 flex flex-col gap-2">
              <button
                onClick={() => onAdd(plant)}
                disabled={adding || added}
                className="w-full py-2.5 rounded-full bg-[#4A7C59] hover:bg-[#3A6647] text-white text-sm font-medium transition-all disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {added ? t('encyclopedia.added') : t('encyclopedia.addToCollection')}
              </button>
              <button
                onClick={() => onAskAi(plant)}
                className="w-full py-2.5 rounded-full border border-[#4A7C59] text-[#4A7C59] hover:bg-[#F0F7F2] dark:hover:bg-[#0f2a18] text-sm font-medium transition-all flex items-center justify-center gap-2"
              >
                <MessageSquare className="w-4 h-4" />
                {t('encyclopedia.askAi')}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  )
}

export default function EncyclopediaPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const navigate = useNavigate()
  const addPlant = useAddPlant()
  const addSchedule = useAddCareSchedule()

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PerenualSpecies[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [selected, setSelected] = useState<PerenualSpecies | null>(null)
  const [addedIds, setAddedIds] = useState<Set<number>>(new Set())

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); setSearched(false); return }
    setLoading(true)
    setSearched(true)
    try {
      const { data } = await searchPerenual(translateQuery(q))
      setResults(data)
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setQuery(val)
    debounce(() => doSearch(val), 500)
  }

  async function handleAdd(plant: PerenualSpecies) {
    if (!user) return
    const care = parseCareData(plant)
    const image = getPlantImage(plant)

    const added = await addPlant.mutateAsync({
      nickname: plant.common_name,
      room: null,
      health_status: 'healthy',
      photo_url: image ?? null,
      api_plant_id: plant.id,
    })

    const today = new Date().toISOString().split('T')[0]
    await addSchedule.mutateAsync({
      plant_id: added.id,
      action_type: 'water',
      interval_days: care.wateringInterval,
      next_due: today,
    })

    setAddedIds(prev => new Set(prev).add(plant.id))
    setSelected(null)
  }

  function handleAskAi(plant: PerenualSpecies) {
    const query = `Tell me about ${plant.common_name} (${plant.scientific_name?.[0] ?? ''}). What are the best care tips, common problems, and how to keep it thriving?`
    localStorage.setItem(PREFILL_KEY, query)
    navigate('/ai')
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="font-[family-name:var(--font-heading)] text-2xl font-bold text-[#1A1A1A] dark:text-white">
          {t('encyclopedia.title')}
        </h1>
        <p className="text-sm text-[#6B7280] dark:text-[#9ca3af] mt-0.5">
          {t('encyclopedia.subtitle')}
        </p>
      </div>

      {/* Search */}
      <div className="relative mb-8">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280]" />
        {loading && (
          <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4A7C59] animate-spin" />
        )}
        <input
          type="text"
          value={query}
          onChange={handleInput}
          placeholder={t('encyclopedia.search')}
          className="w-full pl-11 pr-11 py-3 bg-white dark:bg-[#1a2e1f] border border-[#E5EDE8] dark:border-[#2a3d2f] rounded-2xl text-sm text-[#1A1A1A] dark:text-white placeholder-[#6B7280] focus:outline-none focus:ring-2 focus:ring-[#4A7C59]/30 focus:border-[#4A7C59] transition-all shadow-sm"
        />
      </div>

      {/* Empty state */}
      {!searched && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 bg-[#E8F5EC] dark:bg-[#0f2a18] rounded-2xl flex items-center justify-center mb-4">
            <Search className="w-9 h-9 text-[#86EFAC]" />
          </div>
          <h3 className="font-[family-name:var(--font-heading)] text-lg font-semibold text-[#1A1A1A] dark:text-white mb-1">
            {t('encyclopedia.discoverTitle')}
          </h3>
          <p className="text-sm text-[#6B7280] dark:text-[#9ca3af]">
            {t('encyclopedia.discoverHint')}
          </p>
        </div>
      )}

      {/* No results */}
      {searched && !loading && results.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-sm text-[#6B7280] dark:text-[#9ca3af]">{t('encyclopedia.noResults')}</p>
        </div>
      )}

      {/* Results grid */}
      {results.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {results.map((plant, i) => {
            const image = getPlantImage(plant)
            const isAdded = addedIds.has(plant.id)
            return (
              <motion.div
                key={plant.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => setSelected(plant)}
                className="bg-white dark:bg-[#1a2e1f] rounded-2xl border border-[#E5EDE8] dark:border-[#2a3d2f] overflow-hidden cursor-pointer hover:shadow-md hover:border-[#86EFAC] dark:hover:border-[#4A7C59] transition-all duration-200 group"
              >
                <div className="w-full aspect-square bg-[#E8F5EC] dark:bg-[#0f2a18] flex items-center justify-center overflow-hidden">
                  <MemoPlantImage src={image} alt={plant.common_name} />
                </div>
                <div className="p-3">
                  <h3 className="text-xs font-semibold text-[#1A1A1A] dark:text-white truncate leading-tight">
                    {plant.common_name}
                  </h3>
                  <p className="text-xs text-[#6B7280] dark:text-[#9ca3af] truncate italic mt-0.5">
                    {plant.scientific_name?.[0]}
                  </p>
                  <div className="mt-2 flex items-center justify-between">
                    <WateringBadge watering={plant.watering} />
                    {isAdded && (
                      <span className="text-xs text-[#4A7C59] font-medium">{t('encyclopedia.added')}</span>
                    )}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Detail modal */}
      <AnimatePresence>
        {selected && (
          <DetailModal
            plant={selected}
            onClose={() => setSelected(null)}
            onAdd={handleAdd}
            onAskAi={handleAskAi}
            adding={addPlant.isPending || addSchedule.isPending}
            added={addedIds.has(selected.id)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
