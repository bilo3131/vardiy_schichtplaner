import type { EmploymentType, UserRole } from '../models';

/** Every user role, from highest to lowest privilege. */
export const ALL_ROLES: UserRole[] = ['admin', 'hr', 'department_manager', 'team_leader', 'group_leader', 'employee'];

/** All leadership roles, i.e. everyone except plain employees. */
export const SUPERVISOR_ROLES: UserRole[] = ['admin', 'hr', 'department_manager', 'team_leader', 'group_leader'];

/** Roles that manage shift types and see department-wide statistics. */
export const MANAGER_ROLES: UserRole[] = ['admin', 'hr', 'department_manager'];

/** Roles with organisation-wide administrative rights. */
export const ADMIN_ROLES: UserRole[] = ['admin', 'hr'];

/** German display labels for user roles. */
export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrator',
  hr: 'Personalwesen',
  department_manager: 'Abteilungsleiter',
  team_leader: 'Teamleiter',
  group_leader: 'Gruppenleiter',
  employee: 'Mitarbeiter'
};

/** German display labels for employment types. */
export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  fulltime: 'Vollzeit',
  parttime: 'Teilzeit',
  minijob: 'Minijob',
  werkstudent: 'Werkstudent',
  apprentice: 'Ausbildung'
};

/**
 * Returns true if a user with `userRole` may manage (edit, approve, delete) records of a person
 * with `targetRole`: admin/HR manage everyone, department managers manage team/group leaders and
 * employees, team/group leaders manage employees only.
 */
export function canManageRole(userRole: string, targetRole: string | undefined): boolean {
  if (ADMIN_ROLES.includes(userRole as UserRole)) return true;
  if (userRole === 'department_manager') {
    return targetRole === 'team_leader' || targetRole === 'group_leader' || targetRole === 'employee';
  }
  if (userRole === 'team_leader' || userRole === 'group_leader') return targetRole === 'employee';
  return false;
}
