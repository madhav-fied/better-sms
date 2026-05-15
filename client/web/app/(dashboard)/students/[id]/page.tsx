'use client';
import { useQuery } from '@tanstack/react-query';
import { getStudent } from '@/lib/api/students';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { use } from 'react';

export default function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, isLoading } = useQuery({ queryKey: ['student', id], queryFn: () => getStudent(id) });
  const s = data?.data;

  if (isLoading) return <Skeleton className="h-48 w-full" />;
  if (!s) return <p className="text-gray-400">Student not found</p>;

  return (
    <div className="space-y-4 max-w-xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{s.name}</h1>
        <div className="flex gap-2">
          <Badge variant={s.is_active ? 'default' : 'secondary'}>{s.is_active ? 'Active' : 'Inactive'}</Badge>
          <Link href={`/students/${id}/edit`} className="text-sm text-blue-600 hover:underline">Edit</Link>
        </div>
      </div>
      <div className="rounded-lg border bg-white p-4 space-y-2 text-sm">
        <Row label="Roll Number" value={s.roll_number} />
        <Row label="Class" value={`${s.class_name} ${s.section}`} />
        {s.phone && <Row label="Phone" value={s.phone} />}
        {s.dob && <Row label="Date of Birth" value={s.dob} />}
        {s.address && <Row label="Address" value={s.address} />}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-4">
      <span className="w-32 text-gray-400 shrink-0">{label}</span>
      <span>{value}</span>
    </div>
  );
}
