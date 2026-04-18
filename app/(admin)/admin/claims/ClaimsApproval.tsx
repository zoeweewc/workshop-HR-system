'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { AllowanceClaim, Profile } from '@/lib/supabase/types'
import Link from 'next/link'

type ClaimWithProfile = AllowanceClaim & { profiles: Pick<Profile, 'full_name'> | null }

const TYPE_LABELS: Record<string, string> = {
  mileage: 'Mileage',
  overnight: 'Overnight',
  toll_parking: 'Toll / Parking',
}

function claimAmount(c: AllowanceClaim): number {
  if (c.claim_type === 'mileage') return c.mileage_amount ?? 0
  if (c.claim_type === 'overnight') return c.overnight_amount ?? 0
  return c.actual_amount ?? 0
}

export default function ClaimsApproval({
  claims,
  currentTab,
}: {
  claims: ClaimWithProfile[]
  currentTab: string
}) {
  const router = useRouter()
  const [rejectModal, setRejectModal] = useState<ClaimWithProfile | null>(null)
  const [rejectNote, setRejectNote] = useState('')
  const [loading, setLoading] = useState<string | null>(null)
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set())

  async function approve(id: string) {
    setLoading(id)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('allowance_claims').update({
      status: 'approved',
      reviewed_by: user?.id,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', id)
    setLoading(null)
    router.refresh()
  }

  async function reject(id: string, note: string) {
    setLoading(id)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('allowance_claims').update({
      status: 'rejected',
      reviewed_by: user?.id,
      reviewed_at: new Date().toISOString(),
      rejection_note: note,
      updated_at: new Date().toISOString(),
    }).eq('id', id)
    setLoading(null)
    setRejectModal(null)
    setRejectNote('')
    router.refresh()
  }

  async function bulkApprove() {
    setLoading('bulk')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const now = new Date().toISOString()
    await supabase.from('allowance_claims').update({
      status: 'approved',
      reviewed_by: user?.id,
      reviewed_at: now,
      updated_at: now,
    }).in('id', Array.from(bulkSelected))
    setLoading(null)
    setBulkSelected(new Set())
    router.refresh()
  }

  function toggleBulk(id: string) {
    const next = new Set(bulkSelected)
    next.has(id) ? next.delete(id) : next.add(id)
    setBulkSelected(next)
  }

  const pendingClaims = claims.filter((c) => c.status === 'pending')

  return (
    <>
      {/* Tabs */}
      <div className="flex gap-3 mb-6">
        {['pending', 'all'].map((tab) => (
          <Link
            key={tab}
            href={`/admin/claims?tab=${tab}`}
            className={`px-5 py-2 rounded-xl text-sm font-medium transition-colors ${
              currentTab === tab ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600'
            }`}
          >
            {tab === 'pending' ? `Pending (${pendingClaims.length})` : 'All'}
          </Link>
        ))}

        {bulkSelected.size > 0 && (
          <button
            onClick={bulkApprove}
            disabled={loading === 'bulk'}
            className="ml-auto bg-green-600 text-white px-5 py-2 rounded-xl text-sm font-medium hover:bg-green-700 disabled:opacity-50"
          >
            {loading === 'bulk' ? 'Approving…' : `Approve ${bulkSelected.size} selected`}
          </button>
        )}
      </div>

      {/* Claims */}
      <div className="space-y-3">
        {!claims.length ? (
          <div className="text-center py-16 text-slate-400">
            <p className="text-sm">No claims</p>
          </div>
        ) : (
          claims.map((claim) => (
            <div key={claim.id} className="bg-white border border-slate-200 rounded-2xl p-5">
              <div className="flex items-start gap-4">
                {claim.status === 'pending' && (
                  <input
                    type="checkbox"
                    checked={bulkSelected.has(claim.id)}
                    onChange={() => toggleBulk(claim.id)}
                    className="mt-1 w-4 h-4 accent-blue-600"
                  />
                )}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-semibold text-slate-800">{claim.profiles?.full_name ?? '–'}</p>
                      <p className="text-sm text-slate-500">
                        {TYPE_LABELS[claim.claim_type]} · {claim.claim_date}
                      </p>
                    </div>
                    <p className="text-lg font-bold text-slate-900">RM {claimAmount(claim).toFixed(2)}</p>
                  </div>

                  {claim.claim_type === 'overnight' && (
                    <p className="text-sm text-slate-500 mb-3">
                      {claim.destination} · {claim.nights} night{claim.nights !== 1 ? 's' : ''}
                    </p>
                  )}

                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-400">
                      Submitted {new Date(claim.submitted_at).toLocaleDateString('en-MY')}
                    </p>
                    {claim.status === 'pending' ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => approve(claim.id)}
                          disabled={loading === claim.id}
                          className="px-4 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                        >
                          {loading === claim.id ? '…' : 'Approve'}
                        </button>
                        <button
                          onClick={() => { setRejectModal(claim); setRejectNote('') }}
                          className="px-4 py-1.5 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200"
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                        claim.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {claim.status.charAt(0).toUpperCase() + claim.status.slice(1)}
                      </span>
                    )}
                  </div>
                  {claim.rejection_note && (
                    <p className="text-xs text-red-600 mt-2">{claim.rejection_note}</p>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Reject modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-lg font-bold text-slate-900 mb-1">Reject claim</h2>
            <p className="text-sm text-slate-500 mb-5">
              {rejectModal.profiles?.full_name} — {TYPE_LABELS[rejectModal.claim_type]} — RM {claimAmount(rejectModal).toFixed(2)}
            </p>
            <textarea
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              placeholder="Reason for rejection (required)"
              required
              rows={3}
              className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 mb-4"
            />
            <div className="flex gap-3">
              <button onClick={() => setRejectModal(null)}
                className="flex-1 py-2.5 border border-slate-200 rounded-xl text-slate-700 font-medium text-sm">
                Cancel
              </button>
              <button
                onClick={() => reject(rejectModal.id, rejectNote)}
                disabled={!rejectNote.trim() || loading === rejectModal.id}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-medium text-sm disabled:opacity-50"
              >
                {loading === rejectModal.id ? 'Rejecting…' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
