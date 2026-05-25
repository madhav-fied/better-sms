import type { Student } from '@/types/student';
import type { Staff } from '@/types/staff';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapStudent(raw: Record<string, any>): Student {
  return {
    id: raw.id,
    name: `${raw.first_name ?? ''} ${raw.last_name ?? ''}`.trim(),
    admission_no: raw.admission_no ?? '',
    roll_number: raw.roll_number ?? undefined,
    class_section_id: raw.class_section_id ?? '',
    class_name: raw.class_name ?? '',
    section: raw.section ?? '',
    is_active: raw.status === 'active',
    // Personal
    gender: raw.gender ?? undefined,
    email: raw.email ?? undefined,
    phone: raw.sms_mobile ?? undefined,
    whatsapp_mobile: raw.whatsapp_mobile ?? undefined,
    dob: raw.dob ?? undefined,
    blood_group: raw.blood_group ?? undefined,
    // IDs
    full_student_uid: raw.full_student_uid ?? undefined,
    aadhar_no: raw.aadhar_no ?? undefined,
    apaar_id: raw.apaar_id ?? undefined,
    pen: raw.pen ?? undefined,
    cbse_reg_no: raw.cbse_reg_no ?? undefined,
    saral_id: raw.saral_id ?? undefined,
    card_number: raw.card_number ?? undefined,
    ledger_no: raw.ledger_no ?? undefined,
    // Address
    contact_address: raw.contact_address ?? undefined,
    permanent_address: raw.permanent_address ?? undefined,
    city_state: raw.city_state ?? undefined,
    pin_code: raw.pin_code ?? undefined,
    // Academic
    fee_type: raw.fee_type ?? undefined,
    student_type: raw.student_type ?? undefined,
    hosteller: raw.hosteller ?? undefined,
    admission_type: raw.admission_type ?? undefined,
    last_school_name: raw.last_school_name ?? undefined,
    // Relations
    parent_guardians: raw.parent_guardians ?? undefined,
  };
}

export function mapStaff(raw: Record<string, unknown>): Staff {
  const name = String(raw.name ?? `${raw.first_name ?? ''} ${raw.last_name ?? ''}`.trim());
  return {
    ...(raw as unknown as Staff),
    id: String(raw.id),
    name,
    phone: (raw.mobile as string | null) ?? undefined,
    mobile: (raw.mobile as string | null) ?? undefined,
    role: String(raw.category ?? raw.role ?? ''),
    category: String(raw.category ?? ''),
    is_active: raw.status === 'active',
  };
}

export const ENQUIRY_STATUS_LABEL: Record<string, string> = {
  open: 'Open',
  converted: 'Converted',
  rejected: 'Rejected',
};
