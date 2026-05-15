export interface PeriodConfig {
  id: string;
  period_number: number;
  name: string;
  start_time: string;
  end_time: string;
}

export interface TimetableEntry {
  id: string;
  class_section_id: string;
  day_of_week: number;
  period_number: number;
  subject_id: string;
  teacher_id: string;
  subject_name?: string;
  teacher_name?: string;
}
