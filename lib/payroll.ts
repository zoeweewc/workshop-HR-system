import type { Attendance, AllowanceClaim, Profile, AllowanceConfig } from './supabase/types'

export interface PayrollResult {
  driverId: string
  payType: string
  basePay: number
  daysWorked: number
  totalOtMinutes: number
  otPay: number
  totalAllowances: number
  grossPay: number
}

export function computePayroll(
  profile: Profile,
  attendanceRows: Attendance[],
  approvedClaims: AllowanceClaim[],
  config: AllowanceConfig
): PayrollResult {
  const daysWorked = attendanceRows.filter((a) => a.clock_out_at !== null).length
  const hourlyRate = profile.hourly_rate ?? deriveHourlyRate(profile, config)

  let basePay = 0
  if (profile.pay_type === 'monthly') {
    basePay = profile.monthly_salary ?? 0
  } else {
    basePay = daysWorked * (profile.daily_rate ?? 0)
  }

  const totalOtMinutes = attendanceRows.reduce((sum, a) => sum + (a.ot_minutes ?? 0), 0)
  const otPay = (totalOtMinutes / 60) * hourlyRate * config.ot_multiplier

  const totalAllowances = approvedClaims.reduce((sum, c) => {
    if (c.claim_type === 'mileage') return sum + (c.mileage_amount ?? 0)
    if (c.claim_type === 'overnight') return sum + (c.overnight_amount ?? 0)
    if (c.claim_type === 'toll_parking') return sum + (c.actual_amount ?? 0)
    return sum
  }, 0)

  const grossPay = basePay + otPay + totalAllowances

  return {
    driverId: profile.id,
    payType: profile.pay_type ?? 'monthly',
    basePay: round2(basePay),
    daysWorked,
    totalOtMinutes,
    otPay: round2(otPay),
    totalAllowances: round2(totalAllowances),
    grossPay: round2(grossPay),
  }
}

export function deriveHourlyRate(profile: Profile, config: AllowanceConfig): number {
  if (profile.pay_type === 'monthly' && profile.monthly_salary) {
    return profile.monthly_salary / config.working_days_per_month / 8
  }
  if (profile.pay_type === 'daily' && profile.daily_rate) {
    return profile.daily_rate / 8
  }
  return 0
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export function formatRM(amount: number): string {
  return `RM ${amount.toFixed(2)}`
}

export function monthLabel(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleDateString('en-MY', {
    month: 'long',
    year: 'numeric',
  })
}
