import { Role } from '@/types/auth';
import { NAV_ITEMS } from '@/constants/nav';

const PUBLIC_DASHBOARD_PATHS = ['/profile'];

function collectAllowedPaths(role: Role): string[] {
  const paths = new Set<string>(PUBLIC_DASHBOARD_PATHS);
  for (const item of NAV_ITEMS) {
    if (!item.roles.includes(role)) continue;
    paths.add(item.href);
    item.children?.forEach((c) => paths.add(c.href));
  }
  if (role === 'admin' || role === 'superadmin') {
    paths.add('/settings/school');
    paths.add('/exams');
  }
  if (role === 'parent') {
    paths.add('/communications/concerns/new');
    paths.add('/timetable');
  }
  if (role === 'student') {
    paths.add('/timetable');
  }
  if (role === 'teacher' || role === 'staff' || role === 'student') {
    paths.add('/leaves');
  }
  return [...paths];
}

export function canAccessRoute(role: Role | null, pathname: string): boolean {
  if (!role) return false;
  const allowed = collectAllowedPaths(role);
  if (allowed.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return true;
  if (pathname.startsWith('/students/') && (role === 'admin' || role === 'superadmin' || role === 'student' || role === 'parent')) {
    return true;
  }
  if (pathname.startsWith('/staff/') && (role === 'admin' || role === 'superadmin')) return true;
  if (pathname.startsWith('/homework/')) return ['admin', 'superadmin', 'teacher', 'student', 'parent'].includes(role);
  if (pathname.startsWith('/exams/') && role !== 'student' && role !== 'parent' && role !== 'staff') return true;
  if (pathname.startsWith('/communications/')) {
    if (role === 'parent' || role === 'student') {
      return pathname.includes('/notices') || pathname.includes('/concerns') || pathname.includes('/syllabus') || pathname.includes('/newsletters');
    }
    return ['admin', 'superadmin', 'teacher'].includes(role);
  }
  if (pathname.startsWith('/admissions/') && (role === 'admin' || role === 'superadmin')) return true;
  if (pathname.startsWith('/settings/') && (role === 'admin' || role === 'superadmin')) return true;
  if (pathname.startsWith('/attendance/') && ['admin', 'superadmin', 'teacher'].includes(role)) return true;
  return false;
}

export function getDefaultRoute(role: Role): string {
  return '/dashboard';
}
