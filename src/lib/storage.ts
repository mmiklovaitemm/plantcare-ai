import { supabase } from './supabase'

export async function uploadPlantPhoto(file: File, userId: string): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `${userId}/${Date.now()}.${ext}`

  const { error } = await supabase.storage
    .from('plant-photos')
    .upload(path, file, { upsert: false })

  if (error) throw error

  const { data } = supabase.storage.from('plant-photos').getPublicUrl(path)
  return data.publicUrl
}

export async function deletePlantPhoto(url: string): Promise<void> {
  const path = url.split('/plant-photos/')[1]
  if (!path) return
  await supabase.storage.from('plant-photos').remove([path])
}
