'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Attendance, Profile } from '@/lib/supabase/types'

type AttendanceWithProfile = Attendance & { profiles: Pick<Profile, 'full_name'> | null }

export default function AttendanceTable({
  rows,
  drivers,
  fromDate,
  toDate,
  selectedDriver,
}: {
  rows: AttendanceWithProfile[]
  drivers: Pick<Profile, 'id' | 'full_name'>[]
  fromDate: string
  toDate: string
  selectedDriver?: string
}) {
  const router = useRouter()
  const [editRow, setEditRow] = useState<AttendanceWithProfile | null>(null)
  const [editClockOut, setEditClockOut] = useState('')
  const [editNote, setEditNote] = useState('')
  const [saving, setSaving] = useState(false)

  function applyFilters(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const params = new URLSearchParams()
    params.set('from', fd.get('from') as string)
    params.set('to', fd.get('to') as string)
    const d = fd.get('driver') as string
    if (d) params.set('driver', d)
    router.push(`/admin/attendance?${params.toString()}`)
  }

  async function saveEdit() {
    if (!editRow) return
    setSaving(true)
    const supabase = createClient()
    await supabase
      .from('attendance')
      .update({
        clock_out_at: editClockOut ? new Date(`${editRow.work_date}T${editClockOut}`).toISOString() : undefined,
        is_manual_edit: true,
        notes: editNote || undefined,
      })
      .eq('id', editRow.id)
    setSaving(false)
    setEditRow(null)
    router.refresh()
  }

  // Flag rows with potential midnight-cross
  function isMidnightCross(row: AttendanceWithProfile) {
    if (!row.clock_out_at) return false
    return new Date(row.clock_out_at).toISOString().split('T')[0] !== row.work_date
  }

  return (
    <>
      {/* Filters */}
      <form onSubmit={applyFilters} className="bg-white border border-slate-200 rounded-2xl p-5 mb-6 flex gap-4 items-end flex-wrap">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">From</label>
          <input type="date" name="from" defaultValue={fromDate}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">To</label>
          <input type="date" name="to" defaultValue={toDate}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Driver</label>
          <select name="driver" defaultValue={selectedDriver ?? ''}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm">
            <option value="">All drivers</option>
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>{d.full_name}</option>
            ))}
          </select>
        </div>
        <button type="submit"
          className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700">
          Apply
        </button>
      </form>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Driver</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Clock In</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Clock Out</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Hours</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">OT</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {!rows.length ? (
              <tr><td colSpan={7} className="text-center py-10 text-slate-400">No records</td></tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className={`hover:bg-slate-50 ${row.is_manual_edit ? 'bg-amber-50/40' : ''}`}>
                  <td className="px-5 py-3 font-medium text-slate-800">
                    {row.profiles?.full_name ?? '–'}
                    {row.is_manual_edit && <span className="ml-2 text-xs text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">edited</span>}
                  </td>
                  <td className="px-5 py-3 text-slate-600">{row.work_date}</td>
                  <td className="px-5 py-3 text-slate-600">
                    {new Date(row.clock_in_at).toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-5 py-3">
                    {row.clock_out_at ? (
                      <span className={isMidnightCross(row) ? 'text-amber-600' : 'text-slate-600'}>
                        {new Date(row.clock_out_at).toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' })}
                        {isMidnightCross(row) && ' ⚠️'}
                      </span>
                    ) : (
                      <span className="text-red-500 font-medium">Missing</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-slate-600">
                    {row.total_minutes != null
                      ? `${Math.floor(row.total_minutes / 60)}h ${row.total_minutes % 60}m`
                      : '–'}
                  </td>
                  <td className="px-5 py-3">
                    {(row.ot_minutes ?? 0) > 0 ? (
                      <span className="text-orange-600 font-medium">
                        {Math.floor((row.ot_minutes ?? 0) / 60)}h {(row.ot_minutes ?? 0) % 60}m
                      </span>
                    ) : '–'}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => {
                        setEditRow(row)
                        setEditClockOut(row.clock_out_at
                          ? new Date(row.clock_out_at).toTimeString().slice(0, 5)
                          : '')
                        setEditNote(row.notes ?? '')
                      }}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Edit modal */}
      {editRow && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-lg font-bold text-slate-900 mb-1">Edit Attendance</h2>
            <p className="text-sm text-slate-500 mb-5">
              {editRow.profiles?.full_name} — {editRow.work_date}
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Clock-out time</label>
                <input
                  type="time"
                  value={editClockOut}
                  onChange={(e) => setEditClockOut(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Admin note</label>
                <input
                  type="text"
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  placeholder="Reason for manual edit"
                  className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setEditRow(null)}
                className="flex-1 py-2.5 border border-slate-200 rounded-xl text-slate-700 font-medium text-sm">
                Cancel
              </button>
              <button onClick={saveEdit} disabled={saving}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-medium text-sm disabled:opacity-50">
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
