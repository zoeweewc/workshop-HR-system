import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Use Malaysia timezone for work_date
  const nowMY = new Date().toLocaleString('en-CA', { timeZone: 'Asia/Kuala_Lumpur' })
  const today = nowMY.split(',')[0]

  // Upsert with ON CONFLICT DO NOTHING to guard race conditions
  const { data, error } = await supabase
    .from('attendance')
    .insert({
      driver_id: user.id,
      work_date: today,
      clock_in_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Already clocked in today.' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
