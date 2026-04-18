import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const nowMY = new Date().toLocaleString('en-CA', { timeZone: 'Asia/Kuala_Lumpur' })
  const today = nowMY.split(',')[0]

  // Find open clock-in for today
  const { data: existing } = await supabase
    .from('attendance')
    .select('id, clock_in_at, clock_out_at')
    .eq('driver_id', user.id)
    .eq('work_date', today)
    .maybeSingle()

  if (!existing) {
    return NextResponse.json({ error: 'No clock-in found for today.' }, { status: 404 })
  }

  if (existing.clock_out_at) {
    return NextResponse.json({ error: 'Already clocked out today.' }, { status: 409 })
  }

  const { data, error } = await supabase
    .from('attendance')
    .update({ clock_out_at: new Date().toISOString() })
    .eq('id', existing.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
