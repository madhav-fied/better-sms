export interface StaffJobDetail {
  joined_date?: string | null;
  end_of_probation?: string | null;
  position?: string | null;
  effective_date?: string | null;
  superior?: string | null;
  department?: string | null;
  branch?: string | null;
  job_type?: string | null;
  job_status?: string | null;
  workdays?: number | null;
  holidays?: number | null;
}

export interface Staff {
  id: string;
  name: string;
  phone?: string;
  mobile?: string;
  role: string;
  category?: string;
  subjects?: string[];
  is_active: boolean;
  emp_code?: string;
  first_name?: string;
  last_name?: string;
  short_name?: string;
  gender?: string;
  dob?: string;
  email?: string;
  religion?: string;
  aadhar_no?: string;
  blood_group?: string;
  caste_category?: string;
  emergency_mobile?: string;
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
  contact_address?: string;
  pincode?: string;
  permanent_address?: string;
  city_state?: string;
  father_first_name?: string;
  father_last_name?: string;
  mother_first_name?: string;
  mother_last_name?: string;
  marital_status?: string;
  spouse_name?: string;
  job_detail?: StaffJobDetail | null;
}
