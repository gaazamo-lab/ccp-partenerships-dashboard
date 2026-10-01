import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';

import {
  Badge,
  Button,
  Card,
  Modal,
  ModalBody,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  Notice,
  ProgressBar,
  useToast,
} from '@rfdtech/components';
import { Download, Eye, Pencil, Plus, RefreshCw, Send, Trash2, UsersRound } from 'lucide-react';

import { useAuth } from '@partner-crm/auth';

import { ROUTES, segmentEditRoute } from '@/constants/routes';
import { exportSegmentMembers } from '@/features/segments/exportMembers';
import { SegmentMembersSheet } from '@/features/segments/components/SegmentMembersSheet';
import {
  describeCriteria,
  resolveSegmentMembers,
  segmentCounts,
  segmentCriteria,
} from '@/features/segments/resolution';
import { ActionMenu, EmptyState, PageHeader, formatCount, rate } from '@/features/shared';
import { displayDate } from '@/features/stakeholders/engagements';
import { permissionHint } from '@/features/stakeholders/permissions';
import { useCrm } from '@/features/stakeholders/state/CrmContext';
import type { Segment } from '@/features/stakeholders/types';

/** Consent coverage below this reads as a warning rather than a healthy band. */
const CONSENT_TARGET = 85;

export function Component() {
  const { user } = useAuth();
  const { segments, stakeholders, deleteSegment, loading, error, reload } = useCrm();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [viewing, setViewing] = useState<Segment | null>(null);
  const [deleting, setDeleting] = useState<Segment | null>(null);
  const manageHint = permissionHint(user?.role, 'manage_segments');
  const exportHint = permissionHint(user?.role, 'export');

  // Resolved on every render from the live register (SRS-S081-B-03): the
  // stored `members` / `consented` fields are never trusted for display.
  const resolved = useMemo(
    () =>
      segments.map((segment) => {
        const criteria = segmentCriteria(segment);
        const members = resolveSegmentMembers(criteria, stakeholders);
        return { segment, criteria, members, counts: segmentCounts(members) };
      }),
    [segments, stakeholders],
  );

  const createButton = (
    <Button onClick={() => void navigate(ROUTES.SEGMENT_CREATE)} disabled={Boolean(manageHint)} title={manageHint}>
      <Plus size={16} aria-hidden /> Create segment
    </Button>
  );

  return (
    <section className="flex flex-col gap-body">
      <PageHeader
        title="Audience segments"
        // description="Live, queryable stakeholder groups shared with newsletters and consultations."
        actions={createButton}
      />

      {error ? (
        <Notice variant="error" title="Segments could not be loaded" leftBorder>
          <p>{error}</p>
          <Button className="mt-3" size="sm" variant="outline" onClick={reload}>
            <RefreshCw size={14} aria-hidden /> Try again
          </Button>
        </Notice>
      ) : null}

      {loading && segments.length === 0 ? (
        <Card bordered>
          <EmptyState
            message="Loading segments"
            hint="Segments appear as soon as the S081 register responds."
            icon={<UsersRound size={22} aria-hidden />}
          />
        </Card>
      ) : segments.length === 0 ? (
        <Card bordered>
          <EmptyState
            message="No segments yet"
            hint="Create a segment to share a stakeholder audience with S075 Newsletter or S088 Consultations."
            icon={<UsersRound size={22} aria-hidden />}
            action={createButton}
          />
        </Card>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {resolved.map(({ segment, criteria, members, counts }) => {
            const coverage = Math.round(rate(counts.consented, counts.members));
            return (
              <Card key={segment.id} bordered className="flex flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                      <UsersRound size={20} aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold text-foreground">{segment.name}</h3>
                      <p className="mt-0.5 text-xs text-foreground-muted">
                        Rules updated {displayDate(segment.updated)}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`View ${segment.name} members`}
                      onClick={() => setViewing(segment)}
                    >
                      <Eye size={16} aria-hidden /> Members
                    </Button>
                    <ActionMenu
                      label={`${segment.name} actions`}
                      items={[
                        {
                          id: 'edit',
                          label: 'Edit rules',
                          icon: <Pencil size={15} aria-hidden />,
                          onSelect: () => void navigate(segmentEditRoute(segment.id)),
                          disabled: Boolean(manageHint),
                          disabledReason: manageHint,
                        },
                        {
                          id: 'export',
                          label: 'Export members (CSV)',
                          icon: <Download size={15} aria-hidden />,
                          onSelect: () => exportSegmentMembers(segment, members),
                          disabled: Boolean(exportHint) || members.length === 0,
                          disabledReason: exportHint ?? 'Nobody matches this segment yet.',
                        },
                        {
                          id: 'delete',
                          label: 'Delete segment',
                          icon: <Trash2 size={15} aria-hidden />,
                          onSelect: () => setDeleting(segment),
                          disabled: Boolean(manageHint),
                          disabledReason: manageHint,
                          destructive: true,
                        },
                      ]}
                    />
                  </div>
                </div>

                <p className="mt-4 min-h-10 text-sm leading-6 text-foreground-muted">
                  {segment.description}
                </p>
                <p className="mt-2 text-xs text-foreground-muted">{describeCriteria(criteria)}</p>

                <div className="mt-5 grid grid-cols-3 gap-3">
                  <div className="rounded-xl bg-surface-subtle p-3">
                    <p className="text-2xl font-bold tabular-nums text-foreground">
                      {formatCount(counts.members)}
                    </p>
                    <p className="text-xs text-foreground-muted">Current members</p>
                  </div>
                  <div className="rounded-xl bg-surface-subtle p-3">
                    <p className="text-2xl font-bold tabular-nums text-foreground">
                      {formatCount(counts.organisations)}
                    </p>
                    <p className="text-xs text-foreground-muted">Organisations</p>
                  </div>
                  <div className="rounded-xl bg-surface-subtle p-3">
                    <p className="text-2xl font-bold tabular-nums text-foreground">{coverage}%</p>
                    <p className="text-xs text-foreground-muted">Consent coverage</p>
                  </div>
                </div>

                <div className="mt-4">
                  <ProgressBar
                    value={coverage}
                    size="sm"
                    variant={coverage < CONSENT_TARGET ? 'warning' : 'success'}
                  />
                  <p className="mt-2 text-xs text-foreground-muted">
                    {formatCount(counts.consented)} of {formatCount(counts.members)} members have
                    recorded consent
                    {counts.members > 0 && coverage < CONSENT_TARGET
                      ? ` · below the ${CONSENT_TARGET}% target`
                      : ''}
                  </p>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {segment.usedBy.map((system) => (
                    <Badge key={system} variant="outline">
                      <Send size={12} aria-hidden /> {system}
                    </Badge>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Card bordered className="bg-primary text-white">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/70">
              Reference, not replication
            </p>
            <h2 className="mt-2 text-xl font-bold">
              Segments always resolve against current CRM data
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/75">
              S075 Newsletter and S088 Consultations retrieve membership at send time. Inactive
              organisations, deactivated contacts, contacts held by S203 and contacts who
              withdrew consent are excluded automatically.
            </p>
          </div>
          <Badge variant="success">API ready</Badge>
        </div>
      </Card>

      {viewing ? (
        <SegmentMembersSheet
          open
          onOpenChange={(open) => {
            if (!open) setViewing(null);
          }}
          segment={viewing}
          stakeholders={stakeholders}
          exportHint={exportHint}
        />
      ) : null}

      {deleting ? (
        <Modal
          open
          onOpenChange={(open) => {
            if (!open) setDeleting(null);
          }}
        >
          <ModalContent size="sm">
            <ModalHeader>
              <ModalTitle>Delete {deleting.name}?</ModalTitle>
              <ModalDescription>
                {deleting.usedBy.length > 0
                  ? `${deleting.usedBy.join(' and ')} will no longer be able to resolve this audience.`
                  : 'No system currently uses this segment.'}
              </ModalDescription>
            </ModalHeader>
            <ModalBody>
              <p className="text-sm text-foreground-muted">
                Contacts are not affected — only the saved rules are removed.
              </p>
            </ModalBody>
            <ModalFooter>
              <Button variant="ghost" onClick={() => setDeleting(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  deleteSegment(deleting.id);
                  toast({
                    title: 'Segment deleted',
                    description: `${deleting.name} is no longer available to downstream systems.`,
                    variant: 'warning',
                  });
                  setDeleting(null);
                }}
              >
                <Trash2 size={16} aria-hidden /> Delete segment
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      ) : null}
    </section>
  );
}
