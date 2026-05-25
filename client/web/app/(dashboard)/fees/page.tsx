'use client';

import { useState } from 'react';
import {
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  Clock,
  Pencil,
  Users,
  TrendingUp,
} from 'lucide-react';
import { useRole } from '@/hooks/useRole';
import PageHeader from '@/components/layout/PageHeader';
import DataSection from '@/components/enterprise/DataSection';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

// ── Constants ─────────────────────────────────────────────────────────────────

const CURRENT_MONTH = '2026-05';
const TODAY = '2026-05-25';

const MONTHS = [
  { key: '2025-06', label: 'Jun', full: 'June 2025',     due: '2025-06-10' },
  { key: '2025-07', label: 'Jul', full: 'July 2025',     due: '2025-07-10' },
  { key: '2025-08', label: 'Aug', full: 'August 2025',   due: '2025-08-10' },
  { key: '2025-09', label: 'Sep', full: 'September 2025',due: '2025-09-10' },
  { key: '2025-10', label: 'Oct', full: 'October 2025',  due: '2025-10-10' },
  { key: '2025-11', label: 'Nov', full: 'November 2025', due: '2025-11-10' },
  { key: '2025-12', label: 'Dec', full: 'December 2025', due: '2025-12-10' },
  { key: '2026-01', label: 'Jan', full: 'January 2026',  due: '2026-01-10' },
  { key: '2026-02', label: 'Feb', full: 'February 2026', due: '2026-02-10' },
  { key: '2026-03', label: 'Mar', full: 'March 2026',    due: '2026-03-10' },
  { key: '2026-04', label: 'Apr', full: 'April 2026',    due: '2026-04-10' },
  { key: '2026-05', label: 'May', full: 'May 2026',      due: '2026-05-10' },
] as const;

// ── Types ─────────────────────────────────────────────────────────────────────

interface FeeStructure {
  monthly_amount: number;
  due_day: number;
  late_fee: number;
}

type MonthKey = typeof MONTHS[number]['key'];

interface Payment {
  status: 'paid';
  paid_date: string;
  amount_paid: number;
}

interface Student {
  id: string;
  name: string;
  roll: string;
  class_section: string;
  payments: Partial<Record<MonthKey, Payment>>;
}

interface Ward {
  id: string;
  name: string;
  class_section: string;
  payments: Partial<Record<MonthKey, Payment>>;
}

// ── Mock data helpers ─────────────────────────────────────────────────────────

function paidThrough(throughKey: MonthKey, amount = 4500): Partial<Record<MonthKey, Payment>> {
  const result: Partial<Record<MonthKey, Payment>> = {};
  for (const m of MONTHS) {
    if (m.key <= throughKey) {
      result[m.key] = { status: 'paid', paid_date: `${m.key}-05`, amount_paid: amount };
    }
  }
  return result;
}

const INIT_STUDENTS: Student[] = [
  // Class 6B
  { id: 's1', name: 'Arjun Sharma',   roll: '6B-01', class_section: 'Class 6B', payments: paidThrough('2026-04') },
  { id: 's2', name: 'Priya Sharma',   roll: '6B-02', class_section: 'Class 6B', payments: paidThrough('2026-05') },
  { id: 's3', name: 'Divya Nair',     roll: '6B-03', class_section: 'Class 6B', payments: paidThrough('2026-05') },
  // Class 8A
  { id: 's4', name: 'Karan Gupta',    roll: '8A-04', class_section: 'Class 8A', payments: paidThrough('2026-04') },
  { id: 's5', name: 'Meera Joshi',    roll: '8A-05', class_section: 'Class 8A', payments: paidThrough('2026-05') },
  { id: 's6', name: 'Aditya Rao',     roll: '8A-06', class_section: 'Class 8A', payments: paidThrough('2026-03') },
  // Class 10C
  { id: 's7', name: 'Tanvi Shah',     roll: '10C-07', class_section: 'Class 10C', payments: paidThrough('2026-05') },
  { id: 's8', name: 'Suresh Pillai',  roll: '10C-08', class_section: 'Class 10C', payments: paidThrough('2026-05') },
  { id: 's9', name: 'Neha Reddy',     roll: '10C-09', class_section: 'Class 10C', payments: paidThrough('2026-04') },
];

