import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { computePayroll, monthLabel, type PayrollResult } from '@/lib/payroll'
import type { PayrollSnapshot } from '@/lib/supabase/types'
import PayrollActions from './PayrollActions'

type DisplayRow = {
  driverId: string
  payType: string
  basePay: number
  otPay: number
  totalAllowances: number
  grossPay: number
  daysWorked: number
  totalOtMinutes: number
}

function fromSnapshot(s: PayrollSnapshot): DisplayRow {
  return {
    driverId: s.driver_id,
    payType: s.pay_type,
    basePay: s.base_pay,
    otPay: s.ot_pay,
    totalAllowances: s.total_allowances,
    grossPay: s.gross_pay,
    daysWorked: s.days_worked,
    totalOtMinutes: s.total_ot_minutes,
  }
}

function fromLive(r: PayrollResult): DisplayRow {
  return {
    driverId: r.driverId,
    payType: r.payType,
    basePay: r.basePay,
    otPay: r.otPay,
    totalAllowances: r.totalAllowances,
    grossPay: r.grossPay,
    daysWorked: r.daysWorked,
    totalOtMinutes: r.totalOtMinutes,
  }
}

export default async function PayrollPage({
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

  const periodStart = `${y}-${String(m).padStart(2, '0')}-01`
  const periodEnd = new Date(y, m, 0).toISOString().split('T')[0]

  const [{ data: drivers }, { data: config }, { data: snapshots }] = await Promise.all([
    supabase.from('profiles').select('*').eq('role', 'driver').eq('is_active', true).order('full_name'),
    supabase.from('allowance_config').select('*').single(),
    supabase.from('payroll_snapshots').select('*').eq('period_year', y).eq('period_month', m),
  ])

  // Check for pending claims and missing clock-outs in period
  const [{ count: pendingClaimsCount }, { count: openAttendanceCount }] = await Promise.all([
    supabase.from('allowance_claims').select('*', { count: 'exact', head: true })
      .gte('claim_date', periodStart).lte('claim_date', periodEnd).eq('status', 'pending'),
    supabase.from('attendance').select('*', { count: 'exact', head: true })
      .gte('work_date', periodStart).lte('work_date', periodEnd).is('clock_out_at', null),
  ])

  // For drivers without a snapshot, compute live estimates
  const snapshotMap = new Map(snapshots?.map((s) => [s.driver_id, s]) ?? [])
  const driversWithoutSnapshot = drivers?.filter((d) => !snapshotMap.has(d.id)) ?? []

  // Fetch attendance + claims for live estimate drivers
  const liveData = driversWithoutSnapshot.length > 0 && config
    ? await Promise.all(
        driversWithoutSnapshot.map(async (driver) => {
          const [{ data: attendance }, { data: claims }] = await Promise.all([
            supabase.from('attendance').select('*').eq('driver_id', driver.id)
              .gte('work_date', periodStart).lte('work_date', periodEnd),
            supabase.from('allowance_claims').select('*').eq('driver_id', driver.id)
              .gte('claim_date', periodStart).lte('claim_date', periodEnd).eq('status', 'approved'),
          ])
          return computePayroll(driver, attendance ?? [], claims ?? [], config)
        })
      )
    : []

  function prevMonth() {
    const d = new Date(y, m - 2, 1)
    return `?year=${d.getFullYear()}&month=${d.getMonth() + 1}`
  }
  function nextMonth() {
    const d = new Date(y, m, 1)
    return `?year=${d.getFullYear()}&month=${d.getMonth() + 1}`
  }

  const isLocked = (snapshots?.length ?? 0) > 0

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Payroll</h1>
        <PayrollActions
          year={y}
          month={m}
          isLocked={isLocked}
          pendingClaimsCount={pendingClaimsCount ?? 0}
          openAttendanceCount={openAttendanceCount ?? 0}
          adminId={user.id}
        />
      </div>

      {/* Month nav */}
      <div className="flex items-center justify-between bg-white border border-slate-200 rounded-2xl px-5 py-3 mb-6">
        <a href={prevMonth()} className="p-1 text-slate-400 hover:text-slate-700">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </a>
        <div className="text-center">
          <p className="font-semibold text-slate-800">{monthLabel(y, m)}</p>
          {isLocked && (
            <span className="text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded-full">Snapshot locked</span>
          )}
        </div>
        <a href={nextMonth()} className="p-1 text-slate-400 hover:text-slate-700">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </a>
      </div>

      {/* Warnings */}
      {(pendingClaimsCount ?? 0) > 0 && !isLocked && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3 mb-4 text-sm text-amber-800">
          ⚠️ {pendingClaimsCount} pending claim{pendingClaimsCount !== 1 ? 's' : ''} — approve before generating snapshot or they will be excluded.
        </div>
      )}
      {(openAttendanceCount ?? 0) > 0 && !isLocked && (
        <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-3 mb-4 text-sm text-red-800">
          ⚠️ {openAttendanceCount} attendance record{openAttendanceCount !== 1 ? 's' : ''} missing clock-out — OT will not be counted until corrected.
        </div>
      )}

      {/* Payroll table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Driver</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Type</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Base</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">OT</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Allowances</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Gross</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {drivers?.map((driver) => {
              const snap = snapshotMap.get(driver.id)
              const live = liveData.find((l) => l.driverId === driver.id)
              const row: DisplayRow | undefined = snap ? fromSnapshot(snap) : live ? fromLive(live) : undefined

              if (!row) return null

              return (
                <tr key={driver.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 font-medium text-slate-800">{driver.full_name}</td>
                  <td className="px-5 py-3 text-slate-500 capitalize">{row.payType}</td>
                  <td className="px-5 py-3 text-right text-slate-700">RM {row.basePay.toFixed(2)}</td>
                  <td className="px-5 py-3 text-right text-orange-600">RM {row.otPay.toFixed(2)}</td>
                  <td className="px-5 py-3 text-right text-purple-600">RM {row.totalAllowances.toFixed(2)}</td>
                  <td className="px-5 py-3 text-right font-bold text-slate-900">RM {row.grossPay.toFixed(2)}</td>
                </tr>
              )
            })}
          </tbody>
          <tfoot className="bg-slate-50 border-t border-slate-200">
            <tr>
              <td colSpan={5} className="px-5 py-3 text-sm font-semibold text-slate-700">Total</td>
              <td className="px-5 py-3 text-right font-bold text-slate-900">
                RM {(
                  (drivers ?? []).reduce((sum, driver) => {
                    const snap = snapshotMap.get(driver.id)
                    const live = liveData.find((l) => l.driverId === driver.id)
                    const row = snap ? fromSnapshot(snap) : live ? fromLive(live) : null
                    return sum + (row?.grossPay ?? 0)
                  }, 0)
                ).toFixed(2)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
