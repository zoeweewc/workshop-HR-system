import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>
}) {
  const { year, month } = await searchParams
  const now = new Date()
  const y = parseInt(year ?? String(now.getFullYear()))
  const m = parseInt(month ?? String(now.getMonth() + 1))

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const startDate = `${y}-${String(m).padStart(2, '0')}-01`
  const endDate = new Date(y, m, 0).toISOString().split('T')[0]

  const { data: rows } = await supabase
    .from('attendance')
    .select('*')
    .eq('driver_id', user.id)
    .gte('work_date', startDate)
    .lte('work_date', endDate)
    .order('work_date', { ascending: true })

  const totalMinutes = rows?.reduce((s, r) => s + (r.total_minutes ?? 0), 0) ?? 0
  const totalOt = rows?.reduce((s, r) => s + (r.ot_minutes ?? 0), 0) ?? 0
  const daysWorked = rows?.filter((r) => r.clock_out_at).length ?? 0

  const monthLabel = new Date(y, m - 1, 1).toLocaleDateString('en-MY', { month: 'long', year: 'numeric' })

  function prevMonth() {
    const d = new Date(y, m - 2, 1)
    return `?year=${d.getFullYear()}&month=${d.getMonth() + 1}`
  }
  function nextMonth() {
    const d = new Date(y, m, 1)
    return `?year=${d.getFullYear()}&month=${d.getMonth() + 1}`
  }

  return (
    <div className="p-5 pt-8">
      <h1 className="text-xl font-bold text-slate-900 mb-6">Attendance History</h1>

      {/* Month nav */}
      <div className="flex items-center justify-between bg-white border border-slate-200 rounded-2xl px-4 py-3 mb-5">
        <a href={prevMonth()} className="p-1 text-slate-400 hover:text-slate-700">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </a>
        <p className="font-semibold text-slate-800">{monthLabel}</p>
        <a href={nextMonth()} className="p-1 text-slate-400 hover:text-slate-700">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </a>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-white border border-slate-200 rounded-2xl p-3 text-center">
          <p className="text-2xl font-bold text-slate-900">{daysWorked}</p>
          <p className="text-xs text-slate-500 mt-0.5">Days worked</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-3 text-center">
          <p className="text-2xl font-bold text-slate-900">{Math.floor(totalMinutes / 60)}</p>
          <p className="text-xs text-slate-500 mt-0.5">Total hours</p>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-3 text-center">
          <p className="text-2xl font-bold text-orange-700">{Math.floor(totalOt / 60)}</p>
          <p className="text-xs text-orange-600 mt-0.5">OT hours</p>
        </div>
      </div>

      {/* Daily rows */}
      {!rows?.length ? (
        <p className="text-center text-slate-400 py-10 text-sm">No attendance records this month.</p>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => (
            <div key={row.id} className="bg-white border border-slate-200 rounded-xl px-4 py-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-800 text-sm">
                    {new Date(row.work_date + 'T00:00:00').toLocaleDateString('en-MY', {
                      weekday: 'short', day: 'numeric', month: 'short',
                    })}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {new Date(row.clock_in_at).toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' })}
                    {row.clock_out_at
                      ? ` – ${new Date(row.clock_out_at).toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' })}`
                      : ' – –:––'}
                  </p>
                </div>
                <div className="text-right">
                  {row.clock_out_at ? (
                    <>
                      <p className="text-sm font-semibold text-slate-800">
                        {Math.floor((row.total_minutes ?? 0) / 60)}h {(row.total_minutes ?? 0) % 60}m
                      </p>
                      {(row.ot_minutes ?? 0) > 0 && (
                        <p className="text-xs text-orange-600">+{Math.floor((row.ot_minutes ?? 0) / 60)}h OT</p>
                      )}
                    </>
                  ) : (
                    <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                      {row.is_manual_edit ? 'Needs review' : 'In progress'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
