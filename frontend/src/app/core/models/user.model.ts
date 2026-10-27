// User Models
export type UserRole = 'admin' | 'hr' | 'department_manager' | 'team_leader' | 'group_leader' | 'employee';

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  role: UserRole;
  phone?: string;
  employee_id?: string;
  employee_profile?: { id: number; department?: number | null };
  organization: number;
  organization_name: string;
  is_active: boolean;
  date_joined: string;
  last_login?: string;
  theme_preference?: 'light' | 'dark';
  tutorial_completed?: boolean;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  message: string;
}

export interface ChangePasswordRequest {
  old_password: string;
  new_password: string;
  new_password2: string;
}
