export interface Student {
  id: string;
  name: string;
  roll_number: string;
  class_section_id: string;
  class_name: string;
  section: string;
  phone?: string;
  dob?: string;
  address?: string;
  is_active: boolean;
}

export interface ClassSection {
  id: string;
  class_name: string;
  section: string;
  class_teacher_id?: string;
}
