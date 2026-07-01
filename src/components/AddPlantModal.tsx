import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Leaf, Loader2, Camera, Sparkles, CheckCircle2, Droplets } from 'lucide-react'
import { useAddPlant } from '../hooks/usePlants'
import { useAddCareSchedule } from '../hooks/useCareSchedule'
import { identifyPlant } from '../lib/plantnet'
import { getPlantCareData } from '../lib/perenual'
import { uploadPlantPhoto } from '../lib/storage'
import { useAuth } from '../hooks/useAuth'
import type { Plant } from '../types'

const ROOM_KEYS = [
  { value: 'Living room', key: 'addPlant.rooms.livingRoom' },
  { value: 'Bedroom', key: 'addPlant.rooms.bedroom' },
  { value: 'Kitchen', key: 'addPlant.rooms.kitchen' },
  { value: 'Bathroom', key: 'addPlant.rooms.bathroom' },
  { value: 'Office', key: 'addPlant.rooms.office' },
  { value: 'Balcony', key: 'addPlant.rooms.balcony' },
]
const WATER_INTERVALS = [
  { days: 2, key: 'addPlant.intervals.every2Days' },
  { days: 3, key: 'addPlant.intervals.every3Days' },
  { days: 7, key: 'addPlant.intervals.onceAWeek' },
  { days: 10, key: 'addPlant.intervals.every10Days' },
  { days: 14, key: 'addPlant.intervals.every2Weeks' },
  { days: 30, key: 'addPlant.intervals.onceAMonth' },
]

interface Props {
  open: boolean
  onClose: () => void
}

