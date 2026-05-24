'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getStudents } from '@/lib/api/students';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { buttonVariants } from '@/components/ui/button';
import Link from 'next/link';
import { Student } from '@/types/student';
import PageHeader from '@/components/layout/PageHeader';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Eye } from 'lucide-react';

export default function StudentsPage() {
  const [search, setSearch] = useState('');
  const { data, isLoading } = useQuery({
    queryKey: ['students', search],
    queryFn: () => getStudents({ search, limit: 20 }),
  });
  const students: Student[] = data?.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Students"
        description="Browse enrolled students, search by name or roll number, and open a student profile for full details."
        actions={
          <Link href="/admissions/enquiries" className={buttonVariants({ variant: 'outline' })}>
            Add via admissions
          </Link>
        }
      />

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="max-w-md space-y-2">
          <Label htmlFor="student-search" className="text-slate-700">
            Search students
          </Label>
          <Input
            id="student-search"
            placeholder="Type a name or roll number"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border-slate-200 bg-white"
          />
          <p className="text-xs leading-relaxed text-slate-500">
            Results update as you type. Leave blank to see the latest students.
          </p>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">Student list</h2>
          <p className="mt-1 text-sm text-slate-600">
            {isLoading ? 'Loading students…' : `${students.length} student${students.length === 1 ? '' : 's'} shown`}
          </p>
        </div>

        <Table>
          <TableHeader>
            <TableRow className="border-slate-200 hover:bg-transparent">
              <TableHead className="bg-slate-50 px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600">
                Name
              </TableHead>
              <TableHead className="bg-slate-50 px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600">
                Roll number
              </TableHead>
              <TableHead className="bg-slate-50 px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600">
                Class
              </TableHead>
              <TableHead className="bg-slate-50 px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600">
                Status
              </TableHead>
              <TableHead className="bg-slate-50 px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array(5)
                  .fill(0)
                  .map((_, i) => (
                    <TableRow key={i} className="border-slate-200">
                      <TableCell colSpan={5} className="px-6 py-4">
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
              : students.map((s) => (
                  <TableRow key={s.id} className="border-slate-200">
                    <TableCell className="px-6 py-4">
                      <Link
                        href={`/students/${s.id}`}
                        className="font-medium text-slate-900 underline-offset-4 hover:underline"
                      >
                        {s.name}
                      </Link>
                    </TableCell>
                    <TableCell className="px-6 py-4 text-slate-600">{s.roll_number}</TableCell>
                    <TableCell className="px-6 py-4 text-slate-700">
                      {s.class_name} {s.section}
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <Badge
                        variant={s.is_active ? 'default' : 'secondary'}
                        className="rounded-md border border-slate-200 px-2.5 py-0.5"
                      >
                        {s.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-6 py-4 text-right">
                      <Link
                        href={`/students/${s.id}`}
                        className={buttonVariants({ variant: 'outline', size: 'sm' })}
                      >
                        <Eye aria-hidden />
                        View profile
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
            {!isLoading && students.length === 0 && (
              <TableRow className="border-slate-200 hover:bg-transparent">
                <TableCell colSpan={5} className="px-6 py-12 text-center">
                  <p className="text-sm font-medium text-slate-700">No students found</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Try a different search term or add students through admissions.
                  </p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </section>
    </div>
  );
}
