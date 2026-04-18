import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

function todayDate() {
  return new Date().toISOString().split('T')[0]
}

function currentPeriod() {
  const now = new Date()
  return { year: now.getFullYear(), month: now.getMonth() + 1 }
}

export default async function AdminDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const today = todayDate()
  const { year, month } = currentPeriod()
  const periodStart = `${year}-${String(month).padStart(2, '0')}-01`
  const periodEnd = new Date(year, month, 0).toISOString().split('T')[0]

  const [
    { count: totalDrivers },
    { count: clockedInToday },
    { count: pendingClaims },
    { data: recentActivity },
    { data: snapshots },
    { data: liveAttendance },
    { data: liveClaims },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'driver').eq('is_active', true),
    supabase.from('attendance').select('*', { count: 'exact', head: true }).eq('work_date', today),
    supabase.from('allowance_claims').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('attendance').select('driver_id, clock_in_at, profiles(full_name)').eq('work_date', today).order('clock_in_at', { ascending: false }).limit(5),
    supabase.from('payroll_snapshots').select('gross_pay').eq('period_year', year).eq('period_month', month),
    supabase.from('attendance').select('total_minutes, ot_minutes, regular_minutes')
      .gte('work_date', periodStart).lte('work_date', periodEnd).not('clock_out_at', 'is', null),
    supabase.from('allowance_claims').select('mileage_amount, overnight_amount, actual_amount, claim_type')
      .eq('status', 'approved').gte('claim_date', periodStart).lte('claim_date', periodEnd),
  ])

  // Estimate current month payroll: locked snapshots + live running estimate
  const lockedTotal = snapshots?.reduce((s, r) => s + r.gross_pay, 0) ?? 0
  const liveOtMinutes = liveAttendance?.reduce((s, r) => s + (r.ot_minutes ?? 0), 0) ?? 0
  const liveAllowances = liveClaims?.reduce((s, c) => {
    if (c.claim_type === 'mileage') return s + (c.mileage_amount ?? 0)
    if (c.claim_type === 'overnight') return s + (c.overnight_amount ?? 0)
    return s + (c.actual_amount ?? 0)
  }, 0) ?? 0

  const monthLabel = new Date(year, month - 1, 1).toLocaleDateString('en-MY', { month: 'long', year: 'numeric' })

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Dashboard</h1>
      <p className="text-slate-500 text-sm mb-8">
        {new Date().toLocaleDateString('en-MY', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
      </p>

      {/* KPI cards */}
      <div className="grid grid-cols-4 gap-5 mb-8">
        <KpiCard
          title="Clocked in today"
          value={`${clockedInToday ?? 0} / ${totalDrivers ?? 0}`}
          color="blue"
          icon="clock"
        />
        <KpiCard
          title="Pending claims"
          value={String(pendingClaims ?? 0)}
          color="amber"
          icon="receipt"
          href="/admin/claims"
        />
        <KpiCard
          title="Allowances (MTD)"
          value={`RM ${liveAllowances.toFixed(0)}`}
          color="purple"
          icon="banknote"
        />
        <KpiCard
          title="OT hours (MTD)"
          value={`${Math.floor(liveOtMinutes / 60)}h`}
          color="orange"
          icon="chart"
        />
      </div>

      {/* Recent clock-ins */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h2 className="font-semibold text-slate-800 mb-4">Today&apos;s clock-ins</h2>
        {!recentActivity?.length ? (
          <p className="text-slate-400 text-sm">No one has clocked in yet today.</p>
        ) : (
          <div className="space-y-3">
            {recentActivity.map((row) => {
              const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
              return (
                <div key={row.driver_id + row.clock_in_at} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-700 text-sm font-bold">
                        {(profile as { full_name?: string })?.full_name?.charAt(0) ?? '?'}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-slate-800">
                      {(profile as { full_name?: string })?.full_name ?? 'Unknown'}
                    </p>
                  </div>
                  <p className="text-sm text-slate-500">
                    {new Date(row.clock_in_at).toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function KpiCard({
  title,
  value,
  color,
  icon,
  href,
}: {
  title: string
  value: string
  color: 'blue' | 'amber' | 'purple' | 'orange'
  icon: string
  href?: string
}) {
  const colors = {
    blue: 'bg-blue-50 border-blue-100',
    amber: 'bg-amber-50 border-amber-100',
    purple: 'bg-purple-50 border-purple-100',
    orange: 'bg-orange-50 border-orange-100',
  }
  const textColors = {
    blue: 'text-blue-700',
    amber: 'text-amber-700',
    purple: 'text-purple-700',
    orange: 'text-orange-700',
  }

  const content = (
    <div className={`rounded-2xl border p-5 ${colors[color]}`}>
      <p className="text-sm text-slate-500 mb-2">{title}</p>
      <p className={`text-3xl font-bold ${textColors[color]}`}>{value}</p>
    </div>
  )

  if (href) {
    return <Link href={href}>{content}</Link>
  }
  return content
}
