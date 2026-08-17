import { AdminNav } from './AdminNav';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col md:flex-row gap-4 md:gap-6">
      <AdminNav />
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
