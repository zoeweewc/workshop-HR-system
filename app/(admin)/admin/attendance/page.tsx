import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AttendanceTable from './AttendanceTable'

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; driver?: string }>
}) {
  const { from, to, driver } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const defaultFrom = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  const defaultTo = new Date().toISOString().split('T')[0]

  const fromDate = from ?? defaultFrom
  const toDate = to ?? defaultTo

  let query = supabase
    .from('attendance')
    .select('*, profiles(full_name)')
    .gte('work_date', fromDate)
    .lte('work_date', toDate)
    .order('work_date', { ascending: false })
    .order('clock_in_at', { ascending: false })

  if (driver) query = query.eq('driver_id', driver)

  const [{ data: rows }, { data: drivers }] = await Promise.all([
    query,
    supabase.from('profiles').select('id, full_name').eq('role', 'driver').eq('is_active', true).order('full_name'),
  ])

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-8">Attendance</h1>
      <AttendanceTable
        rows={rows ?? []}
        drivers={drivers ?? []}
        fromDate={fromDate}
        toDate={toDate}
        selectedDriver={driver}
      />
    </div>
  )
}
