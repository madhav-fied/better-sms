export interface StaffJobDetail {
  id: string;
  staff_id: string;
  joined_date?: string;
  end_of_probation?: string;
  position?: string;
  effective_date?: string;
  superior?: string;
  department?: string;
  branch?: string;
  job_type?: string;
  job_status?: string;
  workdays?: number;
  holidays?: number;
}

export interface Staff {
  id: string;
  school_id: string;
  emp_code?: string;
  first_name: string;
  last_name?: string;
  short_name?: string;
  gender: string;
  email?: string;
  mobile?: string;
  dob?: string;
  religion?: string;
  aadhar_no?: string;
  blood_group?: string;
  caste_category?: string;
  contact_address?: string;
  pincode?: string;
  permanent_address?: string;
  city_state?: string;
  category: string;
  designation?: string;
  qualification?: string;
  teaching_type?: string;
  grade?: string;
  basic_salary?: number;
  total_experience?: number;
  card_number?: string;
  relieving_date?: string;
  licensee_number?: string;
  passport_number?: string;
  emergency_mobile?: string;
  father_first_name?: string;
  father_last_name?: string;
  mother_first_name?: string;
  mother_last_name?: string;
  marital_status?: string;
  spouse_name?: string;
  photo_url?: string;
  status: string;
  created_at: string;
  job_detail?: StaffJobDetail;
  // legacy fields from old API (keep for compat)
  name?: string;
  phone?: string;
  role?: string;
  is_active?: boolean;
}
