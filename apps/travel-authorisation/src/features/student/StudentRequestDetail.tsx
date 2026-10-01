import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';

import { Badge, Button, Notice, ProgressBar } from '@rfdtech/components';
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  FileCheck2,
  FileUp,
  MapPin,
  PlaneLanding,
  Send,
} from 'lucide-react';

import { useAuth } from '@partner-crm/auth';

import { StatusBadge } from '@/components/StatusBadge';
import { ROUTES } from '@/constants/routes';
import { evidenceReady, nextWorkflowAction } from '@/features/requests/domain';
import { useRequests } from '@/features/requests/requests-context';

export function Component() {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { requests, setEvidence, advanceRequest } = useRequests();
  const request = requests.find(
    (item) =>
      item.id === requestId && (item.traveller === user?.name || item.requester === user?.name),
  );
  const [references, setReferences] = useState<Record<number, string>>({});
  const [message, setMessage] = useState('');

  if (!request)
    return (
      <Notice variant="error" title="Request not found">
        This request is not linked to your student account.
      </Notice>
    );

  const complete = request.evidence.filter((item) => item.status !== 'Missing').length;
  const documentProgress = request.evidence.length ? (complete / request.evidence.length) * 100 : 0;
  const canSubmit = ['Draft', 'Returned'].includes(request.status);
  const canReportReturn = request.status === 'Travel authorised';

  const submit = () => {
    const reportingReturn = request.status === 'Travel authorised';
    const result = advanceRequest(request.id);
    setMessage(
      result.ok
        ? reportingReturn
          ? 'Your return has been reported. The school can now complete and close the record.'
          : 'Your request has been sent for review.'
        : (result.message ?? 'Complete the required documents first.'),
    );
  };

  return (
    <section className="space-y-6">
      <button
        type="button"
        onClick={() => navigate(ROUTES.STUDENT_HOME)}
        className="inline-flex items-center gap-1.6 text-sm font-semibold text-[#66727d] hover:text-[#076ca3]"
      >
        <ArrowLeft size={17} />
        Back to my travel
      </button>

      <div className="flex min-h-37 items-center justify-between gap-6 overflow-hidden rounded-[0.85rem] bg-[linear-gradient(110deg,#062841_0%,#074b73_100%)] px-8 py-7 shadow-[0_3px_10px_rgba(6,40,65,0.12)] max-sm:flex-col max-sm:items-start max-sm:p-5.4">
        <div className="flex min-w-0 items-center gap-4">
          <span className="grid h-13.5 w-13.5 shrink-0 place-items-center rounded-xl border border-white/25 bg-white/10 text-white">
            <MapPin size={24} />
          </span>
          <div className="min-w-0">
            <p className="text-[0.73rem] font-bold uppercase tracking-[0.07em] text-white/65">
              Travel request · {request.reference}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <h1 className="m-0 text-[clamp(1.5rem,3vw,2rem)] font-[750] text-white">
                {request.destination}
              </h1>
              <StatusBadge status={request.status} />
            </div>
            <p className="mt-2 flex items-center gap-2 text-sm text-white/75">
              <CalendarDays size={16} />
              {request.startDate} to {request.endDate}
            </p>
          </div>
        </div>
        <div className="shrink-0 max-sm:w-full">
          {canSubmit ? (
            <Button className="max-sm:w-full" onClick={submit} disabled={!evidenceReady(request)}>
              <Send size={17} />
              Submit for review
            </Button>
          ) : canReportReturn ? (
            <Button className="max-sm:w-full" onClick={submit}>
              <PlaneLanding size={17} />I have returned
            </Button>
          ) : null}
        </div>
      </div>

      {message ? (
        <Notice
          variant={message.includes('sent') || message.includes('reported') ? 'success' : 'warning'}
          title="Request update"
        >
          {message}
        </Notice>
      ) : null}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="space-y-6">
          <section
            className="overflow-hidden rounded-xl border border-[#dfe5ea] bg-white shadow-[0_2px_8px_rgba(22,34,45,0.045)]"
            aria-labelledby="documents-heading"
          >
            <header className="flex min-h-18.5 items-center justify-between gap-4 border-b border-[#e4e9ed] px-5 py-4 max-sm:flex-col max-sm:items-start max-sm:p-4">
              <div>
                <h2 id="documents-heading" className="m-0 text-base font-bold text-[#20252b]">
                  Required documents
                </h2>
                <p className="mt-1 text-[0.8rem] leading-[1.45] text-[#6b7280]">
                  Add the official record reference supplied for each uploaded document.
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-[#eaf5fc] px-2.6 py-1.28 text-[0.72rem] font-bold text-[#076ca3]">
                {complete}/{request.evidence.length} ready
              </span>
            </header>
            <div className="divide-y divide-[#e8ecef]">
              {request.evidence.map((item, index) => (
                <div
                  key={`${item.label}-${index}`}
                  className="flex items-start gap-3.6 px-5 py-4.6 max-sm:p-4"
                >
                  <span className="grid h-10.5 w-10.5 shrink-0 place-items-center rounded-[0.65rem] bg-[#eaf5fc] text-[#076ca3] max-sm:hidden">
                    <FileCheck2 size={20} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-[#20252b]">{item.label}</p>
                        <p className="mt-1 text-xs text-[#6b7280]">
                          {item.sensitive
                            ? 'Restricted — visible only to authorised reviewers'
                            : 'Required for review'}
                        </p>
                      </div>
                      <Badge
                        variant={
                          item.status === 'Received'
                            ? 'success'
                            : item.status === 'Exception'
                              ? 'warning'
                              : 'error'
                        }
                      >
                        {item.status}
                      </Badge>
                    </div>
                    {canSubmit ? (
                      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                        <input
                          className="w-full rounded-[0.65rem] border border-border px-3.2 py-2.8 text-sm text-foreground placeholder:text-text-muted hover:border-[#b8c3cc] hover:bg-white focus:border-[#2f8fbd] focus:bg-white focus:shadow-[0_0_0_3px_rgba(7,108,163,0.12)] focus:outline-none transition-colors duration-150"
                          value={references[index] ?? item.reference ?? ''}
                          onChange={(event) =>
                            setReferences((current) => ({
                              ...current,
                              [index]: event.target.value,
                            }))
                          }
                          placeholder="Document reference, e.g. S003-EVD-1029"
                        />
                        <Button
                          variant="outline"
                          disabled={!references[index]?.trim()}
                          onClick={() =>
                            setEvidence(request.id, index, 'Received', references[index])
                          }
                        >
                          <FileUp size={16} />
                          Attach
                        </Button>
                      </div>
                    ) : item.reference ? (
                      <p className="mt-3 text-xs font-semibold text-[#425466]">
                        Reference: {item.reference}
                      </p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section
            className="overflow-hidden rounded-xl border border-[#dfe5ea] bg-white shadow-[0_2px_8px_rgba(22,34,45,0.045)]"
            aria-labelledby="review-heading"
          >
            <header className="flex min-h-18.5 items-center justify-between gap-4 border-b border-[#e4e9ed] px-5 py-4 max-sm:flex-col max-sm:items-start max-sm:p-4">
              <div>
                <h2 id="review-heading" className="m-0 text-base font-bold text-[#20252b]">
                  Review progress
                </h2>
                <p className="mt-1 text-[0.8rem] leading-[1.45] text-[#6b7280]">
                  The school reviews every request before authorising travel.
                </p>
              </div>
            </header>
            <div className="divide-y divide-[#e8ecef]">
              {request.approvals.map((step, index) => (
                <div key={step.id} className="flex items-start gap-3.2 px-5 py-4">
                  <span
                    className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-[0.78rem] font-bold ${step.status === 'Approved' ? 'bg-[#e9f8ef] text-[#198754]' : 'bg-[#eef1f3] text-[#75808a]'}`}
                  >
                    {step.status === 'Approved' ? <CheckCircle2 size={18} /> : index + 1}
                  </span>
                  <div>
                    <p className="m-0 text-[0.88rem] font-bold text-[#303840]">{step.label}</p>
                    <small className="mt-0.8 block text-[0.78rem] text-[#6b7280]">
                      {step.status}
                      {step.comment ? ` · ${step.comment}` : ''}
                    </small>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-28">
          <section className="overflow-hidden rounded-xl border border-[#dfe5ea] bg-white shadow-[0_2px_8px_rgba(22,34,45,0.045)]">
            <header className="flex items-center justify-between gap-4 border-b border-[#e4e9ed] px-5 py-4 max-sm:flex-col max-sm:items-start max-sm:p-4">
              <div>
                <h2 className="m-0 text-base font-bold text-[#20252b]">Current step</h2>
                <p className="mt-1 text-[0.8rem] leading-[1.45] text-[#6b7280]">
                  What your request needs now.
                </p>
              </div>
            </header>
            <div className="p-5">
              <p className="font-semibold text-[#20252b]">{nextWorkflowAction(request)}</p>
              <p className="mt-2 text-sm leading-6 text-[#6b7280]">{request.nextAction}</p>
              <div className="mt-5">
                <div className="mb-2 flex justify-between text-xs font-medium text-[#6b7280]">
                  <span>Documents ready</span>
                  <span>
                    {complete}/{request.evidence.length}
                  </span>
                </div>
                <ProgressBar size="sm" value={documentProgress} />
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-xl border border-[#dfe5ea] bg-white shadow-[0_2px_8px_rgba(22,34,45,0.045)]">
            <header className="flex items-center justify-between gap-4 border-b border-[#e4e9ed] px-5 py-4 max-sm:flex-col max-sm:items-start max-sm:p-4">
              <div>
                <h2 className="m-0 text-base font-bold text-[#20252b]">Travel information</h2>
                <p className="mt-1 text-[0.8rem] leading-[1.45] text-[#6b7280]">
                  Details submitted with this request.
                </p>
              </div>
            </header>
            <dl className="m-0 divide-y divide-[#edf0f2] px-5 pb-4 pt-1.4">
              <div className="py-2.8">
                <dt className="text-[0.68rem] font-bold uppercase tracking-[0.06em] text-[#7b858f]">
                  Purpose
                </dt>
                <dd className="mt-1.2 text-[0.84rem] font-semibold leading-normal text-[#303840]">
                  {request.purpose}
                </dd>
              </div>
              <div className="py-2.8">
                <dt className="text-[0.68rem] font-bold uppercase tracking-[0.06em] text-[#7b858f]">
                  Student number
                </dt>
                <dd className="mt-1.2 text-[0.84rem] font-semibold leading-normal text-[#303840]">
                  {request.studentNumber}
                </dd>
              </div>
              <div className="py-2.8">
                <dt className="text-[0.68rem] font-bold uppercase tracking-[0.06em] text-[#7b858f]">
                  Programme
                </dt>
                <dd className="mt-1.2 text-[0.84rem] font-semibold leading-normal text-[#303840]">
                  {request.programme}
                </dd>
              </div>
              <div className="py-2.8">
                <dt className="text-[0.68rem] font-bold uppercase tracking-[0.06em] text-[#7b858f]">
                  Sponsor
                </dt>
                <dd className="mt-1.2 text-[0.84rem] font-semibold leading-normal text-[#303840]">
                  {request.sponsor || 'Self-funded'}
                </dd>
              </div>
            </dl>
          </section>
        </aside>
      </div>
    </section>
  );
}
