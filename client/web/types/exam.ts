export interface Exam {
  id: string;
  name: string;
  academic_year_id: string;
  start_date: string;
  end_date: string;
  status: 'draft' | 'published';
}

export interface ExamSchedule {
  id: string;
  exam_id: string;
  class_section_id: string;
  subject_id: string;
  date: string;
  start_time: string;
  max_marks: number;
}
