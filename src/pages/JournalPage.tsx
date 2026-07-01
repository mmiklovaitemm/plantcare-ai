import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Leaf, Camera, X, Loader2, Trash2, BookOpen, ChevronDown } from 'lucide-react'
import { useJournalEntries, useAddJournalEntry, useDeleteJournalEntry } from '../hooks/useJournal'
import { usePlants } from '../hooks/usePlants'
import { uploadPlantPhoto } from '../lib/storage'
import { useAuth } from '../hooks/useAuth'

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const d = Math.floor(diff / 86400000)
  const h = Math.floor(diff / 3600000)
  const m = Math.floor(diff / 60000)
  if (d > 30) return new Date(dateStr).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })
  if (d > 0) return `${d}d ago`
  if (h > 0) return `${h}h ago`
  if (m > 0) return `${m}m ago`
  return 'Just now'
}

// ─── Add Entry Modal ──────────────────────────────────────────────────────────
interface AddModalProps {
  onClose: () => void
}

function AddEntryModal({ onClose }: AddModalProps) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { data: plants } = usePlants()
  const addEntry = useAddJournalEntry()
  const fileRef = useRef<HTMLInputElement>(null)

  const [plantId, setPlantId] = useState('')
  const [notes, setNotes] = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!plantId) return
    setSaving(true)
    let photoUrl: string | null = null
    if (photoFile && user) {
      photoUrl = await uploadPlantPhoto(photoFile, user.id)
    }
    await addEntry.mutateAsync({ plant_id: plantId, photo_url: photoUrl, notes: notes || null })
    setSaving(false)
    onClose()
  }

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} className="fixed inset-0 bg-black/40 dark:bg-black/60 z-50 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md z-50 px-4"
      >
        <div className="bg-white dark:bg-[#1a1c20] rounded-2xl border border-[#E5EDE8] dark:border-[#2b2e35] shadow-xl p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-[#E8F5EC] dark:bg-[#22252c] rounded-xl flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-[#4A7C59]" />
              </div>
              <h2 className="font-[family-name:var(--font-heading)] text-lg font-bold text-[#1A1A1A] dark:text-white">
                {t('journal.addEntry')}
              </h2>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg text-[#6B7280] hover:bg-[#F0F7F2] dark:hover:bg-[#101114] transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Plant selector */}
            <div>
              <label className="block text-xs font-medium text-[#6B7280] dark:text-[#9ca3af] mb-2 uppercase tracking-wide">
                Plant <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <select
                  value={plantId}
                  onChange={e => setPlantId(e.target.value)}
                  required
                  className="w-full appearance-none px-4 py-2.5 border border-[#E5EDE8] dark:border-[#2b2e35] rounded-xl text-sm text-[#1A1A1A] dark:text-white bg-white dark:bg-[#101114] focus:outline-none focus:ring-2 focus:ring-[#4A7C59]/30 focus:border-[#4A7C59] transition-all pr-10"
                >
                  <option value="">{t('journal.selectPlant')}</option>
                  {plants?.map(p => (
                    <option key={p.id} value={p.id}>{p.nickname}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280] pointer-events-none" />
              </div>
            </div>

            {/* Photo */}
            <div>
              <label className="block text-xs font-medium text-[#6B7280] dark:text-[#9ca3af] mb-2 uppercase tracking-wide">
                {t('journal.photo')} <span className="font-normal normal-case">(optional)</span>
              </label>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
              {photoPreview ? (
                <div className="relative">
                  <img src={photoPreview} alt="preview" className="w-full h-44 object-cover rounded-xl border border-[#E5EDE8] dark:border-[#2b2e35]" />
                  <button type="button" onClick={() => { setPhotoFile(null); setPhotoPreview(null) }}
                    className="absolute top-2 right-2 p-1 bg-black/50 rounded-lg text-white">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => fileRef.current?.click()}
                  className="w-full h-32 border-2 border-dashed border-[#E5EDE8] dark:border-[#2b2e35] rounded-xl flex flex-col items-center justify-center gap-2 text-[#6B7280] hover:border-[#4A7C59] hover:text-[#4A7C59] transition-all">
                  <Camera className="w-6 h-6" />
                  <span className="text-sm">{t('journal.uploadPhoto')}</span>
                </button>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-medium text-[#6B7280] dark:text-[#9ca3af] mb-2 uppercase tracking-wide">
                {t('journal.notes')} <span className="font-normal normal-case">(optional)</span>
              </label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder={t('journal.notesPlaceholder')}
                rows={3}
                className="w-full px-4 py-2.5 border border-[#E5EDE8] dark:border-[#2b2e35] rounded-xl text-sm text-[#1A1A1A] dark:text-white bg-white dark:bg-[#101114] placeholder-[#6B7280] focus:outline-none focus:ring-2 focus:ring-[#4A7C59]/30 focus:border-[#4A7C59] transition-all resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose}
                className="flex-1 py-2.5 rounded-full border border-[#E5EDE8] dark:border-[#2b2e35] text-sm font-medium text-[#6B7280] hover:bg-[#F0F7F2] dark:hover:bg-[#101114] transition-all">
                {t('common.cancel')}
              </button>
              <button type="submit" disabled={saving || !plantId}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full bg-[#4A7C59] hover:bg-[#3A6647] text-white text-sm font-medium transition-all disabled:opacity-60">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {t('common.save')}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </>
  )
}

// ─── Journal Entry Card ───────────────────────────────────────────────────────
function EntryCard({ entry, onDelete }: {
  entry: ReturnType<typeof useJournalEntries>['data'] extends (infer T)[] | undefined ? T : never
  onDelete: (id: string) => void
}) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-[#1a1c20] rounded-2xl border border-[#E5EDE8] dark:border-[#2b2e35] overflow-hidden group hover:shadow-md hover:border-[#86EFAC] dark:hover:border-[#4A7C59] transition-all duration-200"
    >
      {/* Photo */}
      {entry.photo_url && (
        <div className="relative w-full aspect-[4/3] overflow-hidden">
          <img
            src={entry.photo_url}
            alt="journal"
            className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 cursor-pointer ${expanded ? '' : ''}`}
            onClick={() => setExpanded(v => !v)}
          />
          <button
            onClick={() => onDelete(entry.id)}
            className="absolute top-2 right-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 p-1.5 bg-black/50 rounded-lg text-white hover:bg-red-500/80 transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="p-4">
        {/* Plant name + time */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            {entry.plants?.photo_url ? (
              <img src={entry.plants.photo_url} alt={entry.plants.nickname} className="w-6 h-6 rounded-lg object-cover shrink-0" />
            ) : (
              <div className="w-6 h-6 rounded-lg bg-[#E8F5EC] dark:bg-[#22252c] flex items-center justify-center shrink-0">
                <Leaf className="w-3 h-3 text-[#86EFAC]" />
              </div>
            )}
            <span className="text-sm font-semibold text-[#1A1A1A] dark:text-white truncate">{entry.plants?.nickname}</span>
          </div>
          <span className="text-xs text-[#6B7280] dark:text-[#9ca3af] whitespace-nowrap shrink-0">{timeAgo(entry.recorded_at)}</span>
        </div>

        {/* Notes */}
        {entry.notes ? (
          <p className="text-sm text-[#6B7280] dark:text-[#9ca3af] leading-relaxed">{entry.notes}</p>
        ) : (
          !entry.photo_url && (
            <p className="text-xs text-[#9ca3af] italic">{t('journal.noNotes')}</p>
          )
        )}

        {/* Delete (if no photo) */}
        {!entry.photo_url && (
          <button
            onClick={() => onDelete(entry.id)}
            className="mt-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 text-xs text-red-400 hover:text-red-500 transition-all flex items-center gap-1"
          >
            <Trash2 className="w-3 h-3" /> {t('journal.delete')}
          </button>
        )}
      </div>
    </motion.div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function JournalPage() {
  const { t } = useTranslation()
  const { data: entries, isLoading } = useJournalEntries()
  const { data: plants } = usePlants()
  const deleteEntry = useDeleteJournalEntry()

  const [modalOpen, setModalOpen] = useState(false)
  const [filterPlant, setFilterPlant] = useState('')

  const filtered = filterPlant
    ? entries?.filter(e => e.plant_id === filterPlant)
    : entries

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="min-w-0">
          <h1 className="font-[family-name:var(--font-heading)] text-xl sm:text-2xl font-bold text-[#1A1A1A] dark:text-white truncate">
            {t('journal.title')}
          </h1>
          <p className="text-sm text-[#6B7280] dark:text-[#9ca3af] mt-0.5">
            {t('journal.entriesCount', { count: entries?.length ?? 0 })}
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 shrink-0 whitespace-nowrap px-3 sm:px-4 py-2.5 bg-[#4A7C59] hover:bg-[#3A6647] text-white rounded-full text-sm font-medium transition-all shadow-sm"
        >
          <Plus className="w-4 h-4 shrink-0" />
          {t('journal.addEntry')}
        </button>
      </div>

      {/* Plant filter */}
      {(plants?.length ?? 0) > 1 && (
        <div className="flex gap-2 flex-wrap mb-6">
          <button
            onClick={() => setFilterPlant('')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
              !filterPlant
                ? 'bg-[#4A7C59] text-white border-[#4A7C59]'
                : 'border-[#E5EDE8] dark:border-[#2b2e35] text-[#6B7280] dark:text-[#9ca3af] hover:border-[#4A7C59]'
            }`}
          >
            {t('journal.allPlants')}
          </button>
          {plants?.map(p => (
            <button
              key={p.id}
              onClick={() => setFilterPlant(p.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                filterPlant === p.id
                  ? 'bg-[#4A7C59] text-white border-[#4A7C59]'
                  : 'border-[#E5EDE8] dark:border-[#2b2e35] text-[#6B7280] dark:text-[#9ca3af] hover:border-[#4A7C59]'
              }`}
            >
              {p.photo_url && <img src={p.photo_url} alt={p.nickname} className="w-4 h-4 rounded-full object-cover" />}
              {p.nickname}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-24">
          <Loader2 className="w-6 h-6 text-[#4A7C59] animate-spin" />
        </div>
      ) : !filtered?.length ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-20 h-20 bg-[#E8F5EC] dark:bg-[#22252c] rounded-2xl flex items-center justify-center mb-4">
            <BookOpen className="w-10 h-10 text-[#86EFAC]" />
          </div>
          <h3 className="font-[family-name:var(--font-heading)] text-lg font-semibold text-[#1A1A1A] dark:text-white mb-1">
            {filterPlant ? t('journal.noEntriesForPlant') : t('journal.noEntries')}
          </h3>
          <p className="text-sm text-[#6B7280] dark:text-[#9ca3af] mb-6">
            {t('journal.documentJourney')}
          </p>
          {!filterPlant && (
            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#4A7C59] hover:bg-[#3A6647] text-white rounded-full text-sm font-medium transition-all"
            >
              <Plus className="w-4 h-4" />
              {t('journal.addEntry')}
            </button>
          )}
        </div>
      ) : (
        <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
          {filtered.map(entry => (
            <div key={entry.id} className="break-inside-avoid">
              <EntryCard
                entry={entry}
                onDelete={id => deleteEntry.mutate(id)}
              />
            </div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {modalOpen && <AddEntryModal onClose={() => setModalOpen(false)} />}
      </AnimatePresence>
    </div>
  )
}
