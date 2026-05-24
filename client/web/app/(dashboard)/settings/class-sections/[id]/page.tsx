'use client';
import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ClassSectionPicker } from '@/components/shared/ClassSectionPicker';
import {
  getClassSection,
  getRosterStudents,
  assignStudentsToClass,
  removeStudentFromClass,
  getClassSubjects,
  assignSubjectToClass,
  updateClassSubject,
  removeClassSubject,
  getAcademicYears,
  getSubjects,
} from '@/lib/api/core';
import { getStudents } from '@/lib/api/students';
import { getStaff } from '@/lib/api/staff';
import { changeClassSection, migrateStudents } from '@/lib/api/students';
import PageHeader from '@/components/layout/PageHeader';
import ActionLink from '@/components/enterprise/ActionLink';

// ── Types ─────────────────────────────────────────────────────────────────────

interface CS {
  id: string;
  class_name: string;
  section: string;
  academic_year_id: string;
  academic_year_label?: string;
  class_teacher_name?: string;
  class_teacher_id?: string;
}

interface RosterStudent {
  id: string;
  first_name: string;
  last_name?: string;
  roll_number?: string;
  admission_no?: string;
  gender?: string;
  status?: string;
}

interface ClassSubject {
  id: string;
  subject: string;
  staff_id?: string;
  staff_name?: string;
  teacher_name?: string;
}

interface Student {
  id: string;
  first_name: string;
  last_name?: string;
  admission_no?: string;
  gender?: string;
}

interface StaffMember {
  id: string;
  first_name: string;
  last_name?: string;
  name?: string;
}

interface AY {
  id: string;
  label: string;
  is_active: boolean;
}

const SEL = 'w-full border border-input rounded-lg px-3 py-2 text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-ring/50 h-9';

function errMsg(err: unknown): string {
  const e = err as { response?: { data?: { error?: string } } };
  return e.response?.data?.error ?? 'Operation failed';
}

function studentFullName(s: { first_name: string; last_name?: string }): string {
  return `${s.first_name} ${s.last_name ?? ''}`.trim();
}

