export interface Notice {
  id: string;
  title: string;
  content: string;
  target_roles: string[];
  created_at: string;
}

export interface Concern {
  id: string;
  subject: string;
  message: string;
  status: 'open' | 'acknowledged' | 'resolved';
  created_at: string;
  replies?: ConcernReply[];
}

export interface ConcernReply {
  id: string;
  message: string;
  created_by_role: string;
  created_at: string;
}

export interface Syllabus {
  id: string;
  subject_id: string;
  class_section_id: string;
  content: string;
  created_at: string;
}

export interface Newsletter {
  id: string;
  title: string;
  content: string;
  created_at: string;
}
