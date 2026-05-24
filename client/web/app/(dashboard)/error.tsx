'use client';

import { Button } from '@/components/ui/button';
import PageHeader from '@/components/layout/PageHeader';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Something went wrong"
        description={error.message || 'An unexpected error occurred while loading this page.'}
        actions={
          <Button variant="outline" onClick={reset}>
            Try again
          </Button>
        }
      />
      <section className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm text-slate-600">
          If the problem continues, sign out and sign in again, or contact your school administrator.
        </p>
      </section>
    </div>
  );
}
