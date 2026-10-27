// Shift Type Models
export interface ShiftType {
  id: number;
  organization: number;
  department?: number | null;
  department_details?: { id: number; name: string; description?: string };
  name: string;
  start_time: string;
  end_time: string;
  color: string;
  required_qualifications: number[];
  qualification_details?: any[];
  min_employees: number;
  night_hours: number;
  break_duration: number;
  works_on_saturday: boolean;
  works_on_sunday: boolean;
  created_at: string;
}

// Shift Models
export type ShiftStatus = 'draft' | 'published' | 'completed';

export interface Shift {
  id: number;
  organization: number;
  shift_type: number;
  shift_type_details?: ShiftType;
  employee?: number;
  employee_details?: any;
  date: string;
  start_time: string;
  end_time: string;
  status: ShiftStatus;
  status_display: string;
  notes?: string;
  duration_hours: number;
  created_at: string;
  updated_at: string;
  created_by?: number;
  created_by_name?: string;
}

// Helper Types
export interface ComplianceCheck {
  employee: any;
  date: string;
  violations: ComplianceViolation[];
  is_compliant: boolean;
}

export interface ComplianceViolation {
  type: string;
  message: string;
  severity: 'error' | 'warning';
}
