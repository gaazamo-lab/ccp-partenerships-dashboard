import { useNavigate } from 'react-router';

import { Button, ProgressBar } from '@rfdtech/components';
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  FilePlus2,
  PlaneTakeoff,
  ShieldCheck,
} from 'lucide-react';

import { useAuth } from '@partner-crm/auth';

import { StatusBadge } from '@/components/StatusBadge';
import { StudentProfileBanner } from '@/components/StudentProfileBanner';
import { ROUTES, studentRequestRoute } from '@/constants/routes';
import { useRequests } from '@/features/requests/requests-context';

export function Component() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { requests } = useRequests();
  const mine = requests.filter(
    (request) => request.traveller === user?.name || request.requester === user?.name,
  );
  const active = mine.filter(
    (request) => !['Closed', 'Cancelled', 'Rejected'].includes(request.status),
  );
  const approved = mine.filter((request) =>
    ['Approved', 'Travel authorised', 'Completed', 'Closed'].includes(request.status),
  );

  return (
    <section className="space-y-8">
      <StudentProfileBanner activeRequests={active.length} totalRequests={mine.length} />

      <div>
        <h2 className="text-2xl font-bold tracking-tight text-[#20252b]">Travel at a glance</h2>
        <p className="mt-1 text-[15px] text-[#6b7280]">
          Start a request, follow its review and confirm when you return to school.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <button
          type="button"
          className="flex min-h-26.5 w-full items-center gap-4 rounded-xl border border-[#eef1f3] bg-[#e3f5ff] p-5 text-left text-[#076ca3] shadow-[0_2px_8px_rgba(0,0,0,0.05)] transition-[transform,box-shadow,border-color] duration-[180ms] hover:-translate-y-0.5 hover:border-[#b9dced] hover:shadow-[0_4px_12px_rgba(6,40,65,0.09)]"
          onClick={() => navigate(ROUTES.STUDENT_NEW_REQUEST)}
        >
          <span className="grid h-12.5 w-12.5 shrink-0 place-items-center">
            <FilePlus2 size={29} />
          </span>
          <span className="min-w-0 flex-1">
            <strong className="block text-base font-bold">Make a request</strong>
            <small className="mt-1.2 block text-[0.88rem] leading-[1.45] text-[#4d5964]">
              Tell the school about your planned trip.
            </small>
          </span>
          <ArrowRight size={19} />
        </button>
        <div className="flex min-h-26.5 w-full items-center gap-4 rounded-xl border border-[#eef1f3] bg-[#fff4e1] p-5 text-left text-[#a97721] shadow-[0_2px_8px_rgba(0,0,0,0.05)] transition-[transform,box-shadow,border-color] duration-[180ms]">
          <span className="grid h-12.5 w-12.5 shrink-0 place-items-center">
            <Clock3 size={29} />
          </span>
          <span className="min-w-0 flex-1">
            <strong className="block text-base font-bold">{active.length} in progress</strong>
            <small className="mt-1.2 block text-[0.88rem] leading-[1.45] text-[#4d5964]">
              Requests still moving through review.
            </small>
          </span>
        </div>
        <div className="flex min-h-26.5 w-full items-center gap-4 rounded-xl border border-[#eef1f3] bg-[#eefaf3] p-5 text-left text-[#198754] shadow-[0_2px_8px_rgba(0,0,0,0.05)] transition-[transform,box-shadow,border-color] duration-[180ms]">
          <span className="grid h-12.5 w-12.5 shrink-0 place-items-center">
            <CheckCircle2 size={29} />
          </span>
          <span className="min-w-0 flex-1">
            <strong className="block text-base font-bold">{approved.length} authorised</strong>
            <small className="mt-1.2 block text-[0.88rem] leading-[1.45] text-[#4d5964]">
              Approved or completed travel records.
            </small>
          </span>
        </div>
      </div>

      <section
        className="overflow-hidden rounded-xl border border-[#dfe5ea] bg-white shadow-[0_2px_8px_rgba(22,34,45,0.045)]"
        aria-labelledby="my-requests-heading"
      >
        <header className="flex min-h-18.5 items-center justify-between gap-4 border-b border-[#e4e9ed] px-5 py-4 max-sm:flex-col max-sm:items-start max-sm:p-4">
          <div>
            <h2 id="my-requests-heading" className="m-0 text-base font-bold text-[#20252b]">
              My travel requests
            </h2>
            <p className="mt-1 text-[0.8rem] leading-[1.45] text-[#6b7280]">
              Only requests linked to your signed-in student account are shown.
            </p>
          </div>
          <Button size="sm" onClick={() => navigate(ROUTES.STUDENT_NEW_REQUEST)}>
            <FilePlus2 size={16} />
            New request
          </Button>
        </header>

        {mine.length ? (
          <div className="divide-y divide-[#e8ecef]">
            {mine.map((request) => {
              const completed = request.evidence.filter((item) => item.status !== 'Missing').length;
              const percent = request.evidence.length
                ? (completed / request.evidence.length) * 100
                : 0;
              return (
                <button
                  key={request.id}
                  type="button"
                  onClick={() => navigate(studentRequestRoute(request.id))}
                  className="flex w-full items-center gap-4 px-5 py-4.4 text-left transition-colors duration-150 hover:bg-[#f8fafb] max-sm:items-start max-sm:p-4"
                >
                  <span className="grid h-10.5 w-10.5 shrink-0 place-items-center rounded-[0.65rem] bg-[#eaf5fc] text-[#076ca3] max-sm:hidden">
                    <PlaneTakeoff size={20} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <strong className="text-[15px] text-[#20252b]">{request.destination}</strong>
                      <StatusBadge status={request.status} />
                    </span>
                    <span className="mt-1 block text-sm text-[#6b7280]">
                      {request.reference} · {request.startDate} to {request.endDate}
                    </span>
                    <span className="mt-3 block max-w-md">
                      <span className="mb-1 flex justify-between text-xs text-[#6b7280]">
                        <span>Documents</span>
                        <span>
                          {completed}/{request.evidence.length}
                        </span>
                      </span>
                      <ProgressBar size="sm" value={percent} />
                    </span>
                  </span>
                  <span className="inline-flex shrink-0 items-center gap-1 text-[0.84rem] font-bold text-[#076ca3] max-sm:hidden">
                    View request <ArrowRight size={17} />
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="px-6 py-14 text-center">
            <PlaneTakeoff size={32} className="mx-auto text-[#8a949e]" />
            <p className="mt-4 font-semibold text-[#20252b]">You have no travel requests yet</p>
            <p className="mt-1 text-sm text-[#6b7280]">
              Begin here before arranging travel outside the country.
            </p>
            <Button className="mt-5" onClick={() => navigate(ROUTES.STUDENT_NEW_REQUEST)}>
              Make a request
            </Button>
          </div>
        )}
      </section>

      <div className="flex items-start gap-3.6 rounded-xl border border-[#ecd9b7] bg-[#fff9ed] px-4.6 py-4">
        <span className="text-[#ad751d]">
          <ShieldCheck size={22} />
        </span>
        <div>
          <strong className="text-[0.9rem] text-[#543e1c]">
            Wait for travel authorisation before making final arrangements.
          </strong>
          <p className="mt-1 text-[0.82rem] leading-[1.55] text-[#74613f]">
            An internal approval alone is not permission to travel. Your request must show
            <b> Travel authorised</b> before departure.
          </p>
        </div>
      </div>
    </section>
  );
}
