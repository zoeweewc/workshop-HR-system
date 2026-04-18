import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import type { AllowanceClaim } from '@/lib/supabase/types'

const TYPE_LABELS: Record<string, string> = {
  mileage: 'Mileage',
  overnight: 'Overnight / Outstation',
  toll_parking: 'Toll / Parking',
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
}

function claimAmount(c: AllowanceClaim): number {
  if (c.claim_type === 'mileage') return c.mileage_amount ?? 0
  if (c.claim_type === 'overnight') return c.overnight_amount ?? 0
  return c.actual_amount ?? 0
}

export default async function ClaimDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: claim } = await supabase
    .from('allowance_claims')
    .select('*')
    .eq('id', id)
    .eq('driver_id', user.id)
    .single()

  if (!claim) notFound()

  return (
    <div className="p-5 pt-8">
      <Link href="/claims" className="text-slate-400 hover:text-slate-600 mb-6 flex items-center gap-1 text-sm">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Claims
      </Link>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-slate-900">{TYPE_LABELS[claim.claim_type]}</h1>
        <span className={`text-sm px-3 py-1 rounded-full font-medium ${STATUS_COLORS[claim.status]}`}>
          {claim.status.charAt(0).toUpperCase() + claim.status.slice(1)}
        </span>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">
        <Row label="Date" value={claim.claim_date} />
        <Row label="Amount" value={`RM ${claimAmount(claim).toFixed(2)}`} bold />
        {claim.claim_type === 'overnight' && (
          <>
            <Row label="Destination" value={claim.destination ?? '–'} />
            <Row label="Nights" value={String(claim.nights ?? 0)} />
            <Row label="Rate / night" value={`RM ${(claim.overnight_rate ?? 0).toFixed(2)}`} />
          </>
        )}
        <Row label="Submitted" value={new Date(claim.submitted_at).toLocaleString('en-MY')} />
        {claim.reviewed_at && (
          <Row label="Reviewed" value={new Date(claim.reviewed_at).toLocaleString('en-MY')} />
        )}
      </div>

      {claim.status === 'rejected' && claim.rejection_note && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-2xl p-4">
          <p className="text-sm font-medium text-red-800 mb-1">Rejection reason</p>
          <p className="text-sm text-red-700">{claim.rejection_note}</p>
        </div>
      )}

      {claim.status === 'pending' && (
        <Link
          href={`/claims/${id}/edit`}
          className="mt-4 block w-full text-center border border-blue-500 text-blue-600 rounded-xl py-3 font-medium"
        >
          Edit Claim
        </Link>
      )}
    </div>
  )
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`text-sm ${bold ? 'font-bold text-slate-900' : 'text-slate-700'}`}>{value}</p>
    </div>
  )
}
