'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getStudent, updateStudent } from '@/lib/api/students';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { use } from 'react';
import { toast } from 'sonner';

export default function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['student', id], queryFn: () => getStudent(id) });
  const s = data?.data;

  const toggleStatus = useMutation({
    mutationFn: () => updateStudent(id, { status: s?.status === 'active' ? 'inactive' : 'active' }),
    onSuccess: () => {
      toast.success('Status updated');
      qc.invalidateQueries({ queryKey: ['student', id] });
    },
    onError: () => toast.error('Failed to update status'),
  });

  if (isLoading) return <Skeleton className="h-48 w-full" />;
  if (!s) return <p className="text-gray-400">Student not found</p>;

  const fullName = `${s.first_name} ${s.last_name}`;

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{fullName}</h1>
        <div className="flex items-center gap-2">
          <Badge variant={s.status === 'active' ? 'default' : 'secondary'}>{s.status}</Badge>
          <Button
            size="sm"
            variant="outline"
            onClick={() => toggleStatus.mutate()}
            disabled={toggleStatus.isPending}
          >
            {s.status === 'active' ? 'Deactivate' : 'Activate'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border bg-white p-4 space-y-2 text-sm">
          <p className="font-medium text-gray-700 mb-3">Academic Info</p>
          <Row label="Admission No" value={s.admission_no} />
          <Row label="Class" value={s.class_name ? `${s.class_name} ${s.section}` : '—'} />
          <Row label="Student Type" value={s.student_type} />
          <Row label="Admission Type" value={s.admission_type} />
          <Row label="Hosteller" value={s.hosteller ? 'Yes' : 'No'} />
          {s.reg_no && <Row label="Reg No" value={s.reg_no} />}
        </div>

        <div className="rounded-lg border bg-white p-4 space-y-2 text-sm">
          <p className="font-medium text-gray-700 mb-3">Personal Info</p>
          <Row label="Gender" value={s.gender} />
          {s.dob && <Row label="Date of Birth" value={s.dob} />}
          {s.blood_group && <Row label="Blood Group" value={s.blood_group} />}
          {s.aadhar_no && <Row label="Aadhar No" value={s.aadhar_no} />}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-4">
      <span className="w-32 text-gray-400 shrink-0 capitalize">{label}</span>
      <span className="capitalize">{value}</span>
    </div>
  );
}
