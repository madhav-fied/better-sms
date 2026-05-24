export interface ParentGuardian {
  id: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  relation: string;
  phone?: string;
  email?: string;
  is_primary?: boolean;
  occupation?: string;
}

export interface Student {
  id: string;
  name: string;
  admission_no: string;
  roll_number?: string;
  class_section_id: string;
  class_name: string;
  section: string;
  is_active: boolean;
  // Personal
  gender?: string;
  email?: string;
  phone?: string;
  whatsapp_mobile?: string;
  dob?: string;
  blood_group?: string;
  // IDs
  full_student_uid?: string;
  aadhar_no?: string;
  apaar_id?: string;
  pen?: string;
  cbse_reg_no?: string;
  saral_id?: string;
  card_number?: string;
  ledger_no?: string;
  // Address
  contact_address?: string;
  permanent_address?: string;
  city_state?: string;
  pin_code?: string;
  // Academic
  fee_type?: string;
  student_type?: string;
  hosteller?: boolean;
  admission_type?: string;
  last_school_name?: string;
  // Relations
  parent_guardians?: ParentGuardian[];
}

export interface ClassSection {
  id: string;
  class_name: string;
  section: string;
  class_teacher_id?: string;
}
