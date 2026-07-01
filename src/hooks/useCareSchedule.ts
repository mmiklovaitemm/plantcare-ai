import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import type { CareSchedule, CareActionType } from '../types'

export function useCareSchedules() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['care_schedules', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('care_schedule')
        .select('*, plants!inner(user_id)')
        .eq('plants.user_id', user!.id)
      if (error) throw error
      return data as (CareSchedule & { plants: { user_id: string } })[]
    },
    enabled: !!user,
  })
}

export function useAddCareSchedule() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (schedule: {
      plant_id: string
      action_type: CareActionType
      interval_days: number
      next_due: string
    }) => {
      const { error } = await supabase.from('care_schedule').insert(schedule)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['care_schedules'] })
    },
  })
}

export function useLogCare() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      plant_id,
      action_type,
      schedule_id,
      interval_days,
    }: {
      plant_id: string
      action_type: CareActionType
      schedule_id: string
      interval_days: number
    }) => {
      const now = new Date()
      const next = new Date(now)
      next.setDate(next.getDate() + interval_days)
      const nextDue = next.toISOString().split('T')[0]

      const [logRes, schedRes] = await Promise.all([
        supabase.from('care_log').insert({
          plant_id,
          action_type,
          performed_at: now.toISOString(),
        }),
        supabase
          .from('care_schedule')
          .update({ next_due: nextDue })
          .eq('id', schedule_id),
      ])

      if (logRes.error) throw logRes.error
      if (schedRes.error) throw schedRes.error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['care_schedules'] })
      queryClient.invalidateQueries({ queryKey: ['care_log'] })
    },
  })
}
