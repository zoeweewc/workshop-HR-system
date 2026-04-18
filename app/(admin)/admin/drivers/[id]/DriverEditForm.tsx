'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Profile, AllowanceConfig } from '@/lib/supabase/types'
import { deriveHourlyRate } from '@/lib/payroll'

export default function DriverEditForm({
  driver,
  config,
}: {
  driver: Profile
  config: AllowanceConfig | null
}) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const [fullName, setFullName] = useState(driver.full_name)
  const [payType, setPayType] = useState<'monthly' | 'daily'>(driver.pay_type ?? 'monthly')
  const [monthlySalary, setMonthlySalary] = useState(String(driver.monthly_salary ?? ''))
  const [dailyRate, setDailyRate] = useState(String(driver.daily_rate ?? ''))
  const [isActive, setIsActive] = useState(driver.is_active)

  function derivedHourly(): string {
    if (!config) return '–'
    const mock: Profile = {
      ...driver,
      pay_type: payType,
      monthly_salary: payType === 'monthly' ? parseFloat(monthlySalary) || null : null,
      daily_rate: payType === 'daily' ? parseFloat(dailyRate) || null : null,
    }
    return deriveHourlyRate(mock, config).toFixed(2)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess(false)

    const hourlyRate = config
      ? parseFloat(derivedHourly())
      : driver.hourly_rate

    const { error: updateError } = await createClient()
      .from('profiles')
      .update({
        full_name: fullName,
        pay_type: payType,
        monthly_salary: payType === 'monthly' ? parseFloat(monthlySalary) || null : null,
        daily_rate: payType === 'daily' ? parseFloat(dailyRate) || null : null,
        hourly_rate: hourlyRate,
        is_active: isActive,
      })
      .eq('id', driver.id)

    setSaving(false)
    if (updateError) { setError(updateError.message); return }
    setSuccess(true)
    router.refresh()
  }

  return (
    <form onSubmit={handleSave} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Full name</label>
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone</label>
        <input
          value={driver.phone}
          disabled
          className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 text-slate-400 cursor-not-allowed"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Pay type</label>
        <div className="flex gap-3">
          {(['monthly', 'daily'] as const).map((pt) => (
            <button
              key={pt}
              type="button"
              onClick={() => setPayType(pt)}
              className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                payType === pt ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 text-slate-600'
              }`}
            >
              {pt.charAt(0).toUpperCase() + pt.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {payType === 'monthly' ? (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Monthly salary (RM)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={monthlySalary}
            onChange={(e) => setMonthlySalary(e.target.value)}
            className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      ) : (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Daily rate (RM)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={dailyRate}
            onChange={(e) => setDailyRate(e.target.value)}
            className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}

      <div className="bg-slate-50 rounded-xl px-4 py-3">
        <p className="text-sm text-slate-600">
          Derived hourly rate for OT: <strong className="text-slate-900">RM {derivedHourly()}/hr</strong>
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setIsActive(!isActive)}
          className={`relative w-10 h-6 rounded-full transition-colors ${isActive ? 'bg-green-500' : 'bg-slate-300'}`}
        >
          <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${isActive ? 'left-4.5' : 'left-0.5'}`} />
        </button>
        <label className="text-sm font-medium text-slate-700">{isActive ? 'Active' : 'Inactive'}</label>
      </div>

      {error && <p className="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>}
      {success && <p className="text-green-700 text-sm bg-green-50 rounded-lg px-3 py-2">Saved successfully.</p>}

      <button
        type="submit"
        disabled={saving}
        className="w-full bg-blue-600 text-white rounded-xl py-3 font-semibold disabled:opacity-50 hover:bg-blue-700 transition-colors"
      >
        {saving ? 'Saving…' : 'Save Changes'}
      </button>
    </form>
  )
}
