import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { monthLabel, formatRM } from '@/lib/payroll'

export default async function PayslipPage({
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

  const [{ data: snapshot }, { data: profile }] = await Promise.all([
    supabase.from('payroll_snapshots').select('*').eq('driver_id', user.id)
      .eq('period_year', y).eq('period_month', m).maybeSingle(),
    supabase.from('profiles').select('full_name, pay_type').eq('id', user.id).single(),
  ])

  // Get available months with snapshots
  const { data: allSnapshots } = await supabase
    .from('payroll_snapshots')
    .select('period_year, period_month')
    .eq('driver_id', user.id)
    .order('period_year', { ascending: false })
    .order('period_month', { ascending: false })

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
      <h1 className="text-xl font-bold text-slate-900 mb-6">Payslip</h1>

      {/* Month nav */}
      <div className="flex items-center justify-between bg-white border border-slate-200 rounded-2xl px-4 py-3 mb-5">
        <a href={prevMonth()} className="p-1 text-slate-400 hover:text-slate-700">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </a>
        <p className="font-semibold text-slate-800">{monthLabel(y, m)}</p>
        <a href={nextMonth()} className="p-1 text-slate-400 hover:text-slate-700">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </a>
      </div>

      {!snapshot ? (
        <div className="text-center py-16 text-slate-400">
          <p className="text-sm">No payslip generated for this period yet.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-blue-600 px-5 py-4 text-white">
            <p className="text-sm opacity-80">Pay period</p>
            <p className="text-lg font-bold">{monthLabel(y, m)}</p>
            <p className="text-sm mt-1 opacity-90">{profile?.full_name}</p>
          </div>

          {/* Line items */}
          <div className="divide-y divide-slate-100">
            <PayRow label="Base pay" value={formatRM(snapshot.base_pay)} />
            {snapshot.pay_type === 'daily' && (
              <PayRow label={`Days worked (${snapshot.days_worked})`} value="" subtle />
            )}
            <PayRow
              label={`OT pay (${Math.floor(snapshot.total_ot_minutes / 60)}h ${snapshot.total_ot_minutes % 60}m)`}
              value={formatRM(snapshot.ot_pay)}
            />
            <PayRow label="Allowances" value={formatRM(snapshot.total_allowances)} />
          </div>

          {/* Gross */}
          <div className="px-5 py-4 bg-slate-50 flex items-center justify-between">
            <p className="font-bold text-slate-900">Gross Pay</p>
            <p className="text-xl font-bold text-blue-600">{formatRM(snapshot.gross_pay)}</p>
          </div>

          <p className="text-xs text-slate-400 text-center py-3">
            Generated on {new Date(snapshot.generated_at).toLocaleDateString('en-MY')}
          </p>
        </div>
      )}
    </div>
  )
}

function PayRow({ label, value, subtle }: { label: string; value: string; subtle?: boolean }) {
  return (
    <div className="flex items-center justify-between px-5 py-3">
      <p className={`text-sm ${subtle ? 'text-slate-400' : 'text-slate-600'}`}>{label}</p>
      <p className={`text-sm font-medium ${subtle ? 'text-slate-400' : 'text-slate-900'}`}>{value}</p>
    </div>
  )
}
