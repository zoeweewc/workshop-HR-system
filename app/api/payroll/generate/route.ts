import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'
import { computePayroll } from '@/lib/payroll'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Verify admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { year, month } = await request.json()
  if (!year || !month) {
    return NextResponse.json({ error: 'year and month are required' }, { status: 400 })
  }

  const periodStart = `${year}-${String(month).padStart(2, '0')}-01`
  const periodEnd = new Date(year, month, 0).toISOString().split('T')[0]

  const [{ data: drivers }, { data: config }] = await Promise.all([
    supabase.from('profiles').select('*').eq('role', 'driver').eq('is_active', true),
    supabase.from('allowance_config').select('*').single(),
  ])

  if (!config || !drivers) {
    return NextResponse.json({ error: 'Failed to load config or drivers' }, { status: 500 })
  }

  const snapshots = await Promise.all(
    drivers.map(async (driver) => {
      const [{ data: attendance }, { data: claims }] = await Promise.all([
        supabase.from('attendance').select('*').eq('driver_id', driver.id)
          .gte('work_date', periodStart).lte('work_date', periodEnd),
        supabase.from('allowance_claims').select('*').eq('driver_id', driver.id)
          .gte('claim_date', periodStart).lte('claim_date', periodEnd).eq('status', 'approved'),
      ])

      const result = computePayroll(driver, attendance ?? [], claims ?? [], config)

      return {
        driver_id: driver.id,
        period_year: year,
        period_month: month,
        pay_type: result.payType,
        base_pay: result.basePay,
        total_ot_minutes: result.totalOtMinutes,
        ot_pay: result.otPay,
        total_allowances: result.totalAllowances,
        gross_pay: result.grossPay,
        days_worked: result.daysWorked,
        generated_by: user.id,
      }
    })
  )

  const { error } = await supabase
    .from('payroll_snapshots')
    .upsert(snapshots, { onConflict: 'driver_id,period_year,period_month' })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, count: snapshots.length })
}
