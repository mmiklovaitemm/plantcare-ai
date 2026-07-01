import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import type { GrowthJournalEntry } from '../types'

export function useJournalEntries(plantId?: string) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['journal', user?.id, plantId],
    queryFn: async () => {
      let query = supabase
        .from('growth_journal')
        .select('*, plants!inner(user_id, nickname, photo_url)')
        .eq('plants.user_id', user!.id)
        .order('recorded_at', { ascending: false })

      if (plantId) query = query.eq('plant_id', plantId)

      const { data, error } = await query
      if (error) throw error
      return data as (GrowthJournalEntry & { plants: { user_id: string; nickname: string; photo_url: string | null } })[]
    },
    enabled: !!user,
  })
}

export function useAddJournalEntry() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (entry: {
      plant_id: string
      photo_url: string | null
      notes: string | null
    }) => {
      const { data, error } = await supabase
        .from('growth_journal')
        .insert({ ...entry, recorded_at: new Date().toISOString() })
        .select()
        .single()
      if (error) throw error
      return data as GrowthJournalEntry
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal'] })
    },
  })
}

export function useDeleteJournalEntry() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('growth_journal').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal'] })
    },
  })
}
