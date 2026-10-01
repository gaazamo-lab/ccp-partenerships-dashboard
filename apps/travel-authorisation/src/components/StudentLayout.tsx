import { Link, Outlet, useLocation, useNavigate } from 'react-router';

import { Button, Toaster } from '@rfdtech/components';
import { FilePlus2, LayoutDashboard, LogOut } from 'lucide-react';

import { useAuth } from '@partner-crm/auth';
import { initialsOf } from '@partner-crm/utils';

import { ROUTES } from '@/constants/routes';

export function StudentLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const name = user?.name ?? 'Student';
  const links = [
    { to: ROUTES.STUDENT_HOME, label: 'My travel', icon: LayoutDashboard },
    { to: ROUTES.STUDENT_NEW_REQUEST, label: 'Make a request', icon: FilePlus2 },
  ];
  const isActive = (to: string) =>
    to === ROUTES.STUDENT_HOME
      ? pathname === to ||
        (pathname.startsWith('/student/requests/') && pathname !== ROUTES.STUDENT_NEW_REQUEST)
      : pathname === to;

  return (
    <div className="min-h-screen bg-[#f7f9fb] text-[#20252b]">
      <header className="sticky top-0 z-40 h-20 max-sm:h-17 border-b border-white/[0.08] bg-[#062841] shadow-[0_1px_4px_rgba(4,29,47,0.16)]">
        <div className="mx-auto flex h-full w-full max-w-[1240px] items-center gap-6 px-8 max-[900px]:px-4">
          <Link
            to={ROUTES.STUDENT_HOME}
            className="flex shrink-0 items-center gap-3 text-white no-underline"
            aria-label="Student travel home"
          >
            <img
              src="/BRAND-IDENTITY-REVERSE.png"
              alt="Ghana School of Law"
              className="h-12 w-auto object-contain max-sm:h-10"
            />
            <span className="flex flex-col leading-[1.15] max-sm:hidden">
              <strong className="text-base tracking-[0.01em]">Travel Portal</strong>
              <small className="mt-1 text-xs text-white/[0.68]">Ghana School of Law</small>
            </span>
          </Link>

          <nav
            className="ml-auto flex items-center gap-1 max-[900px]:hidden"
            aria-label="Student portal navigation"
          >
            {links.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className={`inline-flex items-center gap-2 rounded-[0.6rem] px-3.2 py-2.6 text-sm font-semibold no-underline transition-colors duration-150 hover:bg-white/[0.11] hover:text-white ${isActive(to) ? 'bg-white/[0.11] text-white' : 'text-white/[0.72]'}`}
              >
                <Icon size={17} />
                {label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2.6 border-l border-white/[0.14] pl-4 max-[900px]:ml-auto">
            <span className="grid h-10.5 w-10.5 shrink-0 place-items-center rounded-full border border-white/30 bg-white/10 text-[0.8rem] font-bold text-white max-sm:h-9.5 max-sm:w-9.5">
              {initialsOf(name)}
            </span>
            <span className="flex max-w-35 flex-col leading-[1.2] max-[900px]:hidden">
              <strong className="overflow-hidden text-ellipsis whitespace-nowrap text-[0.8rem] text-white">
                {name}
              </strong>
              <small className="mt-0.8 text-[0.72rem] text-white/[0.62]">Student</small>
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="!text-white/[0.78] hover:!bg-white/10 hover:!text-white"
              aria-label="Sign out"
              onClick={() => void signOut().then(() => navigate(ROUTES.LOGIN, { replace: true }))}
            >
              <LogOut size={18} />
              <span className="hidden xl:inline">Sign out</span>
            </Button>
          </div>
        </div>
      </header>

      <nav
        className="hidden gap-2 border-b border-[#e3e8ed] bg-white px-4 py-2.2 max-[900px]:flex"
        aria-label="Student portal navigation"
      >
        {links.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className={`inline-flex flex-1 items-center justify-center gap-2 rounded-[0.6rem] px-2.4 py-2.4 text-sm font-semibold no-underline transition-colors duration-150 ${isActive(to) ? 'bg-[#eaf5fc] text-[#076ca3]' : 'text-[#66727d]'}`}
          >
            <Icon size={17} />
            {label}
          </Link>
        ))}
      </nav>

      <main className="mx-auto w-full max-w-[1240px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        <Outlet />
      </main>
      <Toaster />
    </div>
  );
}
