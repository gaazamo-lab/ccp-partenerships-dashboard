import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router';

import { Badge, Button } from '@rfdtech/components';

import type { IrEngagement, IrFollowUp } from '@partner-crm/types';
import { CheckboxField, PageHeader, SelectField, formatDate, useNow } from '@partner-crm/ui';

import { engagementRoute } from '@/constants/routes';

import { MandatoryBadge } from '../components/Badges';
import { LoadNotice } from '../components/LoadNotice';
import { type FollowUpColumn, followUpColumn } from '../domain';
import { useIr } from '../state/useIr';
import { TABLE } from '../tables';

const COLUMNS: Array<{ id: FollowUpColumn; label: string; tone: string }> = [
  { id: 'OPEN', label: 'Open', tone: 'border-t-primary' },
  { id: 'OVERDUE', label: 'Overdue', tone: 'border-t-error' },
  { id: 'DONE', label: 'Done', tone: 'border-t-success' },
  { id: 'EXCEPTION', label: 'Exception', tone: 'border-t-border-strong' },
];

const OWNER_PARAM = `${TABLE.FOLLOW_UPS}.f_owner`;
const MANDATORY_PARAM = `${TABLE.FOLLOW_UPS}.f_mandatory`;

interface BoardItem {
  followUp: IrFollowUp;
  engagement: IrEngagement;
}

export function Component() {
  const { engagements } = useIr();
  const now = useNow();
  const [params, setParams] = useSearchParams();
  const owner = params.get(OWNER_PARAM) ?? '';
  const mandatoryOnly = params.get(MANDATORY_PARAM) === 'YES';

  const all = useMemo<BoardItem[]>(
    () => engagements.flatMap((engagement) => engagement.followUps.map((followUp) => ({ followUp, engagement }))),
    [engagements],
  );
  const owners = useMemo(() => [...new Set(all.map((item) => item.followUp.owner))].sort(), [all]);
  const visible = all.filter(
    (item) => (!owner || item.followUp.owner === owner) && (!mandatoryOnly || item.followUp.mandatory),
  );

  const setParam = (key: string, value: string) =>
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (value) next.set(key, value);
        else next.delete(key);
        return next;
      },
      { replace: true },
    );

  return (
    <section className="flex flex-col gap-body">
      <PageHeader
        title="Follow-up board"
        // description="Every follow-up action across engagements. Mandatory items block closure until done or excepted."
        meta={<Badge variant="outline">System S083</Badge>}
      />
      <LoadNotice />

      <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface-subtle p-4 sm:flex-row sm:items-end">
        <SelectField
          label="Owner"
          value={owner}
          onChange={(value) => setParam(OWNER_PARAM, value)}
          options={owners}
          placeholder="All owners"
          clearable
          className="sm:w-72"
        />
        <CheckboxField
          label="Mandatory only"
          checked={mandatoryOnly}
          onChange={(checked) => setParam(MANDATORY_PARAM, checked ? 'YES' : '')}
        />
        {owner || mandatoryOnly ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setParam(OWNER_PARAM, '');
              setParam(MANDATORY_PARAM, '');
            }}
          >
            Clear filters
          </Button>
        ) : null}
      </div>

      {all.length === 0 ? (
        <p className="text-sm text-foreground-muted">
          No follow-ups yet. Assign them from an engagement’s “Minutes & follow-ups” tab after the meeting.
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {COLUMNS.map((column) => {
          const items = visible.filter((item) => followUpColumn(item.followUp, now) === column.id);
          return (
            <div key={column.id} className={`rounded-xl border border-border border-t-4 ${column.tone} p-3`}>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">{column.label}</h2>
                <Badge variant={column.id === 'OVERDUE' && items.length ? 'error' : 'outline'}>{items.length}</Badge>
              </div>
              {items.length === 0 ? (
                <p className="px-1 py-4 text-center text-xs text-foreground-muted">Nothing here.</p>
              ) : (
                <ul className="space-y-2">
                  {items.map(({ followUp, engagement }) => (
                    <li key={followUp.id} className="rounded-lg border border-border bg-surface p-3">
                      <p className="text-sm font-semibold text-foreground">{followUp.title}</p>
                      <p className="mt-1 text-xs text-foreground-muted">
                        {followUp.owner} · due {formatDate(followUp.dueDate)}
                      </p>
                      {followUp.exceptionReason ? (
                        <p className="mt-1 text-xs text-foreground-muted">Exception: {followUp.exceptionReason}</p>
                      ) : null}
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <MandatoryBadge mandatory={followUp.mandatory} />
                        <Link
                          to={engagementRoute(engagement.id)}
                          className="font-mono text-xs text-primary hover:underline"
                        >
                          {engagement.reference}
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
