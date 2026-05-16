'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getStudents, createStudent, getClassSections } from '@/lib/api/students';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import Link from 'next/link';
import { toast } from 'sonner';
import { Student, ClassSection } from '@/types/student';

const EMPTY_FORM = {
  first_name: '', last_name: '', gender: 'male', class_section_id: '',
  dob: '', blood_group: '', aadhar_no: '', hosteller: false,
};

export default function StudentsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const { data, isLoading } = useQuery({
    queryKey: ['students', search],
    queryFn: () => getStudents({ search: search || undefined, limit: 50 }),
  });
  const students: Student[] = data?.data ?? [];

  const { data: csData } = useQuery({
    queryKey: ['class-sections'],
    queryFn: () => getClassSections({ limit: 100 }),
    enabled: open,
  });
  const classSections: ClassSection[] = csData?.data ?? [];

  const set = <K extends keyof typeof EMPTY_FORM>(f: K, v: (typeof EMPTY_FORM)[K]) =>
    setForm((p) => ({ ...p, [f]: v }));

  const mutation = useMutation({
    mutationFn: createStudent,
    onSuccess: () => {
      toast.success('Student added');
      qc.invalidateQueries({ queryKey: ['students'] });
      setOpen(false);
      setForm(EMPTY_FORM);
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { error?: string } } };
      toast.error(e.response?.data?.error ?? 'Failed to add student');
    },
  });

  const submit = () => {
    if (!form.first_name.trim()) { toast.error('First name required'); return; }
    if (!form.last_name.trim()) { toast.error('Last name required'); return; }
    if (!form.class_section_id) { toast.error('Class section required'); return; }
    mutation.mutate({
      first_name: form.first_name,
      last_name: form.last_name,
      gender: form.gender,
      class_section_id: form.class_section_id,
      dob: form.dob || undefined,
      blood_group: form.blood_group || undefined,
      aadhar_no: form.aadhar_no || undefined,
      hosteller: form.hosteller,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Students</h1>
        <Button size="sm" onClick={() => setOpen(true)}>Add Student</Button>
      </div>

      <Input
        placeholder="Search by name or admission number…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      <div className="rounded-lg border bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Adm No</th>
              <th className="px-4 py-3 text-left">Class</th>
              <th className="px-4 py-3 text-left">Gender</th>
              <th className="px-4 py-3 text-left">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading
              ? Array(5).fill(0).map((_, i) => (
                  <tr key={i}><td colSpan={5} className="px-4 py-3"><Skeleton className="h-4" /></td></tr>
                ))
              : students.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link href={`/students/${s.id}`} className="text-blue-600 hover:underline font-medium">
                        {s.first_name} {s.last_name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{s.admission_no}</td>
                    <td className="px-4 py-3">{s.class_name ? `${s.class_name} ${s.section}` : '—'}</td>
                    <td className="px-4 py-3 capitalize text-gray-500">{s.gender}</td>
                    <td className="px-4 py-3">
                      <Badge variant={s.status === 'active' ? 'default' : 'secondary'}>
                        {s.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
            {!isLoading && students.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No students found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Student dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md overflow-y-auto max-h-[90vh]">
          <DialogHeader><DialogTitle>Add Student</DialogTitle></DialogHeader>
          <div className="space-y-3 py-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>First Name <span className="text-red-500">*</span></Label>
                <Input value={form.first_name} onChange={(e) => set('first_name', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Last Name <span className="text-red-500">*</span></Label>
                <Input value={form.last_name} onChange={(e) => set('last_name', e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Gender <span className="text-red-500">*</span></Label>
                <select
                  className="w-full border rounded-md px-3 py-2 text-sm"
                  value={form.gender}
                  onChange={(e) => set('gender', e.target.value)}
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label>Class Section <span className="text-red-500">*</span></Label>
                <select
                  className="w-full border rounded-md px-3 py-2 text-sm"
                  value={form.class_section_id}
                  onChange={(e) => set('class_section_id', e.target.value)}
                >
                  <option value="">— select —</option>
                  {classSections.map((cs) => (
                    <option key={cs.id} value={cs.id}>{cs.class_name} {cs.section}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Date of Birth</Label>
              <Input type="date" value={form.dob} onChange={(e) => set('dob', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Blood Group</Label>
                <Input value={form.blood_group} onChange={(e) => set('blood_group', e.target.value)} placeholder="e.g. A+" />
              </div>
              <div className="space-y-1">
                <Label>Aadhar No</Label>
                <Input value={form.aadhar_no} onChange={(e) => set('aadhar_no', e.target.value)} />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={form.hosteller}
                onChange={(e) => set('hosteller', e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              Hosteller
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={mutation.isPending}>Cancel</Button>
            <Button onClick={submit} disabled={mutation.isPending}>
              {mutation.isPending ? 'Adding…' : 'Add Student'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
