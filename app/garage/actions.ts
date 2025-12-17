'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { lookupCompliance } from '@/lib/compliance'

export async function addTruck(prevState: any, formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { message: 'Unauthorized' }
  }

  const nickname = formData.get('nickname') as string
  let vin = (formData.get('vin') as string).toUpperCase().trim()

  // VIN Validation
  const vinRegex = /^[A-HJ-NPR-Z0-9]{17}$/;
  if (!vinRegex.test(vin)) {
    return { message: 'Invalid VIN. Must be 17 chars, no I/O/Q.' }
  }

  // 1. Create Truck
  const { data: truck, error: truckError } = await supabase
    .from('trucks')
    .insert({ user_id: user.id, vin, nickname })
    .select()
    .single()

  if (truckError) {
    if (truckError.code === '23505') { // Unique violation
      return { message: 'This VIN is already in your garage.' }
    }
    return { message: 'Error adding truck.' }
  }

  // 2. Initial Compliance Check
  await runCheck(truck.id, vin)

  revalidatePath('/garage')
  return { message: 'success' }
}

export async function checkComplianceAction(truckId: string, vin: string) {
  const result = await runCheck(truckId, vin)
  revalidatePath('/garage')
  return result
}

export async function updateNickname(truckId: string, newName: string) {
  const supabase = createClient()
  await supabase.from('trucks').update({ nickname: newName }).eq('id', truckId)
  revalidatePath('/garage')
}

export async function deleteTruck(truckId: string) {
  const supabase = createClient()
  await supabase.from('trucks').delete().eq('id', truckId)
  revalidatePath('/garage')
}

// Internal Helper
async function runCheck(truckId: string, vin: string) {
  const supabase = createClient()
  
  // 1. Perform Lookup
  const { status, raw } = await lookupCompliance(vin)

  // 2. Save Result
  const { error } = await supabase.from('truck_checks').insert({
    truck_id: truckId,
    status,
    raw
  })

  if (error) return { success: false, error: error.message }
  return { success: true, status }
}
