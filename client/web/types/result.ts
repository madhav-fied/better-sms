export interface Result {
  id: string;
  student_id: string;
  student_name: string;
  exam_id: string;
  subject_id: string;
  marks_obtained: number;
  max_marks: number;
  grade?: string;
}
