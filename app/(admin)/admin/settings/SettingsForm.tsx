'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { AllowanceConfig } from '@/lib/supabase/types'

export default function SettingsForm({
  config,
  adminId,
}: {
  config: AllowanceConfig | null
  adminId: string
}) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const [mileageRate, setMileageRate] = useState(String(config?.mileage_rate ?? 30))
  const [overnightRate, setOvernightRate] = useState(String(config?.overnight_rate ?? 80))
  const [workingDays, setWorkingDays] = useState(String(config?.working_days_per_month ?? 26))
  const [otMultiplier, setOtMultiplier] = useState(String(config?.ot_multiplier ?? 1.5))

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess(false)

    const { error: updateError } = await createClient()
      .from('allowance_config')
      .update({
        mileage_rate: parseFloat(mileageRate),
        overnight_rate: parseFloat(overnightRate),
        working_days_per_month: parseInt(workingDays),
        ot_multiplier: parseFloat(otMultiplier),
        updated_at: new Date().toISOString(),
        updated_by: adminId,
      })
      .eq('id', 1)

    setSaving(false)
    if (updateError) { setError(updateError.message); return }
    setSuccess(true)
    router.refresh()
  }

  return (
    <form onSubmit={handleSave} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
      <h2 className="font-semibold text-slate-800">Allowance rates</h2>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Mileage flat rate (RM/day)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={mileageRate}
            onChange={(e) => setMileageRate(e.target.value)}
            className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Overnight rate (RM/night)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={overnightRate}
            onChange={(e) => setOvernightRate(e.target.value)}
            className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <hr className="border-slate-100" />
      <h2 className="font-semibold text-slate-800">Payroll calculation</h2>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Working days / month</label>
          <input
            type="number"
            step="1"
            min="1"
            max="31"
            value={workingDays}
            onChange={(e) => setWorkingDays(e.target.value)}
            className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-slate-400 mt-1">Used to derive hourly rate for monthly-salaried drivers</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">OT multiplier</label>
          <input
            type="number"
            step="0.1"
            min="1"
            max="3"
            value={otMultiplier}
            onChange={(e) => setOtMultiplier(e.target.value)}
            className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-slate-400 mt-1">1.5 = standard; 2.0 = rest day</p>
        </div>
      </div>

      {config?.updated_at && (
        <p className="text-xs text-slate-400">
          Last updated: {new Date(config.updated_at).toLocaleString('en-MY')}
        </p>
      )}

      {error && <p className="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>}
      {success && <p className="text-green-700 text-sm bg-green-50 rounded-lg px-3 py-2">Settings saved.</p>}

      <button
        type="submit"
        disabled={saving}
        className="w-full bg-blue-600 text-white rounded-xl py-3 font-semibold disabled:opacity-50 hover:bg-blue-700 transition-colors"
      >
        {saving ? 'Saving…' : 'Save Settings'}
      </button>
    </form>
  )
}
