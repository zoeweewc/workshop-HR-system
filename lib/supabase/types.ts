export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string
          phone: string
          role: 'driver' | 'admin'
          pay_type: 'monthly' | 'daily' | null
          monthly_salary: number | null
          daily_rate: number | null
          hourly_rate: number | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id: string
          full_name: string
          phone: string
          role: 'driver' | 'admin'
          pay_type?: 'monthly' | 'daily' | null
          monthly_salary?: number | null
          daily_rate?: number | null
          hourly_rate?: number | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          phone?: string
          role?: 'driver' | 'admin'
          pay_type?: 'monthly' | 'daily' | null
          monthly_salary?: number | null
          daily_rate?: number | null
          hourly_rate?: number | null
          is_active?: boolean
          created_at?: string
        }
        Relationships: []
      }
      attendance: {
        Row: {
          id: string
          driver_id: string
          work_date: string
          clock_in_at: string
          clock_out_at: string | null
          total_minutes: number | null
          regular_minutes: number | null
          ot_minutes: number | null
          is_manual_edit: boolean
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          driver_id: string
          work_date: string
          clock_in_at: string
          clock_out_at?: string | null
          total_minutes?: number | null
          regular_minutes?: number | null
          ot_minutes?: number | null
          is_manual_edit?: boolean
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          driver_id?: string
          work_date?: string
          clock_in_at?: string
          clock_out_at?: string | null
          total_minutes?: number | null
          regular_minutes?: number | null
          ot_minutes?: number | null
          is_manual_edit?: boolean
          notes?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      allowance_claims: {
        Row: {
          id: string
          driver_id: string
          claim_date: string
          claim_type: 'mileage' | 'overnight' | 'toll_parking'
          mileage_amount: number | null
          destination: string | null
          nights: number | null
          overnight_rate: number | null
          overnight_amount: number | null
          actual_amount: number | null
          receipt_url: string | null
          status: 'pending' | 'approved' | 'rejected'
          reviewed_by: string | null
          reviewed_at: string | null
          rejection_note: string | null
          submitted_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          driver_id: string
          claim_date: string
          claim_type: 'mileage' | 'overnight' | 'toll_parking'
          mileage_amount?: number | null
          destination?: string | null
          nights?: number | null
          overnight_rate?: number | null
          actual_amount?: number | null
          receipt_url?: string | null
          status?: 'pending' | 'approved' | 'rejected'
          reviewed_by?: string | null
          reviewed_at?: string | null
          rejection_note?: string | null
          submitted_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          driver_id?: string
          claim_date?: string
          claim_type?: 'mileage' | 'overnight' | 'toll_parking'
          mileage_amount?: number | null
          destination?: string | null
          nights?: number | null
          overnight_rate?: number | null
          actual_amount?: number | null
          receipt_url?: string | null
          status?: 'pending' | 'approved' | 'rejected'
          reviewed_by?: string | null
          reviewed_at?: string | null
          rejection_note?: string | null
          submitted_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "allowance_claims_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      allowance_config: {
        Row: {
          id: number
          mileage_rate: number
          overnight_rate: number
          working_days_per_month: number
          ot_multiplier: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: number
          mileage_rate?: number
          overnight_rate?: number
          working_days_per_month?: number
          ot_multiplier?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: number
          mileage_rate?: number
          overnight_rate?: number
          working_days_per_month?: number
          ot_multiplier?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      payroll_snapshots: {
        Row: {
          id: string
          driver_id: string
          period_year: number
          period_month: number
          pay_type: string
          base_pay: number
          total_ot_minutes: number
          ot_pay: number
          total_allowances: number
          gross_pay: number
          days_worked: number
          generated_at: string
          generated_by: string | null
        }
        Insert: {
          id?: string
          driver_id: string
          period_year: number
          period_month: number
          pay_type: string
          base_pay: number
          total_ot_minutes?: number
          ot_pay?: number
          total_allowances?: number
          gross_pay: number
          days_worked?: number
          generated_at?: string
          generated_by?: string | null
        }
        Update: {
          id?: string
          driver_id?: string
          period_year?: number
          period_month?: number
          pay_type?: string
          base_pay?: number
          total_ot_minutes?: number
          ot_pay?: number
          total_allowances?: number
          gross_pay?: number
          days_worked?: number
          generated_at?: string
          generated_by?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_my_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Profile = Database['public']['Tables']['profiles']['Row']
export type Attendance = Database['public']['Tables']['attendance']['Row']
export type AllowanceClaim = Database['public']['Tables']['allowance_claims']['Row']
export type AllowanceConfig = Database['public']['Tables']['allowance_config']['Row']
export type PayrollSnapshot = Database['public']['Tables']['payroll_snapshots']['Row']
