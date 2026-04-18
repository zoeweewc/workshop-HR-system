import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import DriverEditForm from './DriverEditForm'

export default async function DriverDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: driver } = await supabase.from('profiles').select('*').eq('id', id).single()
  if (!driver) notFound()

  const { data: config } = await supabase.from('allowance_config').select('*').single()

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-900 mb-8">Edit Driver</h1>
      <DriverEditForm driver={driver} config={config} />
    </div>
  )
}