function staffFullName(s: StaffMember): string {
  return s.first_name ? `${s.first_name} ${s.last_name ?? ''}`.trim() : (s.name ?? s.id);
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ClassDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();

  const [tab, setTab] = useState<'roster' | 'subjects'>('roster');

  // ── Class Section Detail ───────────────────────────────────────────────────
  const { data: csData, isLoading: csLoading } = useQuery({
    queryKey: ['class-section', id],
    queryFn: () => getClassSection(id),
  });
  const cs: CS | undefined = csData?.data ?? csData;

  // ── Roster state ──────────────────────────────────────────────────────────
  const [rosterPage, setRosterPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // ── Roster query ──────────────────────────────────────────────────────────
  const { data: rosterData, isLoading: rosterLoading } = useQuery({
    queryKey: ['class-roster', id, rosterPage, search],
    queryFn: () => getRosterStudents(id, { page: rosterPage, limit: 50, search: search || undefined }),
    enabled: tab === 'roster',
  });
  const rosterStudents: RosterStudent[] = rosterData?.data ?? [];
  const rosterTotal: number = rosterData?.total ?? rosterData?.pagination?.total ?? rosterStudents.length;
  const rosterPageCount: number = rosterData?.pagination?.pages ?? (Math.ceil(rosterTotal / 50) || 1);

  // ── Subjects query ────────────────────────────────────────────────────────
  const { data: subjectsData, isLoading: subjectsLoading } = useQuery({
    queryKey: ['class-subjects', id],
    queryFn: () => getClassSubjects(id),
    enabled: tab === 'subjects',
  });
  const subjects: ClassSubject[] = subjectsData?.data ?? [];

  // ── Add Students dialog ───────────────────────────────────────────────────
  const [addStudentsOpen, setAddStudentsOpen] = useState(false);
  const [addSearch, setAddSearch] = useState('');
  const [addGender, setAddGender] = useState('');
  const [addStatus, setAddStatus] = useState('active');
  const [addSelected, setAddSelected] = useState<string[]>([]);

  const { data: allStudentsData, isLoading: allStudentsLoading } = useQuery({
    queryKey: ['students-search', addSearch, addGender, addStatus],
    queryFn: () =>
      getStudents({
        search: addSearch || undefined,
        gender: addGender || undefined,
        status: addStatus || undefined,
        limit: 200,
        unassigned: true,
      }),
    enabled: addStudentsOpen,
  });
  const availableStudents: Student[] = allStudentsData?.data ?? [];

  const toggleAddStudent = (sid: string) =>
    setAddSelected((prev) => prev.includes(sid) ? prev.filter((x) => x !== sid) : [...prev, sid]);

  const addStudentsMutation = useMutation({
    mutationFn: () => assignStudentsToClass(id, addSelected),
    onSuccess: () => {
      toast.success(`${addSelected.length} student(s) added to class`);
      qc.invalidateQueries({ queryKey: ['class-roster', id] });
      qc.invalidateQueries({ queryKey: ['class-section', id] });
      setAddStudentsOpen(false);
      setAddSelected([]);
      setAddSearch('');
      setAddGender('');
      setAddStatus('active');
    },
    onError: (err) => toast.error(errMsg(err)),
  });

  // ── Remove Student dialog ─────────────────────────────────────────────────
  const [removingStudent, setRemovingStudent] = useState<RosterStudent | null>(null);

  const removeStudentMutation = useMutation({
    mutationFn: (sid: string) => removeStudentFromClass(id, sid),
    onSuccess: () => {
      toast.success('Student removed from class');
      qc.invalidateQueries({ queryKey: ['class-roster', id] });
      qc.invalidateQueries({ queryKey: ['class-section', id] });
      setRemovingStudent(null);
    },
    onError: (err) => toast.error(errMsg(err)),
  });

  // ── Change Class dialog ───────────────────────────────────────────────────
  const [changeClassOpen, setChangeClassOpen] = useState(false);
  const [targetClassId, setTargetClassId] = useState('');

  const changeClassMutation = useMutation({
    mutationFn: () => changeClassSection({ student_ids: selectedIds, to_class_section_id: targetClassId }),
    onSuccess: () => {
      toast.success(`${selectedIds.length} student(s) moved`);
      qc.invalidateQueries({ queryKey: ['class-roster', id] });
      qc.invalidateQueries({ queryKey: ['class-section', id] });
      setChangeClassOpen(false);
      setSelectedIds([]);
      setTargetClassId('');
    },
    onError: (err) => toast.error(errMsg(err)),
  });

  // ── Year Migration wizard ─────────────────────────────────────────────────
  const [migrateOpen, setMigrateOpen] = useState(false);
  const [migrateStep, setMigrateStep] = useState<1 | 2 | 3>(1);
  const [migrateAyId, setMigrateAyId] = useState('');
  const [migrateClassId, setMigrateClassId] = useState('');
  const [migrateSelected, setMigrateSelected] = useState<string[]>([]);
  const [migrateResult, setMigrateResult] = useState<{ promoted?: number; skipped?: number; errors?: number } | null>(null);

  const { data: ayData } = useQuery({
    queryKey: ['academic-years'],
    queryFn: () => getAcademicYears({ limit: 50 }),
    enabled: migrateOpen,
  });
  const academicYears: AY[] = ayData?.data ?? [];

  const toggleMigrateStudent = (sid: string) =>
    setMigrateSelected((prev) => prev.includes(sid) ? prev.filter((x) => x !== sid) : [...prev, sid]);

  const openMigrate = () => {
    setMigrateStep(1);
    setMigrateAyId('');
    setMigrateClassId('');
    setMigrateSelected(rosterStudents.map((s) => s.id));
    setMigrateResult(null);
    setMigrateOpen(true);
  };

  const migrateMutation = useMutation({
    mutationFn: () =>
      migrateStudents({
        student_ids: migrateSelected,
        from_academic_year_id: cs?.academic_year_id ?? '',
        to_academic_year_id: migrateAyId,
        to_class_section_id: migrateClassId,
        promote_date: new Date().toISOString().slice(0, 10),
      }),
    onSuccess: (res) => {
      const d = res?.data ?? res ?? {};
      setMigrateResult({
        promoted: d.promoted ?? d.success ?? migrateSelected.length,
        skipped: d.skipped ?? 0,
        errors: d.errors ?? 0,
      });
      setMigrateStep(3);
      qc.invalidateQueries({ queryKey: ['class-roster', id] });
    },
    onError: (err) => toast.error(errMsg(err)),
  });

  // ── Assign Subject dialog ─────────────────────────────────────────────────
  const [assignSubjectOpen, setAssignSubjectOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<ClassSubject | null>(null);
  const [subjectName, setSubjectName] = useState('');
  const [subjectStaffId, setSubjectStaffId] = useState('');

  const { data: staffData } = useQuery({
    queryKey: ['staff', 'teachers-active'],
    queryFn: () => getStaff({ category: 'teacher', status: 'active', limit: 200 }),
    enabled: assignSubjectOpen,
  });
  const staffList: StaffMember[] = staffData?.data ?? [];

  const { data: subjectsCatalogData } = useQuery({
    queryKey: ['subjects-catalog'],
    queryFn: () => getSubjects({ is_active: true, limit: 200 }),
    enabled: assignSubjectOpen,
  });
  const subjectsCatalog: { id: string; name: string }[] = subjectsCatalogData?.data ?? [];

  const openAssignSubject = () => {
    setEditingSubject(null);
    setSubjectName('');
    setSubjectStaffId('');
    setAssignSubjectOpen(true);
  };

  const openEditSubject = (ts: ClassSubject) => {
    setEditingSubject(ts);
    setSubjectName(ts.subject);
    setSubjectStaffId(ts.staff_id ?? '');
    setAssignSubjectOpen(true);
  };

  const subjectMutation = useMutation({
    mutationFn: () =>
      editingSubject
        ? updateClassSubject(id, editingSubject.id, { staff_id: subjectStaffId, subject: subjectName })
        : assignSubjectToClass(id, { subject: subjectName, staff_id: subjectStaffId }),
    onSuccess: () => {
      toast.success(editingSubject ? 'Subject updated' : 'Subject assigned');
      qc.invalidateQueries({ queryKey: ['class-subjects', id] });
      qc.invalidateQueries({ queryKey: ['class-section', id] });
      setAssignSubjectOpen(false);
    },
    onError: (err) => toast.error(errMsg(err)),
  });

  // ── Delete Subject dialog ─────────────────────────────────────────────────
  const [deletingSubject, setDeletingSubject] = useState<ClassSubject | null>(null);

  const deleteSubjectMutation = useMutation({
    mutationFn: (tsId: string) => removeClassSubject(id, tsId),
    onSuccess: () => {
      toast.success('Subject removed');
      qc.invalidateQueries({ queryKey: ['class-subjects', id] });
      qc.invalidateQueries({ queryKey: ['class-section', id] });
      setDeletingSubject(null);
    },
    onError: (err) => toast.error(errMsg(err)),
  });

  // ── Row selection helpers ─────────────────────────────────────────────────
  const allSelected = rosterStudents.length > 0 && rosterStudents.every((s) => selectedIds.includes(s.id));
  const toggleAll = () =>
    setSelectedIds(allSelected ? [] : rosterStudents.map((s) => s.id));
  const toggleRow = (sid: string) =>
    setSelectedIds((prev) => prev.includes(sid) ? prev.filter((x) => x !== sid) : [...prev, sid]);

  // ── Render ────────────────────────────────────────────────────────────────
  if (csLoading) {
    return (
      <div className="space-y-4 max-w-5xl">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const title = cs ? `${cs.class_name} - ${cs.section}` : 'Class Detail';
  const subtitle = [
    cs?.academic_year_label && `AY ${cs.academic_year_label}`,
    cs?.class_teacher_name && `Class Teacher: ${cs.class_teacher_name}`,
  ].filter(Boolean).join(' · ');

  return (
    <div className="space-y-6 max-w-5xl">
      <PageHeader
        title={title}
        description={subtitle || 'Manage roster, subjects, and bulk student operations for this class section.'}
        actions={
          <ActionLink href="/settings/class-sections" variant="outline">
            Back to class sections
          </ActionLink>
        }
      />

      {/* Tab bar */}
      <div className="flex gap-0 rounded-t-xl border border-b-0 border-slate-200 bg-white shadow-sm">
        {(['roster', 'subjects'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm capitalize transition-colors ${
              tab === t
                ? 'border-b-2 border-primary text-primary font-medium'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* ── ROSTER TAB ──────────────────────────────────────────────────────── */}
      {tab === 'roster' && (
        <div className="space-y-4">
          {/* Actions row */}
          <div className="flex flex-wrap items-center gap-2">
            <form
              onSubmit={(e) => { e.preventDefault(); setSearch(searchInput); setRosterPage(1); }}
              className="flex gap-2"
            >
              <Input
                placeholder="Search students…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-52"
              />
              <Button type="submit" size="sm" variant="outline">Search</Button>
              {search && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => { setSearch(''); setSearchInput(''); setRosterPage(1); }}
                >
                  Clear
                </Button>
              )}
            </form>
            <div className="flex gap-2 ml-auto flex-wrap">
              {selectedIds.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => { setTargetClassId(''); setChangeClassOpen(true); }}
                >
                  Change Class ({selectedIds.length})
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={openMigrate}>
                Year Migration
              </Button>
              <Button size="sm" onClick={() => { setAddSelected([]); setAddSearch(''); setAddGender(''); setAddStatus('active'); setAddStudentsOpen(true); }}>
                + Add Students
              </Button>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-xl border bg-white overflow-hidden">
            {rosterLoading ? (
              <div className="p-4 space-y-2">{Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
            ) : rosterStudents.length === 0 ? (
              <div className="py-14 text-center text-muted-foreground text-sm">
                {search ? 'No students match your search.' : 'No students enrolled in this class yet.'}
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-muted-foreground text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-3 py-3 text-left w-8">
                      <input type="checkbox" checked={allSelected} onChange={toggleAll} className="rounded" />
                    </th>
                    <th className="px-4 py-3 text-left font-semibold">Roll</th>
                    <th className="px-4 py-3 text-left font-semibold">Name</th>
                    <th className="px-4 py-3 text-left font-semibold">Gender</th>
                    <th className="px-4 py-3 text-left font-semibold">Adm No</th>
                    <th className="px-4 py-3 text-left font-semibold">Status</th>
                    <th className="px-4 py-3 text-right font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rosterStudents.map((s) => (
                    <tr key={s.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-3 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(s.id)}
                          onChange={() => toggleRow(s.id)}
                          className="rounded"
                        />
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{s.roll_number ?? '—'}</td>
                      <td className="px-4 py-3 font-medium">{studentFullName(s)}</td>
                      <td className="px-4 py-3 text-muted-foreground capitalize">{s.gender ?? '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{s.admission_no ?? '—'}</td>
                      <td className="px-4 py-3">
                        {s.status ? (
                          <Badge variant={s.status === 'active' ? 'default' : 'secondary'} className="capitalize">
                            {s.status}
                          </Badge>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive hover:bg-destructive/10"
                          onClick={() => setRemovingStudent(s)}
                        >
                          Remove
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {rosterPageCount > 1 && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Page {rosterPage} of {rosterPageCount}</span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={rosterPage <= 1}
                  onClick={() => setRosterPage((p) => p - 1)}
                >
                  Prev
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={rosterPage >= rosterPageCount}
                  onClick={() => setRosterPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── SUBJECTS TAB ────────────────────────────────────────────────────── */}
      {tab === 'subjects' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={openAssignSubject}>+ Assign Subject</Button>
          </div>

          <div className="rounded-xl border bg-white overflow-hidden">
            {subjectsLoading ? (
              <div className="p-4 space-y-2">{Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
            ) : subjects.length === 0 ? (
              <div className="py-14 text-center text-muted-foreground text-sm">
                No subjects assigned to this class yet.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-muted-foreground text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Subject</th>
                    <th className="px-4 py-3 text-left font-semibold">Teacher</th>
                    <th className="px-4 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {subjects.map((ts) => (
                    <tr key={ts.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-medium">{ts.subject}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {ts.teacher_name ?? ts.staff_name ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            title="Edit"
                            onClick={() => openEditSubject(ts)}
                          >
                            ✏️
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                            title="Delete"
                            onClick={() => setDeletingSubject(ts)}
                          >
                            🗑
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── DIALOGS ─────────────────────────────────────────────────────────── */}

      {/* Add Students */}
      <Dialog open={addStudentsOpen} onOpenChange={setAddStudentsOpen}>
        <DialogContent className="sm:max-w-[860px]">
          <DialogHeader>
            <DialogTitle>Add Students to Class</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            {/* Filter row */}
            <div className="flex flex-wrap gap-2">
              <Input
                placeholder="Search by name or admission no…"
                value={addSearch}
                onChange={(e) => setAddSearch(e.target.value)}
                className="flex-1 min-w-[200px]"
              />
              <select
                className={`${SEL} w-36`}
                value={addGender}
                onChange={(e) => setAddGender(e.target.value)}
              >
                <option value="">All Genders</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
              <select
                className={`${SEL} w-36`}
                value={addStatus}
                onChange={(e) => setAddStatus(e.target.value)}
              >
                <option value="">Any Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            {/* Student list */}
            <div className="rounded-lg border overflow-hidden">
              {allStudentsLoading ? (
                <div className="p-3 space-y-2">{Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-9" />)}</div>
              ) : availableStudents.length === 0 ? (
                <p className="px-4 py-8 text-sm text-center text-muted-foreground">
                  {addSearch || addGender ? 'No students match the filters.' : 'No available students found.'}
                </p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-muted-foreground text-xs uppercase tracking-wider">
                    <tr>
                      <th className="px-3 py-2.5 text-left w-8">
                        <input
                          type="checkbox"
                          className="rounded"
                          checked={availableStudents.length > 0 && availableStudents.every((s) => addSelected.includes(s.id))}
                          onChange={() => {
                            const allIds = availableStudents.map((s) => s.id);
                            const allChosen = allIds.every((id) => addSelected.includes(id));
                            setAddSelected(allChosen
                              ? addSelected.filter((id) => !allIds.includes(id))
                              : [...new Set([...addSelected, ...allIds])]);
                          }}
                        />
                      </th>
                      <th className="px-3 py-2.5 text-left font-semibold">Name</th>
                      <th className="px-3 py-2.5 text-left font-semibold">Adm No</th>
                      <th className="px-3 py-2.5 text-left font-semibold">Gender</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border max-h-[380px] overflow-y-auto">
                    {availableStudents.map((s) => (
                      <tr
                        key={s.id}
                        className="hover:bg-muted/20 transition-colors cursor-pointer"
                        onClick={() => toggleAddStudent(s.id)}
                      >
                        <td className="px-3 py-2.5">
                          <input
                            type="checkbox"
                            checked={addSelected.includes(s.id)}
                            onChange={() => toggleAddStudent(s.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="rounded"
                          />
                        </td>
                        <td className="px-3 py-2.5 font-medium">{studentFullName(s)}</td>
                        <td className="px-3 py-2.5 text-muted-foreground">{s.admission_no ?? '—'}</td>
                        <td className="px-3 py-2.5 text-muted-foreground capitalize">
                          {s.gender ?? '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{availableStudents.length} student(s) available</span>
              {addSelected.length > 0 && <span className="font-medium text-foreground">{addSelected.length} selected</span>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddStudentsOpen(false)} disabled={addStudentsMutation.isPending}>
              Cancel
            </Button>
            <Button
              onClick={() => addStudentsMutation.mutate()}
              disabled={addSelected.length === 0 || addStudentsMutation.isPending}
            >
              {addStudentsMutation.isPending ? 'Adding…' : `Add ${addSelected.length > 0 ? addSelected.length : ''} Student(s)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Student confirm */}
      <Dialog open={!!removingStudent} onOpenChange={() => setRemovingStudent(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove Student?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Remove <strong>{removingStudent && studentFullName(removingStudent)}</strong> from this class?
            Their records will not be deleted.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemovingStudent(null)}>Cancel</Button>
            <Button
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => removingStudent && removeStudentMutation.mutate(removingStudent.id)}
              disabled={removeStudentMutation.isPending}
            >
              {removeStudentMutation.isPending ? 'Removing…' : 'Remove'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Class dialog */}
      <Dialog open={changeClassOpen} onOpenChange={setChangeClassOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change Class Section</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Move <strong>{selectedIds.length}</strong> selected student(s) to a different class section.
            </p>
            <div className="space-y-1.5">
              <Label>Target Class Section <span className="text-destructive">*</span></Label>
              <ClassSectionPicker value={targetClassId} onChange={setTargetClassId} />
            </div>
            {targetClassId && (
              <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
                Move {selectedIds.length} student(s) to the selected class?
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChangeClassOpen(false)} disabled={changeClassMutation.isPending}>
              Cancel
            </Button>
            <Button
              onClick={() => changeClassMutation.mutate()}
              disabled={!targetClassId || changeClassMutation.isPending}
            >
              {changeClassMutation.isPending ? 'Moving…' : 'Move Students'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Year Migration wizard */}
      <Dialog open={migrateOpen} onOpenChange={(o) => { if (!o) setMigrateOpen(false); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Year Migration — Step {migrateStep} of 3</DialogTitle>
          </DialogHeader>

          {migrateStep === 1 && (
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">
                Select the target academic year and class section to promote students into.
              </p>
              <div className="space-y-1.5">
                <Label>Target Academic Year <span className="text-destructive">*</span></Label>
                <select className={SEL} value={migrateAyId} onChange={(e) => setMigrateAyId(e.target.value)}>
                  <option value="">— select year —</option>
                  {academicYears.filter((a) => a.id !== cs?.academic_year_id).map((ay) => (
                    <option key={ay.id} value={ay.id}>{ay.label}{ay.is_active ? ' (Active)' : ''}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Target Class Section <span className="text-destructive">*</span></Label>
                <ClassSectionPicker value={migrateClassId} onChange={setMigrateClassId} />
              </div>
            </div>
          )}

          {migrateStep === 2 && (
            <div className="space-y-3 py-2">
              <p className="text-sm text-muted-foreground">
                Select students to promote. All are pre-selected by default.
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={migrateSelected.length === rosterStudents.length}
                  onChange={() =>
                    setMigrateSelected(
                      migrateSelected.length === rosterStudents.length ? [] : rosterStudents.map((s) => s.id)
                    )
                  }
                  className="rounded"
                />
                Select all ({rosterStudents.length})
              </div>
              <div className="max-h-64 overflow-y-auto rounded-lg border divide-y">
                {rosterStudents.map((s) => (
                  <label key={s.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={migrateSelected.includes(s.id)}
                      onChange={() => toggleMigrateStudent(s.id)}
                      className="rounded"
                    />
                    <span className="text-sm">{studentFullName(s)}</span>
                    {s.admission_no && (
                      <span className="text-xs text-muted-foreground ml-auto">{s.admission_no}</span>
                    )}
                  </label>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">{migrateSelected.length} of {rosterStudents.length} selected</p>
            </div>
          )}

          {migrateStep === 3 && migrateResult && (
            <div className="py-4 text-center space-y-3">
              <div className="text-4xl">✓</div>
              <p className="font-medium">Migration Complete</p>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="rounded-lg bg-green-50 border border-green-200 p-3">
                  <div className="text-xl font-bold text-green-700">{migrateResult.promoted ?? 0}</div>
                  <div className="text-xs text-green-600">Promoted</div>
                </div>
                <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-3">
                  <div className="text-xl font-bold text-yellow-700">{migrateResult.skipped ?? 0}</div>
                  <div className="text-xs text-yellow-600">Skipped</div>
                </div>
                <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                  <div className="text-xl font-bold text-red-700">{migrateResult.errors ?? 0}</div>
                  <div className="text-xs text-red-600">Errors</div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            {migrateStep === 3 ? (
              <Button onClick={() => setMigrateOpen(false)}>Done</Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => migrateStep === 1 ? setMigrateOpen(false) : setMigrateStep((s) => (s - 1) as 1 | 2 | 3)}
                  disabled={migrateMutation.isPending}
                >
                  {migrateStep === 1 ? 'Cancel' : 'Back'}
                </Button>
                <Button
                  onClick={() => {
                    if (migrateStep === 1) {
                      if (!migrateAyId) { toast.error('Select a target academic year'); return; }
                      if (!migrateClassId) { toast.error('Select a target class section'); return; }
                      setMigrateStep(2);
                    } else {
                      if (migrateSelected.length === 0) { toast.error('Select at least one student'); return; }
                      migrateMutation.mutate();
                    }
                  }}
                  disabled={migrateMutation.isPending}
                >
                  {migrateStep === 2 && migrateMutation.isPending ? 'Migrating…' : migrateStep === 1 ? 'Next' : 'Confirm Migration'}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign / Edit Subject dialog */}
      <Dialog open={assignSubjectOpen} onOpenChange={setAssignSubjectOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingSubject ? 'Edit Subject' : 'Assign Subject'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Subject <span className="text-destructive">*</span></Label>
              {subjectsCatalog.length === 0 ? (
                <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                  No subjects found in the catalog. Add subjects under Settings → Subjects first.
                </p>
              ) : (
                <select
                  className={SEL}
                  value={subjectName}
                  onChange={(e) => setSubjectName(e.target.value)}
                >
                  <option value="">— select subject —</option>
                  {subjectsCatalog.map((s) => (
                    <option key={s.id} value={s.name}>{s.name}</option>
                  ))}
                </select>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Teacher <span className="text-destructive">*</span></Label>
              <select
                className={SEL}
                value={subjectStaffId}
                onChange={(e) => setSubjectStaffId(e.target.value)}
              >
                <option value="">— select teacher —</option>
                {staffList.map((s) => (
                  <option key={s.id} value={s.id}>{staffFullName(s)}</option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignSubjectOpen(false)} disabled={subjectMutation.isPending}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!subjectName.trim()) { toast.error('Subject name is required'); return; }
                if (!subjectStaffId) { toast.error('Select a teacher'); return; }
                subjectMutation.mutate();
              }}
              disabled={subjectMutation.isPending}
            >
              {subjectMutation.isPending ? 'Saving…' : editingSubject ? 'Save Changes' : 'Assign'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Subject confirm */}
      <Dialog open={!!deletingSubject} onOpenChange={() => setDeletingSubject(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove Subject?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Remove <strong>{deletingSubject?.subject}</strong> from this class?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingSubject(null)}>Cancel</Button>
            <Button
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deletingSubject && deleteSubjectMutation.mutate(deletingSubject.id)}
              disabled={deleteSubjectMutation.isPending}
            >
              {deleteSubjectMutation.isPending ? 'Removing…' : 'Remove'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