export default function AddPlantModal({ open, onClose }: Props) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const addPlant = useAddPlant()
  const addSchedule = useAddCareSchedule()
  const fileRef = useRef<HTMLInputElement>(null)

  const [nickname, setNickname] = useState('')
  const [room, setRoom] = useState('')
  const [health, setHealth] = useState<Plant['health_status']>('healthy')
  const [waterInterval, setWaterInterval] = useState(7)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [identifying, setIdentifying] = useState(false)
  const [suggestions, setSuggestions] = useState<{ name: string; score: number; scientificName: string }[]>([])
  const [identifyError, setIdentifyError] = useState<string | null>(null)
  const [careHint, setCareHint] = useState<string | null>(null)

  function reset() {
    setNickname('')
    setRoom('')
    setHealth('healthy')
    setWaterInterval(7)
    setPhotoFile(null)
    setPhotoPreview(null)
    setSuggestions([])
    setIdentifyError(null)
    setCareHint(null)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
    setSuggestions([])
    setIdentifyError(null)
  }

  async function handleIdentify() {
    if (!photoFile) return
    setIdentifying(true)
    setIdentifyError(null)
    setCareHint(null)
    try {
      const results = await identifyPlant(photoFile)
      const mapped = results.map(r => ({
        name: r.species.commonNames[0] ?? r.species.scientificNameWithoutAuthor,
        score: Math.round(r.score * 100),
        scientificName: r.species.scientificNameWithoutAuthor,
      }))
      setSuggestions(mapped)
      if (mapped[0] && !nickname) setNickname(mapped[0].name)

      if (mapped[0]) {
        const care = await getPlantCareData(mapped[0].scientificName)
        if (care) {
          setWaterInterval(care.wateringInterval)
          setCareHint(t('addPlant.aiSuggestedCare', { label: care.wateringLabel }))
        }
      }
    } catch {
      setIdentifyError(t('addPlant.identifyError'))
    } finally {
      setIdentifying(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    let photoUrl: string | null = null
    if (photoFile && user) {
      photoUrl = await uploadPlantPhoto(photoFile, user.id)
    }

    const plant = await addPlant.mutateAsync({
      nickname,
      room: room || null,
      health_status: health,
      photo_url: photoUrl,
      api_plant_id: null,
    })

    const today = new Date().toISOString().split('T')[0]
    await addSchedule.mutateAsync({
      plant_id: plant.id,
      action_type: 'water',
      interval_days: waterInterval,
      next_due: today,
    })

    reset()
    onClose()
  }

  const isPending = addPlant.isPending || addSchedule.isPending

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 dark:bg-black/60 z-50 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md z-50 px-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="bg-white dark:bg-[#1a2e1f] rounded-2xl border border-[#E5EDE8] dark:border-[#2a3d2f] shadow-xl p-6">

              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-[#E8F5EC] dark:bg-[#0f2a18] rounded-xl flex items-center justify-center">
                    <Leaf className="w-5 h-5 text-[#4A7C59]" />
                  </div>
                  <h2 className="font-[family-name:var(--font-heading)] text-lg font-bold text-[#1A1A1A] dark:text-white">
                    {t('collection.addPlant')}
                  </h2>
                </div>
                <button onClick={onClose} className="p-1.5 rounded-lg text-[#6B7280] hover:bg-[#F0F7F2] dark:hover:bg-[#0f1a13] transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">

                {/* Photo */}
                <div>
                  <label className="block text-sm font-medium text-[#1A1A1A] dark:text-white mb-2">
                    {t('addPlant.photoLabel')} <span className="text-[#6B7280] font-normal">{t('addPlant.photoHint')}</span>
                  </label>
                  <input ref={fileRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />

                  {photoPreview ? (
                    <div className="relative">
                      <img src={photoPreview} alt="preview" className="w-full h-48 object-cover rounded-xl border border-[#E5EDE8] dark:border-[#2a3d2f]" />
                      <button type="button" onClick={() => { setPhotoFile(null); setPhotoPreview(null); setSuggestions([]) }}
                        className="absolute top-2 right-2 p-1 bg-black/50 rounded-lg text-white">
                        <X className="w-3.5 h-3.5" />
                      </button>
                      <button type="button" onClick={handleIdentify} disabled={identifying}
                        className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-4 py-1.5 bg-[#4A7C59] hover:bg-[#3A6647] text-white rounded-full text-xs font-medium transition-all disabled:opacity-60 shadow-lg">
                        {identifying
                          ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> {t('addPlant.identifying')}</>
                          : <><Sparkles className="w-3.5 h-3.5" /> {t('addPlant.identifyWithAi')}</>}
                      </button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => fileRef.current?.click()}
                      className="w-full h-36 border-2 border-dashed border-[#E5EDE8] dark:border-[#2a3d2f] rounded-xl flex flex-col items-center justify-center gap-2 text-[#6B7280] dark:text-[#9ca3af] hover:border-[#4A7C59] hover:text-[#4A7C59] transition-all">
                      <Camera className="w-6 h-6" />
                      <span className="text-sm">{t('addPlant.uploadPhoto')}</span>
                      <span className="text-xs">{t('addPlant.fileTypes')}</span>
                    </button>
                  )}

                  <AnimatePresence>
                    {suggestions.length > 0 && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-3 space-y-1.5">
                        <p className="text-xs text-[#6B7280] dark:text-[#9ca3af] font-medium">{t('addPlant.aiSuggestions')}</p>
                        {suggestions.map((s, i) => (
                          <button key={i} type="button" onClick={() => setNickname(s.name)}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl border text-sm transition-all ${nickname === s.name ? 'border-[#4A7C59] bg-[#E8F5EC] dark:bg-[#0f2a18] text-[#4A7C59]' : 'border-[#E5EDE8] dark:border-[#2a3d2f] text-[#1A1A1A] dark:text-white hover:border-[#4A7C59]'}`}>
                            <span className="flex items-center gap-2">
                              {nickname === s.name && <CheckCircle2 className="w-3.5 h-3.5" />}
                              {s.name}
                            </span>
                            <span className="text-xs text-[#6B7280]">{s.score}%</span>
                          </button>
                        ))}
                      </motion.div>
                    )}
                    {identifyError && (
                      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2 text-xs text-red-500 bg-red-50 dark:bg-red-950/30 px-3 py-2 rounded-lg">
                        {identifyError}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>

                {/* Nickname */}
                <div>
                  <label className="block text-sm font-medium text-[#1A1A1A] dark:text-white mb-1.5">
                    {t('addPlant.nameLabel')} <span className="text-red-400">*</span>
                  </label>
                  <input type="text" value={nickname} onChange={e => setNickname(e.target.value)} required
                    placeholder={t('addPlant.namePlaceholder')}
                    className="w-full px-4 py-2.5 border border-[#E5EDE8] dark:border-[#2a3d2f] rounded-xl text-sm text-[#1A1A1A] dark:text-white bg-white dark:bg-[#0f1a13] placeholder-[#6B7280] focus:outline-none focus:ring-2 focus:ring-[#4A7C59]/30 focus:border-[#4A7C59] transition-all" />
                </div>

                {/* Watering interval */}
                <div>
                  <label className="block text-sm font-medium text-[#1A1A1A] dark:text-white mb-2">
                    <span className="flex items-center gap-1.5"><Droplets className="w-4 h-4 text-[#86EFAC]" /> {t('addPlant.wateringSchedule')}</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {WATER_INTERVALS.map(({ days, key }) => (
                      <button key={days} type="button" onClick={() => setWaterInterval(days)}
                        className={`py-2 px-2 rounded-xl text-xs font-medium border transition-all text-center ${waterInterval === days ? 'bg-[#4A7C59] text-white border-[#4A7C59]' : 'border-[#E5EDE8] dark:border-[#2a3d2f] text-[#6B7280] dark:text-[#9ca3af] hover:border-[#4A7C59] hover:text-[#4A7C59]'}`}>
                        {t(key)}
                      </button>
                    ))}
                  </div>
                  {careHint && (
                    <p className="mt-2 text-xs text-[#4A7C59] dark:text-[#86EFAC] flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 flex-shrink-0" />
                      {careHint}
                    </p>
                  )}
                </div>

                {/* Room */}
                <div>
                  <label className="block text-sm font-medium text-[#1A1A1A] dark:text-white mb-2">{t('collection.room')}</label>
                  <div className="flex flex-wrap gap-2">
                    {ROOM_KEYS.map(({ value, key }) => (
                      <button key={value} type="button" onClick={() => setRoom(room === value ? '' : value)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${room === value ? 'bg-[#4A7C59] text-white border-[#4A7C59]' : 'border-[#E5EDE8] dark:border-[#2a3d2f] text-[#6B7280] dark:text-[#9ca3af] hover:border-[#4A7C59] hover:text-[#4A7C59]'}`}>
                        {t(key)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Health */}
                <div>
                  <label className="block text-sm font-medium text-[#1A1A1A] dark:text-white mb-2">{t('collection.health')}</label>
                  <div className="flex gap-2">
                    {([
                      { value: 'healthy', key: 'health.healthy', cls: 'text-green-600 border-green-200 bg-green-50 dark:bg-green-950/30 dark:border-green-900' },
                      { value: 'needs_attention', key: 'health.needsAttention', cls: 'text-amber-600 border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900' },
                      { value: 'critical', key: 'health.critical', cls: 'text-red-600 border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900' },
                    ] as const).map(({ value, key, cls }) => (
                      <button key={value} type="button" onClick={() => setHealth(value)}
                        className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-all ${health === value ? cls + ' ring-2 ring-offset-1 ring-[#4A7C59]/30' : 'border-[#E5EDE8] dark:border-[#2a3d2f] text-[#6B7280] dark:text-[#9ca3af]'}`}>
                        {t(key)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => { reset(); onClose() }}
                    className="flex-1 py-2.5 rounded-full border border-[#E5EDE8] dark:border-[#2a3d2f] text-sm font-medium text-[#6B7280] dark:text-[#9ca3af] hover:bg-[#F0F7F2] dark:hover:bg-[#0f1a13] transition-all">
                    {t('common.cancel')}
                  </button>
                  <button type="submit" disabled={isPending}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full bg-[#4A7C59] hover:bg-[#3A6647] text-white text-sm font-medium transition-all disabled:opacity-60">
                    {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : t('common.save')}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
