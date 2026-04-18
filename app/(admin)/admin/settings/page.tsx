import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SettingsForm from './SettingsForm'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: config } = await supabase.from('allowance_config').select('*').single()

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold text-slate-900 mb-8">Settings</h1>
      <SettingsForm config={config} adminId={user.id} />
    </div>
  )
}
