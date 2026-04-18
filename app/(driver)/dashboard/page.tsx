import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'

function todayDate() {
  return new Date().toISOString().split('T')[0]
}

export default async function DriverDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const today = todayDate()

  const [{ data: profile }, { data: todayAttendance }, { data: pendingClaims }] =
    await Promise.all([
      supabase.from('profiles').select('full_name').eq('id', user.id).single(),
      supabase.from('attendance').select('*').eq('driver_id', user.id).eq('work_date', today).maybeSingle(),
      supabase.from('allowance_claims').select('id', { count: 'exact' }).eq('driver_id', user.id).eq('status', 'pending'),
    ])

  const firstName = profile?.full_name?.split(' ')[0] ?? 'Driver'
  const isClockedIn = !!todayAttendance && !todayAttendance.clock_out_at
  const isDone = !!todayAttendance && !!todayAttendance.clock_out_at
  const pendingCount = pendingClaims?.length ?? 0

  const dateLabel = new Date().toLocaleDateString('en-MY', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  return (
    <div className="p-5 space-y-5">
      {/* Header */}
      <div className="pt-4">
        <p className="text-slate-500 text-sm">{dateLabel}</p>
        <h1 className="text-2xl font-bold text-slate-900 mt-0.5">Hello, {firstName} 👋</h1>
      </div>

      {/* Clock status card */}
      <div className={`rounded-2xl p-5 ${isDone ? 'bg-green-50 border border-green-200' : isClockedIn ? 'bg-blue-50 border border-blue-200' : 'bg-slate-100 border border-slate-200'}`}>
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${isDone ? 'bg-green-500' : isClockedIn ? 'bg-blue-500 animate-pulse' : 'bg-slate-400'}`} />
          <p className="font-semibold text-slate-800">
            {isDone ? 'Done for today' : isClockedIn ? 'Currently clocked in' : 'Not clocked in yet'}
          </p>
        </div>
        {todayAttendance && (
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-slate-500">Clock in</p>
              <p className="font-medium text-slate-800">
                {new Date(todayAttendance.clock_in_at).toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            {todayAttendance.clock_out_at && (
              <div>
                <p className="text-xs text-slate-500">Clock out</p>
                <p className="font-medium text-slate-800">
                  {new Date(todayAttendance.clock_out_at).toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            )}
            {todayAttendance.clock_out_at && todayAttendance.total_minutes && (
              <div>
                <p className="text-xs text-slate-500">Hours worked</p>
                <p className="font-medium text-slate-800">
                  {Math.floor(todayAttendance.total_minutes / 60)}h {todayAttendance.total_minutes % 60}m
                  {(todayAttendance.ot_minutes ?? 0) > 0 && (
                    <span className="ml-1 text-orange-600 text-xs">
                      (+{Math.round(todayAttendance.ot_minutes! / 60 * 10) / 10}h OT)
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/clock"
          className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col gap-2 hover:border-blue-300 transition-colors"
        >
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
            <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="font-semibold text-slate-800 text-sm">{isDone ? 'View today' : isClockedIn ? 'Clock Out' : 'Clock In'}</p>
        </Link>

        <Link
          href="/claims/new"
          className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col gap-2 hover:border-blue-300 transition-colors"
        >
          <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
            <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <p className="font-semibold text-slate-800 text-sm">New Claim</p>
        </Link>
      </div>

      {/* Pending claims notice */}
      {pendingCount > 0 && (
        <Link href="/claims" className="block bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 bg-amber-500 text-white rounded-full text-xs flex items-center justify-center font-bold">
                {pendingCount}
              </span>
              <p className="text-sm font-medium text-amber-800">
                {pendingCount === 1 ? '1 claim pending approval' : `${pendingCount} claims pending approval`}
              </p>
            </div>
            <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </Link>
      )}
    </div>
  )
}