const MOCK_WARD: Ward = {
  id: 'w1', name: 'Priya Sharma', class_section: 'Class 6B', payments: paidThrough('2026-04'),
};

const INIT_FEE_STRUCTURE: FeeStructure = {
  monthly_amount: 4500,
  due_day: 10,
  late_fee: 200,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function getMonthStatus(
  payments: Partial<Record<MonthKey, Payment>>,
  monthKey: MonthKey,
  dueDate: string,
): 'paid' | 'overdue' | 'upcoming' {
  if (payments[monthKey]?.status === 'paid') return 'paid';
  if (dueDate <= TODAY) return 'overdue';
  return 'upcoming';
}

function getOverdueMonths(payments: Partial<Record<MonthKey, Payment>>) {
  return MONTHS.filter((m) => getMonthStatus(payments, m.key, m.due) === 'overdue');
}

function fmt(amount: number) {
  return `₹${amount.toLocaleString('en-IN')}`;
}

function fmtDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// ── Page entry ────────────────────────────────────────────────────────────────

export default function FeesPage() {
  const { is } = useRole();
  const [demoRole, setDemoRole] = useState<'admin' | 'parent'>(
    is('parent') ? 'parent' : 'admin',
  );

  return (
    <div className="space-y-6">
      {/* Demo switcher */}
      <div className="flex items-center gap-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-2.5">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Preview as
        </span>
        <div className="flex gap-1.5">
          <Button
            size="sm"
            variant={demoRole === 'admin' ? 'default' : 'outline'}
            className="h-7 text-xs"
            onClick={() => setDemoRole('admin')}
          >
            Admin
          </Button>
          <Button
            size="sm"
            variant={demoRole === 'parent' ? 'default' : 'outline'}
            className="h-7 text-xs"
            onClick={() => setDemoRole('parent')}
          >
            Parent
          </Button>
        </div>
      </div>

      {demoRole === 'admin' ? <AdminView /> : <ParentView />}
    </div>
  );
}

// ── Admin View ────────────────────────────────────────────────────────────────

const CLASS_SECTIONS = ['Class 6B', 'Class 8A', 'Class 10C'];

function AdminView() {
  const [feeStruct, setFeeStruct] = useState<FeeStructure>(INIT_FEE_STRUCTURE);
  const [students, setStudents] = useState<Student[]>(INIT_STUDENTS);
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['Class 6B']));
  const [editDialog, setEditDialog] = useState(false);
  const [editForm, setEditForm] = useState<FeeStructure>(INIT_FEE_STRUCTURE);
  const [markPaidTarget, setMarkPaidTarget] = useState<{
    student: Student;
    months: typeof MONTHS[number][];
  } | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'overdue' | 'paid'>('all');

  const totalCollected = students.reduce(
    (sum, s) => sum + Object.values(s.payments).reduce((a, p) => a + (p?.amount_paid ?? 0), 0),
    0,
  );
  const overdueStudents = students.filter((s) => getOverdueMonths(s.payments).length > 0);
  const totalOutstanding = overdueStudents.reduce((sum, s) => {
    const overdue = getOverdueMonths(s.payments);
    return sum + overdue.length * (feeStruct.monthly_amount + feeStruct.late_fee);
  }, 0);
  const paidStudents = students.filter((s) => getOverdueMonths(s.payments).length === 0);

  function toggleSection(cls: string) {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(cls)) next.delete(cls);
      else next.add(cls);
      return next;
    });
  }

  function doMarkPaid(studentId: string, monthKeys: string[]) {
    setStudents((prev) =>
      prev.map((s) => {
        if (s.id !== studentId) return s;
        const updated = { ...s.payments };
        for (const key of monthKeys) {
          updated[key as MonthKey] = {
            status: 'paid',
            paid_date: TODAY,
            amount_paid: feeStruct.monthly_amount,
          };
        }
        return { ...s, payments: updated };
      }),
    );
    setMarkPaidTarget(null);
  }

  function getFilteredStudents(cls: string): Student[] {
    const base = students.filter((s) => s.class_section === cls);
    if (activeFilter === 'overdue') return base.filter((s) => getOverdueMonths(s.payments).length > 0);
    if (activeFilter === 'paid') return base.filter((s) => getOverdueMonths(s.payments).length === 0);
    return base;
  }

  return (
    <>
      <PageHeader
        title="Fees"
        description="Track and manage student fee collections for AY 2025–26."
        actions={
          <Button
            onClick={() => {
              setEditForm(feeStruct);
              setEditDialog(true);
            }}
          >
            <Pencil className="mr-2 h-4 w-4" />
            Edit fee structure
          </Button>
        }
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          icon={<TrendingUp className="h-5 w-5 text-emerald-600" />}
          label="Total collected"
          value={fmt(totalCollected)}
          bg="bg-emerald-50 border-emerald-100"
        />
        <StatCard
          icon={<AlertCircle className="h-5 w-5 text-red-500" />}
          label="Outstanding"
          value={fmt(totalOutstanding)}
          bg="bg-red-50 border-red-100"
        />
        <StatCard
          icon={<CheckCircle2 className="h-5 w-5 text-blue-600" />}
          label="Paid up"
          value={`${paidStudents.length} / ${students.length}`}
          bg="bg-blue-50 border-blue-100"
        />
        <StatCard
          icon={<Users className="h-5 w-5 text-amber-600" />}
          label="With dues"
          value={`${overdueStudents.length} student${overdueStudents.length !== 1 ? 's' : ''}`}
          bg="bg-amber-50 border-amber-100"
        />
      </div>

      {/* Fee structure */}
      <DataSection
        title="Fee structure"
        description="Current configuration for AY 2025–26."
        actions={
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setEditForm(feeStruct);
              setEditDialog(true);
            }}
          >
            <Pencil className="mr-1.5 h-3.5 w-3.5" />
            Edit
          </Button>
        }
      >
        <div className="flex flex-wrap gap-8 px-6 py-5">
          <StructItem label="Monthly fee" value={fmt(feeStruct.monthly_amount)} />
          <StructItem label="Due by" value={`${feeStruct.due_day}th of month`} />
          <StructItem label="Late fee" value={`${fmt(feeStruct.late_fee)} / month`} />
          <StructItem label="Annual total" value={fmt(feeStruct.monthly_amount * 12)} />
        </div>
      </DataSection>

      {/* Student overview */}
      <DataSection
        title="Student overview"
        description="May 2026 payment status by class."
        noPadding
        actions={
          <div className="flex gap-1.5">
            {(['all', 'paid', 'overdue'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={cn(
                  'rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors',
                  activeFilter === f
                    ? 'bg-slate-900 text-white'
                    : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
                )}
              >
                {f}
              </button>
            ))}
          </div>
        }
      >
        <div className="divide-y divide-slate-200">
          {CLASS_SECTIONS.map((cls) => {
            const filtered = getFilteredStudents(cls);
            const all = students.filter((s) => s.class_section === cls);
            const overdueCount = all.filter((s) => getOverdueMonths(s.payments).length > 0).length;
            const paidCount = all.length - overdueCount;
            const isOpen = openSections.has(cls);

            if (filtered.length === 0 && activeFilter !== 'all') return null;

            return (
              <div key={cls}>
                <button
                  onClick={() => toggleSection(cls)}
                  className="flex w-full items-center justify-between px-6 py-4 transition-colors hover:bg-slate-50"
                >
                  <div className="flex items-center gap-3">
                    <ChevronDown
                      className={cn(
                        'h-4 w-4 text-slate-400 transition-transform',
                        isOpen && 'rotate-180',
                      )}
                    />
                    <span className="font-medium text-slate-900">{cls}</span>
                    <div className="flex gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                        <CheckCircle2 className="h-3 w-3" />
                        {paidCount} paid
                      </span>
                      {overdueCount > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">
                          <AlertCircle className="h-3 w-3" />
                          {overdueCount} overdue
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-slate-400">{all.length} students</span>
                </button>

                {isOpen && (
                  <div className="border-t border-slate-100">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-slate-200 hover:bg-transparent">
                          <TableHead className="bg-slate-50 px-6 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Student
                          </TableHead>
                          <TableHead className="bg-slate-50 px-6 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Roll
                          </TableHead>
                          <TableHead className="bg-slate-50 px-6 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                            May 2026
                          </TableHead>
                          <TableHead className="bg-slate-50 px-6 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Outstanding
                          </TableHead>
                          <TableHead className="bg-slate-50 px-6 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Action
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filtered.map((s) => {
                          const overdue = getOverdueMonths(s.payments);
                          const outstanding =
                            overdue.length * (feeStruct.monthly_amount + feeStruct.late_fee);
                          const mayStatus = getMonthStatus(
                            s.payments,
                            CURRENT_MONTH,
                            '2026-05-10',
                          );
                          return (
                            <TableRow key={s.id} className="border-slate-200">
                              <TableCell className="px-6 py-3 font-medium text-slate-900">
                                {s.name}
                              </TableCell>
                              <TableCell className="px-6 py-3 font-mono text-sm text-slate-500">
                                {s.roll}
                              </TableCell>
                              <TableCell className="px-6 py-3">
                                {mayStatus === 'paid' ? (
                                  <StatusPill variant="paid" label="Paid" />
                                ) : (
                                  <StatusPill variant="overdue" label="Overdue" />
                                )}
                              </TableCell>
                              <TableCell className="px-6 py-3">
                                {outstanding > 0 ? (
                                  <span className="font-medium text-red-600">
                                    {fmt(outstanding)}
                                  </span>
                                ) : (
                                  <span className="text-slate-400">—</span>
                                )}
                              </TableCell>
                              <TableCell className="px-6 py-3 text-right">
                                {overdue.length > 0 && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      setMarkPaidTarget({ student: s, months: [...overdue] })
                                    }
                                  >
                                    Mark paid
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </DataSection>

      {/* Edit fee structure dialog */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit fee structure</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Monthly fee amount (₹)</Label>
              <Input
                type="number"
                value={editForm.monthly_amount}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, monthly_amount: Number(e.target.value) }))
                }
                className="border-slate-200"
              />
            </div>
            <div className="space-y-2">
              <Label>Due day of month (1–28)</Label>
              <Input
                type="number"
                min={1}
                max={28}
                value={editForm.due_day}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, due_day: Number(e.target.value) }))
                }
                className="border-slate-200"
              />
            </div>
            <div className="space-y-2">
              <Label>Late fee per overdue month (₹)</Label>
              <Input
                type="number"
                value={editForm.late_fee}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, late_fee: Number(e.target.value) }))
                }
                className="border-slate-200"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setFeeStruct(editForm);
                setEditDialog(false);
              }}
            >
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark paid dialog */}
      <Dialog open={!!markPaidTarget} onOpenChange={(v) => !v && setMarkPaidTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mark payment received</DialogTitle>
          </DialogHeader>
          {markPaidTarget && (
            <div className="space-y-4 py-2">
              <div className="space-y-2 rounded-lg bg-slate-50 px-4 py-3">
                <Row label="Student" value={markPaidTarget.student.name} />
                <Row
                  label="Overdue months"
                  value={markPaidTarget.months.map((m) => m.label).join(', ')}
                />
                <Row
                  label="Base fees"
                  value={fmt(markPaidTarget.months.length * feeStruct.monthly_amount)}
                />
                <Row
                  label="Late fee"
                  value={fmt(markPaidTarget.months.length * feeStruct.late_fee)}
                />
                <div className="mt-1 border-t border-slate-200 pt-2">
                  <Row
                    label="Total due"
                    value={fmt(
                      markPaidTarget.months.length *
                        (feeStruct.monthly_amount + feeStruct.late_fee),
                    )}
                    bold
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setMarkPaidTarget(null)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                markPaidTarget &&
                doMarkPaid(
                  markPaidTarget.student.id,
                  markPaidTarget.months.map((m) => m.key),
                )
              }
            >
              Confirm payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Parent View ───────────────────────────────────────────────────────────────

function ParentView() {
  const ward = MOCK_WARD;
  const overdue = getOverdueMonths(ward.payments);
  const allPaid = overdue.length === 0;
  const paidCount = MONTHS.filter((m) => ward.payments[m.key]?.status === 'paid').length;
  const [payDialog, setPayDialog] = useState(false);
  const [payMethod, setPayMethod] = useState<'upi' | 'card' | 'netbanking'>('upi');

  const totalDue = overdue.length * (INIT_FEE_STRUCTURE.monthly_amount + INIT_FEE_STRUCTURE.late_fee);

  return (
    <>
      <PageHeader title="Fees" description="View fee payment status for your ward." />

      {/* Status banner */}
      <div
        className={cn(
          'rounded-xl border p-6',
          allPaid ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50',
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div
              className={cn(
                'rounded-full p-2.5',
                allPaid ? 'bg-emerald-100' : 'bg-red-100',
              )}
            >
              {allPaid ? (
                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
              ) : (
                <AlertCircle className="h-6 w-6 text-red-500" />
              )}
            </div>
            <div className="min-w-0">
              <h3
                className={cn(
                  'text-base font-semibold',
                  allPaid ? 'text-emerald-900' : 'text-red-900',
                )}
              >
                {allPaid
                  ? 'All fees paid — fully up to date!'
                  : `${overdue.length} month${overdue.length > 1 ? 's' : ''} overdue`}
              </h3>
              <p
                className={cn(
                  'mt-1 text-sm',
                  allPaid ? 'text-emerald-700' : 'text-red-700',
                )}
              >
                {ward.name} · {ward.class_section} · AY 2025–26
              </p>
              {allPaid && (
                <p className="mt-1.5 text-sm text-emerald-700">
                  {paidCount} of {MONTHS.length} months paid
                </p>
              )}
              {!allPaid && (
                <div className="mt-2 space-y-0.5">
                  <p className="text-sm font-medium text-red-800">
                    Outstanding: {fmt(totalDue)}
                  </p>
                  <p className="text-sm text-red-700">
                    Overdue months: {overdue.map((m) => m.full).join(', ')}
                  </p>
                </div>
              )}
            </div>
          </div>
          {!allPaid && (
            <Button
              className="shrink-0"
              onClick={() => setPayDialog(true)}
            >
              Pay now
            </Button>
          )}
        </div>
      </div>

      {/* Pay dialog */}
      <Dialog open={payDialog} onOpenChange={setPayDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Pay fees</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-1">
            {/* Months breakdown */}
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Months due
              </p>
              <div className="space-y-2">
                {overdue.map((m) => (
                  <div
                    key={m.key}
                    className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm"
                  >
                    <span className="font-medium text-slate-800">{m.full}</span>
                    <div className="text-right">
                      <span className="font-semibold text-slate-900">
                        {fmt(INIT_FEE_STRUCTURE.monthly_amount + INIT_FEE_STRUCTURE.late_fee)}
                      </span>
                      <span className="ml-1.5 text-xs text-slate-400">
                        ({fmt(INIT_FEE_STRUCTURE.monthly_amount)} + {fmt(INIT_FEE_STRUCTURE.late_fee)} late)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2 text-sm">
                <span className="font-medium text-slate-600">Total</span>
                <span className="font-bold text-slate-900">{fmt(totalDue)}</span>
              </div>
            </div>

            {/* Payment method */}
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Payment method
              </p>
              <div className="flex gap-2">
                {(
                  [
                    { value: 'upi', label: 'UPI' },
                    { value: 'card', label: 'Card' },
                    { value: 'netbanking', label: 'Net Banking' },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setPayMethod(opt.value)}
                    className={cn(
                      'flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                      payMethod === opt.value
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* UPI fields */}
              {payMethod === 'upi' && (
                <div className="space-y-2 pt-1">
                  <Label className="text-slate-700">UPI ID</Label>
                  <Input placeholder="yourname@upi" className="border-slate-200" />
                </div>
              )}

              {/* Card fields */}
              {payMethod === 'card' && (
                <div className="space-y-2 pt-1">
                  <div className="space-y-2">
                    <Label className="text-slate-700">Card number</Label>
                    <Input placeholder="1234 5678 9012 3456" maxLength={19} className="border-slate-200 font-mono tracking-widest" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <Label className="text-slate-700">Expiry</Label>
                      <Input placeholder="MM / YY" maxLength={7} className="border-slate-200" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-700">CVV</Label>
                      <Input placeholder="•••" maxLength={4} type="password" className="border-slate-200" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700">Name on card</Label>
                    <Input placeholder="As printed on card" className="border-slate-200" />
                  </div>
                </div>
              )}

              {/* Net banking */}
              {payMethod === 'netbanking' && (
                <div className="space-y-2 pt-1">
                  <Label className="text-slate-700">Select bank</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {['SBI', 'HDFC', 'ICICI', 'Axis', 'Kotak', 'Other'].map((bank) => (
                      <button
                        key={bank}
                        className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 hover:border-slate-300 hover:bg-white transition-colors"
                      >
                        {bank}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => setPayDialog(false)}>
              Proceed to pay {fmt(totalDue)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Monthly grid */}
      <DataSection title="Academic year overview" description="June 2025 – May 2026">
        <div className="grid grid-cols-4 gap-2 p-5 sm:grid-cols-6 md:grid-cols-12">
          {MONTHS.map((m) => {
            const status = getMonthStatus(ward.payments, m.key, m.due);
            return (
              <div
                key={m.key}
                className={cn(
                  'flex flex-col items-center gap-1.5 rounded-lg border p-2.5',
                  status === 'paid' && 'border-emerald-200 bg-emerald-50',
                  status === 'overdue' && 'border-red-200 bg-red-50',
                  status === 'upcoming' && 'border-slate-200 bg-slate-50',
                )}
              >
                <span
                  className={cn(
                    'text-xs font-semibold',
                    status === 'paid' && 'text-emerald-700',
                    status === 'overdue' && 'text-red-600',
                    status === 'upcoming' && 'text-slate-400',
                  )}
                >
                  {m.label}
                </span>
                {status === 'paid' && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
                {status === 'overdue' && <AlertCircle className="h-3.5 w-3.5 text-red-500" />}
                {status === 'upcoming' && <Clock className="h-3.5 w-3.5 text-slate-300" />}
              </div>
            );
          })}
        </div>
      </DataSection>

      {/* Payment history */}
      <DataSection title="Payment history" noPadding>
        <Table>
          <TableHeader>
            <TableRow className="border-slate-200 hover:bg-transparent">
              <TableHead className="bg-slate-50 px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Month
              </TableHead>
              <TableHead className="bg-slate-50 px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Due date
              </TableHead>
              <TableHead className="bg-slate-50 px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Amount
              </TableHead>
              <TableHead className="bg-slate-50 px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Paid on
              </TableHead>
              <TableHead className="bg-slate-50 px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Status
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...MONTHS].reverse().map((m) => {
              const payment = ward.payments[m.key];
              const status = getMonthStatus(ward.payments, m.key, m.due);
              const amount =
                payment?.amount_paid ??
                (status === 'overdue'
                  ? INIT_FEE_STRUCTURE.monthly_amount + INIT_FEE_STRUCTURE.late_fee
                  : INIT_FEE_STRUCTURE.monthly_amount);
              return (
                <TableRow key={m.key} className="border-slate-200">
                  <TableCell className="px-6 py-3 font-medium text-slate-900">{m.full}</TableCell>
                  <TableCell className="px-6 py-3 text-slate-500">{fmtDate(m.due)}</TableCell>
                  <TableCell className="px-6 py-3 text-slate-700">{fmt(amount)}</TableCell>
                  <TableCell className="px-6 py-3 text-slate-500">
                    {payment ? fmtDate(payment.paid_date) : '—'}
                  </TableCell>
                  <TableCell className="px-6 py-3">
                    {status === 'paid' && <StatusPill variant="paid" label="Paid" />}
                    {status === 'overdue' && <StatusPill variant="overdue" label="Overdue" />}
                    {status === 'upcoming' && <StatusPill variant="upcoming" label="Upcoming" />}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </DataSection>
    </>
  );
}

// ── Small UI helpers ──────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  bg,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  bg: string;
}) {
  return (
    <div className={cn('rounded-xl border p-4', bg)}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0">{icon}</div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-0.5 text-lg font-semibold text-slate-900">{value}</p>
        </div>
      </div>
    </div>
  );
}

function StructItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-0.5 text-base font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function StatusPill({ variant, label }: { variant: 'paid' | 'overdue' | 'upcoming'; label: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
        variant === 'paid' && 'bg-emerald-50 text-emerald-700',
        variant === 'overdue' && 'bg-red-50 text-red-600',
        variant === 'upcoming' && 'bg-slate-100 text-slate-500',
      )}
    >
      {variant === 'paid' && <CheckCircle2 className="h-3 w-3" />}
      {variant === 'overdue' && <AlertCircle className="h-3 w-3" />}
      {variant === 'upcoming' && <Clock className="h-3 w-3" />}
      {label}
    </span>
  );
}

function Row({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-slate-500">{label}</span>
      <span className={cn('text-slate-900', bold && 'font-semibold')}>{value}</span>
    </div>
  );
}
