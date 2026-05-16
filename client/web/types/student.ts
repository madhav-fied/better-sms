export interface Student {
  id: string;
  school_id: string;
  academic_year_id: string;
  admission_no: string;
  first_name: string;
  last_name: string;
  gender: string;
  dob?: string;
  blood_group?: string;
  aadhar_no?: string;
  reg_no?: string;
  class_section_id: string;
  class_name?: string;
  section?: string;
  student_type?: string;
  hosteller: boolean;
  admission_type?: string;
  status: string;
  registration_id?: string;
  created_at: string;
}

export interface ClassSection {
  id: string;
  school_id: string;
  academic_year_id: string;
  class_name: string;
  section: string;
  class_teacher_id?: string;
}
