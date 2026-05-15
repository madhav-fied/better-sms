export interface Staff {
  id: string;
  name: string;
  phone: string;
  role: string;
  subjects?: string[];
  is_active: boolean;
}
