import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ClaimsApproval from './ClaimsApproval'

export default async function AdminClaimsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { tab = 'pending' } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  let query = supabase
    .from('allowance_claims')
    .select('*, profiles(full_name)')
    .order('submitted_at', { ascending: false })

  if (tab === 'pending') query = query.eq('status', 'pending')

  const { data: claims } = await query

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-8">Claims</h1>
      <ClaimsApproval claims={claims ?? []} currentTab={tab} />
    </div>
  )
}
