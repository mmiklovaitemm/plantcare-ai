import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import type { Plant } from '../types'

export function usePlants() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['plants', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plants')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as Plant[]
    },
    enabled: !!user,
  })
}

export function useAddPlant() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (plant: {
      nickname: string
      room: string | null
      health_status: Plant['health_status']
      photo_url: string | null
      api_plant_id: number | null
    }) => {
      const { data, error } = await supabase
        .from('plants')
        .insert({ ...plant, user_id: user!.id })
        .select()
        .single()
      if (error) throw error
      return data as Plant
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plants'] })
    },
  })
}

export function useDeletePlant() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('plants').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plants'] })
    },
  })
}
