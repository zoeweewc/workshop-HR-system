'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function PayrollActions({
  year,
  month,
  isLocked,
  pendingClaimsCount,
  openAttendanceCount,
  adminId,
}: {
  year: number
  month: number
  isLocked: boolean
  pendingClaimsCount: number
  openAttendanceCount: number
  adminId: string
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  async function generate() {
    setShowConfirm(false)
    setLoading(true)
    await fetch('/api/payroll/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ year, month }),
    })
    setLoading(false)
    router.refresh()
  }

  return (
    <>
      {!isLocked && (
        <button
          onClick={() => setShowConfirm(true)}
          disabled={loading}
          className="bg-blue-600 text-white rounded-xl px-5 py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Generating…' : 'Generate Snapshot'}
        </button>
      )}

      {showConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-lg font-bold text-slate-900 mb-3">Generate payroll snapshot?</h2>
            <p className="text-sm text-slate-600 mb-4">
              This will lock the payroll values for this period. Future claim approvals will NOT update the snapshot.
            </p>
            {pendingClaimsCount > 0 && (
              <p className="text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2 mb-3">
                ⚠️ {pendingClaimsCount} pending claims will be excluded from this snapshot.
              </p>
            )}
            {openAttendanceCount > 0 && (
              <p className="text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2 mb-3">
                ⚠️ {openAttendanceCount} attendance records missing clock-out — OT may be understated.
              </p>
            )}
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowConfirm(false)}
                className="flex-1 py-2.5 border border-slate-200 rounded-xl text-slate-700 font-medium text-sm">
                Cancel
              </button>
              <button onClick={generate}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-medium text-sm hover:bg-blue-700">
                Generate
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
