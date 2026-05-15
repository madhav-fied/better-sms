export interface AttendanceRecord {
  student_id: string;
  date: string;
  period?: number;
  status: 'present' | 'absent' | 'leave';
}
