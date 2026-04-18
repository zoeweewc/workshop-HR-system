'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function VerifyPage() {
  const router = useRouter()
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [countdown, setCountdown] = useState(60)
  const [phone, setPhone] = useState('')
  const inputs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    const stored = sessionStorage.getItem('otp_phone')
    if (!stored) { router.replace('/login'); return }
    setPhone(stored)
    const t = setInterval(() => setCountdown((c) => (c > 0 ? c - 1 : 0)), 1000)
    return () => clearInterval(t)
  }, [router])

  function handleChange(idx: number, value: string) {
    if (!/^\d*$/.test(value)) return
    const next = [...otp]
    next[idx] = value.slice(-1)
    setOtp(next)
    if (value && idx < 5) inputs.current[idx + 1]?.focus()
    if (next.every((d) => d !== '')) verify(next.join(''))
  }

  function handleKeyDown(idx: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) {
      inputs.current[idx - 1]?.focus()
    }
  }

  async function verify(token: string) {
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error: verifyError } = await supabase.auth.verifyOtp({
      phone,
      token,
      type: 'sms',
    })

    if (verifyError) {
      setError('Invalid or expired code. Please try again.')
      setOtp(['', '', '', '', '', ''])
      inputs.current[0]?.focus()
      setLoading(false)
      return
    }

    const { data: { user: verifiedUser } } = await supabase.auth.getUser()
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', verifiedUser?.id ?? '')
      .single()

    if (!profile) {
      setError('Account not set up. Contact your admin.')
      setLoading(false)
      return
    }

    sessionStorage.removeItem('otp_phone')
    router.push(profile.role === 'admin' ? '/admin/dashboard' : '/dashboard')
  }

  async function resend() {
    if (countdown > 0) return
    const supabase = createClient()
    await supabase.auth.signInWithOtp({ phone })
    setCountdown(60)
    setOtp(['', '', '', '', '', ''])
    inputs.current[0]?.focus()
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        <button onClick={() => router.back()} className="text-slate-400 hover:text-slate-600 mb-6 flex items-center gap-1 text-sm">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        <h1 className="text-2xl font-bold text-slate-900 mb-1">Enter OTP</h1>
        <p className="text-slate-500 text-sm mb-8">
          Sent to <span className="font-medium text-slate-700">{phone}</span>
        </p>

        <div className="flex gap-2 justify-between mb-6">
          {otp.map((digit, idx) => (
            <input
              key={idx}
              ref={(el) => { inputs.current[idx] = el }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(idx, e.target.value)}
              onKeyDown={(e) => handleKeyDown(idx, e)}
              disabled={loading}
              className="w-12 h-12 text-center text-xl font-semibold border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
            />
          ))}
        </div>

        {error && (
          <p className="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2 mb-4">{error}</p>
        )}

        {loading && (
          <p className="text-center text-sm text-slate-500 mb-4">Verifying…</p>
        )}

        <button
          onClick={resend}
          disabled={countdown > 0}
          className="w-full text-sm text-slate-500 hover:text-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {countdown > 0 ? `Resend in ${countdown}s` : 'Resend OTP'}
        </button>
      </div>
    </main>
  )
}
