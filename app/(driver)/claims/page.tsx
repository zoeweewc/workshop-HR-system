import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { AllowanceClaim } from '@/lib/supabase/types'

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
}

const TYPE_LABELS: Record<string, string> = {
  mileage: 'Mileage',
  overnight: 'Overnight',
  toll_parking: 'Toll / Parking',
}

function claimAmount(c: AllowanceClaim): string {
  let amount = 0
  if (c.claim_type === 'mileage') amount = c.mileage_amount ?? 0
  else if (c.claim_type === 'overnight') amount = c.overnight_amount ?? 0
  else amount = c.actual_amount ?? 0
  return `RM ${amount.toFixed(2)}`
}

export default async function ClaimsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>
}) {
  const { filter = 'all' } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  let query = supabase
    .from('allowance_claims')
    .select('*')
    .eq('driver_id', user.id)
    .order('submitted_at', { ascending: false })

  if (filter === 'pending' || filter === 'approved' || filter === 'rejected') {
    query = query.eq('status', filter)
  }

  const { data: claims } = await query

  const tabs = ['all', 'pending', 'approved', 'rejected']

  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-6 pt-4">
        <h1 className="text-xl font-bold text-slate-900">My Claims</h1>
        <Link
          href="/claims/new"
          className="bg-blue-600 text-white rounded-xl px-4 py-2 text-sm font-medium"
        >
          + New
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {tabs.map((tab) => (
          <Link
            key={tab}
            href={`/claims?filter=${tab}`}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              filter === tab
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-slate-200 text-slate-600'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </Link>
        ))}
      </div>

      {/* Claims list */}
      {!claims?.length ? (
        <div className="text-center py-16 text-slate-400">
          <svg className="w-12 h-12 mx-auto mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="text-sm">No claims found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {claims.map((claim) => (
            <Link
              key={claim.id}
              href={`/claims/${claim.id}`}
              className="block bg-white border border-slate-200 rounded-2xl p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <p className="font-semibold text-slate-800">{TYPE_LABELS[claim.claim_type]}</p>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${STATUS_COLORS[claim.status]}`}>
                  {claim.status.charAt(0).toUpperCase() + claim.status.slice(1)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">{claim.claim_date}</p>
                <p className="font-bold text-slate-900">{claimAmount(claim)}</p>
              </div>
              {claim.status === 'rejected' && claim.rejection_note && (
                <p className="text-xs text-red-600 mt-2 bg-red-50 rounded-lg px-2 py-1">
                  {claim.rejection_note}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
