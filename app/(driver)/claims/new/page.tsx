'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { AllowanceConfig } from '@/lib/supabase/types'

type ClaimType = 'mileage' | 'overnight' | 'toll_parking'

export default function NewClaimPage() {
  const router = useRouter()
  const [type, setType] = useState<ClaimType | null>(null)
  const [config, setConfig] = useState<AllowanceConfig | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Form fields
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [destination, setDestination] = useState('')
  const [nights, setNights] = useState(1)
  const [actualAmount, setActualAmount] = useState('')

  useEffect(() => {
    createClient()
      .from('allowance_config')
      .select('*')
      .single()
      .then(({ data }) => setConfig(data))
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!type || !config) return
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.replace('/login'); return }

    // Check if period is locked
    const d = new Date(date)
    const { data: snapshot } = await supabase
      .from('payroll_snapshots')
      .select('id')
      .eq('driver_id', user.id)
      .eq('period_year', d.getFullYear())
      .eq('period_month', d.getMonth() + 1)
      .maybeSingle()

    if (snapshot) {
      setError(`Payroll for ${d.toLocaleDateString('en-MY', { month: 'long', year: 'numeric' })} is finalized. Contact admin.`)
      setLoading(false)
      return
    }

    let insertError: { message: string } | null = null

    if (type === 'mileage') {
      const { error } = await supabase.from('allowance_claims').insert({
        driver_id: user.id,
        claim_date: date,
        claim_type: type,
        mileage_amount: config.mileage_rate,
      })
      insertError = error
    } else if (type === 'overnight') {
      if (!destination || nights < 1) {
        setError('Please fill in destination and number of nights.')
        setLoading(false)
        return
      }
      const { error } = await supabase.from('allowance_claims').insert({
        driver_id: user.id,
        claim_date: date,
        claim_type: type,
        destination,
        nights,
        overnight_rate: config.overnight_rate,
      })
      insertError = error
    } else {
      const amount = parseFloat(actualAmount)
      if (!amount || amount <= 0) {
        setError('Please enter a valid amount.')
        setLoading(false)
        return
      }
      const { error } = await supabase.from('allowance_claims').insert({
        driver_id: user.id,
        claim_date: date,
        claim_type: type,
        actual_amount: amount,
      })
      insertError = error
    }

    if (insertError) {
      setError(insertError.message)
      setLoading(false)
      return
    }

    router.push('/claims')
  }

  const typeOptions: { value: ClaimType; label: string; desc: string; icon: string }[] = [
    { value: 'mileage', label: 'Mileage', desc: `RM ${config?.mileage_rate?.toFixed(2) ?? '–'} flat rate`, icon: '🚗' },
    { value: 'overnight', label: 'Overnight', desc: `RM ${config?.overnight_rate?.toFixed(2) ?? '–'} per night`, icon: '🌙' },
    { value: 'toll_parking', label: 'Toll / Parking', desc: 'Actual amount', icon: '🅿️' },
  ]

  return (
    <div className="p-5 pt-8">
      <button onClick={() => router.back()} className="text-slate-400 hover:text-slate-600 mb-6 flex items-center gap-1 text-sm">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </button>

      <h1 className="text-xl font-bold text-slate-900 mb-6">New Claim</h1>

      {/* Type selector */}
      <p className="text-sm font-medium text-slate-700 mb-3">Claim type</p>
      <div className="grid grid-cols-3 gap-3 mb-6">
        {typeOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setType(opt.value)}
            className={`rounded-2xl border p-3 text-left transition-colors ${
              type === opt.value
                ? 'border-blue-500 bg-blue-50'
                : 'border-slate-200 bg-white'
            }`}
          >
            <span className="text-2xl">{opt.icon}</span>
            <p className="text-sm font-semibold text-slate-800 mt-2">{opt.label}</p>
            <p className="text-xs text-slate-500 mt-0.5">{opt.desc}</p>
          </button>
        ))}
      </div>

      {/* Dynamic form */}
      {type && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              required
              className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {type === 'mileage' && config && (
            <div className="bg-blue-50 rounded-xl p-4">
              <p className="text-sm text-blue-800">
                Flat rate: <strong>RM {config.mileage_rate.toFixed(2)}</strong>
              </p>
            </div>
          )}

          {type === 'overnight' && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Destination</label>
                <input
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="e.g. Penang, JB"
                  required
                  className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Number of nights</label>
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => setNights(Math.max(1, nights - 1))}
                    className="w-10 h-10 rounded-xl border border-slate-200 text-xl font-bold text-slate-600 flex items-center justify-center">−</button>
                  <span className="text-xl font-bold w-8 text-center">{nights}</span>
                  <button type="button" onClick={() => setNights(nights + 1)}
                    className="w-10 h-10 rounded-xl border border-slate-200 text-xl font-bold text-slate-600 flex items-center justify-center">+</button>
                </div>
              </div>
              {config && (
                <div className="bg-blue-50 rounded-xl p-4">
                  <p className="text-sm text-blue-800">
                    {nights} night{nights > 1 ? 's' : ''} × RM {config.overnight_rate.toFixed(2)} = <strong>RM {(nights * config.overnight_rate).toFixed(2)}</strong>
                  </p>
                </div>
              )}
            </>
          )}

          {type === 'toll_parking' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Amount (RM)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={actualAmount}
                onChange={(e) => setActualAmount(e.target.value)}
                placeholder="0.00"
                required
                className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {error && (
            <p className="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white rounded-xl py-3 font-semibold disabled:opacity-50 transition-colors hover:bg-blue-700"
          >
            {loading ? 'Submitting…' : 'Submit Claim'}
          </button>
        </form>
      )}
    </div>
  )
}
