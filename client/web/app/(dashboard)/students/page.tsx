'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getStudents } from '@/lib/api/students';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { Student } from '@/types/student';

export default function StudentsPage() {
  const [search, setSearch] = useState('');
  const { data, isLoading } = useQuery({
    queryKey: ['students', search],
    queryFn: () => getStudents({ search, limit: 20 }),
  });
  const students: Student[] = data?.data ?? [];

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Students</h1>
      <Input
        placeholder="Search by name or roll number…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />
      <div className="rounded-lg border bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Roll No</th>
              <th className="px-4 py-3 text-left">Class</th>
              <th className="px-4 py-3 text-left">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading
              ? Array(5).fill(0).map((_, i) => (
                  <tr key={i}><td colSpan={4} className="px-4 py-3"><Skeleton className="h-4" /></td></tr>
                ))
              : students.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link href={`/students/${s.id}`} className="text-blue-600 hover:underline">{s.name}</Link>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{s.roll_number}</td>
                    <td className="px-4 py-3">{s.class_name} {s.section}</td>
                    <td className="px-4 py-3">
                      <Badge variant={s.is_active ? 'default' : 'secondary'}>
                        {s.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                  </tr>
                ))}
            {!isLoading && students.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">No students found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
