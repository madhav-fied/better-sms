import AuthGuard from '@/components/layout/AuthGuard';
import Sidebar from '@/components/layout/Sidebar';
import TopBar from '@/components/layout/TopBar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <TopBar />
          <main className="flex-1 overflow-y-auto p-6 bg-gray-50">{children}</main>
        </div>
      </div>
    </AuthGuard>
  );
}
