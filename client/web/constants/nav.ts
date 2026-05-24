import { Role } from '@/types/auth';

export interface NavItem {
  label: string;
  href: string;
  children?: { label: string; href: string }[];
  roles: Role[];
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Schools', href: '/schools', roles: ['superadmin'] },
  { label: 'Dashboard', href: '/dashboard', roles: ['superadmin', 'admin', 'teacher', 'staff', 'parent'] },
  {
    label: 'Students', href: '/students', roles: ['admin', 'superadmin'],
    children: [
      { label: 'All Students', href: '/students' },
      { label: 'Enquiries', href: '/admissions/enquiries' },
      { label: 'Registrations', href: '/admissions/registrations' },
    ],
  },
  { label: 'Staff', href: '/staff', roles: ['admin', 'superadmin'] },
  {
    label: 'Attendance', href: '/attendance/students', roles: ['admin', 'superadmin', 'teacher'],
    children: [
      { label: 'Students', href: '/attendance/students' },
      { label: 'Staff', href: '/attendance/staff' },
    ],
  },
  { label: 'Homework', href: '/homework', roles: ['admin', 'superadmin', 'teacher'] },
  { label: 'Leaves', href: '/leaves', roles: ['admin', 'superadmin', 'teacher', 'staff'] },
  {
    label: 'Communications', href: '/communications/notices', roles: ['admin', 'superadmin', 'teacher'],
    children: [
      { label: 'Notices', href: '/communications/notices' },
      { label: 'Syllabus', href: '/communications/syllabus' },
      { label: 'Newsletters', href: '/communications/newsletters' },
      { label: 'Concerns', href: '/communications/concerns' },
    ],
  },
  { label: 'Timetable', href: '/timetable', roles: ['admin', 'superadmin', 'teacher'] },
  { label: 'Exams', href: '/exams', roles: ['admin', 'superadmin', 'teacher'] },
  { label: 'Results', href: '/results', roles: ['admin', 'superadmin', 'teacher'] },
  {
    label: 'Notices', href: '/communications/notices', roles: ['parent'],
  },
  {
    label: 'Concerns', href: '/communications/concerns', roles: ['parent'],
  },
  {
    label: 'Settings', href: '/settings/academic-years', roles: ['admin', 'superadmin'],
    children: [
      { label: 'Academic Years', href: '/settings/academic-years' },
      { label: 'Class Sections', href: '/settings/class-sections' },
      { label: 'Subjects', href: '/settings/subjects' },
      { label: 'Users', href: '/settings/users' },
    ],
  },
];
