import type { Student } from '@/types/student';
import type { Staff } from '@/types/staff';

export function mapStudent(raw: {
  id: string;
  first_name: string;
  last_name: string;
  admission_no: string;
  class_section_id: string;
  status: string;
  class_name?: string;
  section?: string;
  sms_mobile?: string | null;
  dob?: string | null;
}): Student {
  return {
    id: raw.id,
    name: `${raw.first_name} ${raw.last_name}`.trim(),
    roll_number: raw.admission_no,
    class_section_id: raw.class_section_id,
    class_name: raw.class_name ?? '',
    section: raw.section ?? '',
    is_active: raw.status === 'active',
    phone: raw.sms_mobile ?? undefined,
    dob: raw.dob ?? undefined,
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
