'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Attendance } from '@/lib/supabase/types'

function todayDate() {
  return new Date().toISOString().split('T')[0]
}

export default function ClockPage() {
  const [attendance, setAttendance] = useState<Attendance | null | undefined>(undefined)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showConfirm, setShowConfirm] = useState(false)
  const [elapsed, setElapsed] = useState('')

  useEffect(() => {
    loadAttendance()
  }, [])

  useEffect(() => {
    if (!attendance?.clock_in_at || attendance.clock_out_at) return
    const interval = setInterval(() => {
      const diff = Math.floor((Date.now() - new Date(attendance.clock_in_at).getTime()) / 1000)
      const h = Math.floor(diff / 3600)
      const m = Math.floor((diff % 3600) / 60)
      const s = diff % 60
      setElapsed(`${h}h ${m}m ${s}s`)
    }, 1000)
    return () => clearInterval(interval)
  }, [attendance])

  async function loadAttendance() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('attendance')
      .select('*')
      .eq('driver_id', user.id)
      .eq('work_date', todayDate())
      .maybeSingle()
    setAttendance(data)
  }

  async function handleAction() {
    setShowConfirm(false)
    setLoading(true)
    setError('')

    const endpoint = attendance ? '/api/clock-out' : '/api/clock-in'
    const res = await fetch(endpoint, { method: 'POST' })
    const json = await res.json()

    if (!res.ok) {
      setError(json.error ?? 'Something went wrong')
      setLoading(false)
      return
    }

    await loadAttendance()
    setLoading(false)
  }

  const isClockedIn = !!attendance && !attendance.clock_out_at
  const isDone = !!attendance && !!attendance.clock_out_at

  return (
    <div className="p-5 pt-8 flex flex-col items-center min-h-screen">
      <h1 className="text-xl font-bold text-slate-900 self-start mb-8">Clock In / Out</h1>

      {/* Status display */}
      <div className="w-full bg-white rounded-3xl border border-slate-200 p-6 mb-8 text-center">
        <div className={`w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center ${isDone ? 'bg-green-100' : isClockedIn ? 'bg-blue-100' : 'bg-slate-100'}`}>
          <svg className={`w-10 h-10 ${isDone ? 'text-green-600' : isClockedIn ? 'text-blue-600' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        {isDone ? (
          <>
            <p className="text-lg font-bold text-green-700">Shift complete</p>
            <div className="mt-4 grid grid-cols-2 gap-4 text-left">
              <div>
                <p className="text-xs text-slate-500">Clocked in</p>
                <p className="font-semibold text-slate-800">
                  {new Date(attendance!.clock_in_at).toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Clocked out</p>
                <p className="font-semibold text-slate-800">
                  {new Date(attendance!.clock_out_at!).toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Total hours</p>
                <p className="font-semibold text-slate-800">
                  {Math.floor((attendance!.total_minutes ?? 0) / 60)}h {(attendance!.total_minutes ?? 0) % 60}m
                </p>
              </div>
              {(attendance!.ot_minutes ?? 0) > 0 && (
                <div>
                  <p className="text-xs text-slate-500">OT</p>
                  <p className="font-semibold text-orange-600">
                    {Math.floor((attendance!.ot_minutes ?? 0) / 60)}h {(attendance!.ot_minutes ?? 0) % 60}m
                  </p>
                </div>
              )}
            </div>
          </>
        ) : isClockedIn ? (
          <>
            <p className="text-lg font-bold text-blue-700">You&apos;re clocked in</p>
            <p className="text-2xl font-mono font-bold text-slate-900 mt-2">{elapsed}</p>
            <p className="text-sm text-slate-500 mt-1">
              Since {new Date(attendance!.clock_in_at).toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </>
        ) : (
          <>
            <p className="text-lg font-bold text-slate-700">Not clocked in</p>
            <p className="text-sm text-slate-500 mt-1">
              {new Date().toLocaleDateString('en-MY', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </>
        )}
      </div>

      {error && (
        <p className="text-red-600 text-sm bg-red-50 rounded-lg px-4 py-2 mb-4 w-full text-center">{error}</p>
      )}

      {/* Action button */}
      {!isDone && (
        <button
          onClick={() => setShowConfirm(true)}
          disabled={loading}
          className={`w-full py-4 rounded-2xl text-white font-bold text-lg disabled:opacity-50 transition-colors ${isClockedIn ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}`}
        >
          {loading ? 'Please wait…' : isClockedIn ? 'Clock Out' : 'Clock In'}
        </button>
      )}

      {/* Confirm modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-end justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-2">
              {isClockedIn ? 'Clock out now?' : 'Clock in now?'}
            </h2>
            <p className="text-slate-500 text-sm mb-6">
              {new Date().toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-700 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleAction}
                className={`flex-1 py-3 rounded-xl text-white font-medium ${isClockedIn ? 'bg-red-500' : 'bg-green-500'}`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
