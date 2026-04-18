-- ============================================================
-- HR System Initial Schema
-- ============================================================

-- Profiles (extends auth.users)
CREATE TABLE profiles (
  id              uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name       text NOT NULL,
  phone           text UNIQUE NOT NULL,
  role            text NOT NULL CHECK (role IN ('driver', 'admin')),
  pay_type        text CHECK (pay_type IN ('monthly', 'daily')),
  monthly_salary  numeric(10,2),
  daily_rate      numeric(10,2),
  hourly_rate     numeric(10,2),
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Allowance config (single-row settings table)
CREATE TABLE allowance_config (
  id                      int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  mileage_rate            numeric(8,2) NOT NULL DEFAULT 30.00,
  overnight_rate          numeric(8,2) NOT NULL DEFAULT 80.00,
  working_days_per_month  int NOT NULL DEFAULT 26,
  ot_multiplier           numeric(4,2) NOT NULL DEFAULT 1.50,
  updated_at              timestamptz NOT NULL DEFAULT now(),
  updated_by              uuid REFERENCES profiles(id)
);

INSERT INTO allowance_config (id) VALUES (1);

-- Attendance (one row per driver per day)
CREATE TABLE attendance (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  work_date       date NOT NULL,
  clock_in_at     timestamptz NOT NULL,
  clock_out_at    timestamptz,
  total_minutes   int,
  regular_minutes int,
  ot_minutes      int,
  is_manual_edit  boolean NOT NULL DEFAULT false,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (driver_id, work_date)
);

-- Trigger: recalculate OT when clock_out_at is set
CREATE OR REPLACE FUNCTION recalculate_ot()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.clock_out_at IS NOT NULL THEN
    NEW.total_minutes   := EXTRACT(EPOCH FROM (NEW.clock_out_at - NEW.clock_in_at))::int / 60;
    NEW.regular_minutes := LEAST(NEW.total_minutes, 480);
    NEW.ot_minutes      := GREATEST(0, NEW.total_minutes - 480);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_recalculate_ot
  BEFORE INSERT OR UPDATE ON attendance
  FOR EACH ROW EXECUTE FUNCTION recalculate_ot();

-- Allowance claims
CREATE TABLE allowance_claims (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id        uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  claim_date       date NOT NULL,
  claim_type       text NOT NULL CHECK (claim_type IN ('mileage', 'overnight', 'toll_parking')),
  -- mileage
  mileage_amount   numeric(8,2),
  -- overnight
  destination      text,
  nights           int,
  overnight_rate   numeric(8,2),
  overnight_amount numeric(8,2) GENERATED ALWAYS AS (nights * overnight_rate) STORED,
  -- toll/parking
  actual_amount    numeric(8,2),
  receipt_url      text,
  -- approval
  status           text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by      uuid REFERENCES profiles(id),
  reviewed_at      timestamptz,
  rejection_note   text,
  submitted_at     timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- Payroll snapshots (immutable once generated)
CREATE TABLE payroll_snapshots (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id        uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  period_year      int NOT NULL,
  period_month     int NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  pay_type         text NOT NULL,
  base_pay         numeric(10,2) NOT NULL,
  total_ot_minutes int NOT NULL DEFAULT 0,
  ot_pay           numeric(10,2) NOT NULL DEFAULT 0,
  total_allowances numeric(10,2) NOT NULL DEFAULT 0,
  gross_pay        numeric(10,2) NOT NULL,
  days_worked      int NOT NULL DEFAULT 0,
  generated_at     timestamptz NOT NULL DEFAULT now(),
  generated_by     uuid REFERENCES profiles(id),
  UNIQUE (driver_id, period_year, period_month)
);

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance       ENABLE ROW LEVEL SECURITY;
ALTER TABLE allowance_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE allowance_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_snapshots ENABLE ROW LEVEL SECURITY;

-- Helper: get caller role
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS text AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- profiles
CREATE POLICY "profiles_select_own"    ON profiles FOR SELECT USING (id = auth.uid() OR get_my_role() = 'admin');
CREATE POLICY "profiles_update_admin"  ON profiles FOR UPDATE USING (get_my_role() = 'admin');
CREATE POLICY "profiles_insert_admin"  ON profiles FOR INSERT WITH CHECK (get_my_role() = 'admin');

-- attendance
CREATE POLICY "attendance_select"       ON attendance FOR SELECT USING (driver_id = auth.uid() OR get_my_role() = 'admin');
CREATE POLICY "attendance_insert_driver" ON attendance FOR INSERT WITH CHECK (driver_id = auth.uid());
CREATE POLICY "attendance_update"       ON attendance FOR UPDATE USING (
  (driver_id = auth.uid() AND clock_out_at IS NULL) OR get_my_role() = 'admin'
);

-- allowance_claims
CREATE POLICY "claims_select"         ON allowance_claims FOR SELECT USING (driver_id = auth.uid() OR get_my_role() = 'admin');
CREATE POLICY "claims_insert_driver"  ON allowance_claims FOR INSERT WITH CHECK (driver_id = auth.uid());
CREATE POLICY "claims_update"         ON allowance_claims FOR UPDATE USING (
  (driver_id = auth.uid() AND status = 'pending') OR get_my_role() = 'admin'
);

-- allowance_config
CREATE POLICY "config_select_all"     ON allowance_config FOR SELECT USING (true);
CREATE POLICY "config_update_admin"   ON allowance_config FOR UPDATE USING (get_my_role() = 'admin');

-- payroll_snapshots
CREATE POLICY "snapshot_select"       ON payroll_snapshots FOR SELECT USING (driver_id = auth.uid() OR get_my_role() = 'admin');
CREATE POLICY "snapshot_insert_admin" ON payroll_snapshots FOR INSERT WITH CHECK (get_my_role() = 'admin');

-- ============================================================
-- pg_cron: flag missed clock-outs at 01:00 daily
-- (Requires pg_cron extension — enable in Supabase dashboard)
-- ============================================================
-- SELECT cron.schedule(
--   'flag-missed-clockouts',
--   '0 1 * * *',
--   $$
--     UPDATE attendance
--     SET is_manual_edit = true,
--         notes = COALESCE(notes || ' | ', '') || 'Auto-flagged: no clock-out recorded'
--     WHERE clock_out_at IS NULL
--       AND work_date < CURRENT_DATE;
--   $$
-- );
