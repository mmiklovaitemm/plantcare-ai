export interface User {
  id: string
  email: string
  name: string | null
  city: string | null
  preferred_language: 'en' | 'lt'
  created_at: string
}

export interface Plant {
  id: string
  user_id: string
  api_plant_id: number | null
  nickname: string
  room: string | null
  photo_url: string | null
  health_status: 'healthy' | 'needs_attention' | 'critical'
  created_at: string
}

export type CareActionType = 'water' | 'fertilize' | 'mist' | 'repot' | 'prune'

export interface CareLog {
  id: string
  plant_id: string
  action_type: CareActionType
  performed_at: string
  notes: string | null
}

export interface CareSchedule {
  id: string
  plant_id: string
  action_type: CareActionType
  interval_days: number
  next_due: string
}

export interface GrowthJournalEntry {
  id: string
  plant_id: string
  photo_url: string | null
  notes: string | null
  recorded_at: string
}

export interface Notification {
  id: string
  user_id: string
  plant_id: string
  action_type: CareActionType
  scheduled_at: string
  sent: boolean
}
