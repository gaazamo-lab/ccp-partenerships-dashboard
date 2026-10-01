import { useAuth } from '@partner-crm/auth';
import { initialsOf } from '@partner-crm/utils';

interface StudentProfileBannerProps {
  activeRequests: number;
  totalRequests: number;
}

export function StudentProfileBanner({ activeRequests, totalRequests }: StudentProfileBannerProps) {
  const { user } = useAuth();
  const name = user?.name ?? 'Student';
  const email = user?.email ?? '—';

  const details = [
    { label: 'Role', value: 'Student' },
    { label: 'Email', value: email },
    { label: 'Portal', value: 'Visa & Travel Authorisation' },
    {
      label: 'Requests',
      value: `${totalRequests} total · ${activeRequests} active`,
    },
  ];

  return (
    <section
      className="w-full  overflow-hidden rounded-2xl border border-[#dbe2e8] bg-white shadow-[0_2px_8px_rgba(22,34,45,0.05)]"
      aria-labelledby="student-welcome-heading"
    >
      <div className="relative flex min-h-36 overflow-hidden bg-[#062841] max-sm:min-h-fit h-[40vh] lg:h-[23vh]">
        <div className="relative z-[2] flex min-w-0 flex-1 items-center gap-5 px-9 py-6 max-sm:flex-col max-sm:items-start max-sm:justify-center max-sm:p-5">
          <div
            className="grid h-16 w-16 shrink-0 place-items-center rounded-full border-2 border-white/45 bg-white/[0.13] text-[1.25rem] font-bold text-white shadow-[0_4px_12px_rgba(0,0,0,0.12)] backdrop-blur-[6px] max-sm:h-14 max-sm:w-14 max-sm:text-[1.05rem]"
            aria-hidden="true"
          >
            {initialsOf(name)}
          </div>
          <div className="min-w-0 text-white">
            <p className="mb-1 text-[0.95rem] text-white/[0.72]">Welcome back,</p>
            <h1
              id="student-welcome-heading"
              className="overflow-hidden text-ellipsis whitespace-nowrap text-[clamp(1.3rem,3vw,1.75rem)] font-[750] leading-[1.15]"
            >
              {name}
            </h1>
            <p className="mt-1 overflow-hidden text-ellipsis whitespace-nowrap text-sm text-white/[0.64]">
              {email}
            </p>
            <p className="mt-3 max-w-117.5 text-[0.95rem] font-semibold leading-normal text-white/[0.86] max-sm:mt-2.5">
              Plan your travel, then return ready to continue school.
            </p>
          </div>
        </div>
        <div className="relative w-[46%] shrink-0 max-sm:hidden" aria-hidden="true">
          <span className="absolute inset-0 z-[1] bg-[linear-gradient(to_right,#062841_0%,rgba(6,40,65,0.38)_36%,transparent_72%)]" />
          <img src="/GSL.webp" alt="" className="h-full w-full object-cover" />
        </div>
      </div>
      <div className="grid grid-cols-4 gap-6 border-t border-[#e3e8ed] bg-white px-7 py-4 max-[900px]:grid-cols-2 max-sm:gap-4.4 max-sm:p-4">
        {details.map((detail) => (
          <div key={detail.label} className="min-w-0">
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.08em] text-[#66788a]">
              {detail.label}
            </p>
            <strong className="mt-1.68 block text-[0.9rem] leading-[1.45] text-[#29313a] [overflow-wrap:anywhere] max-sm:text-[0.82rem]">
              {detail.value}
            </strong>
          </div>
        ))}
      </div>
    </section>
  );
}
