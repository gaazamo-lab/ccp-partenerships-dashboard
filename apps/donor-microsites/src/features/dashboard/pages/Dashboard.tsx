import { type ReactNode, useMemo } from 'react';
import { Link, useNavigate } from 'react-router';

import { Badge, Button } from '@rfdtech/components';
import {
  CheckCircle2,
  ClipboardCheck,
  Eye,
  FilePen,
  Globe,
  MessageSquareWarning,
  Plus,
} from 'lucide-react';

import { useAuth } from '@partner-crm/auth';
import type { Microsite } from '@partner-crm/types';
import {
  EmptyState,
  KpiGrid,
  PageHeader,
  SectionCard,
  filterLink,
  formatCount,
  formatDateTime,
} from '@partner-crm/ui';

import { ROUTES, siteRoute } from '@/constants/routes';
import { LoadGate } from '@/features/microsites/components/LoadGate';
import { MicrositeStatusBadge } from '@/features/microsites/components/MicrositeBadges';
import { submitterOf } from '@/features/microsites/domain';
import { PURPOSE_LABELS } from '@/features/microsites/labels';
import { PERMISSION_REASONS, canMicrosite } from '@/features/microsites/permissions';
import { useMicrosites } from '@/features/microsites/state/useMicrosites';

interface AttentionItem {
  site: Microsite;
  reason: string;
  detail: string;
  icon: ReactNode;
}

function SiteRow({ site, meta, icon }: { site: Microsite; meta: string; icon?: ReactNode }) {
  return (
    <Link
      to={siteRoute(site.id)}
      className="flex items-center gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-surface-subtle"
    >
      {icon ? <span className="shrink-0 text-primary">{icon}</span> : null}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-foreground">{site.title}</span>
        <span className="block truncate text-xs text-foreground-muted">{meta}</span>
      </span>
      <MicrositeStatusBadge status={site.status} />
    </Link>
  );
}

export function Component() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { sites, reviews, actor } = useMicrosites();
  const canBuild = canMicrosite(user?.role, 'build');
  const canReview = canMicrosite(user?.role, 'review');

  const counts = useMemo(() => {
    const by = (status: Microsite['status']) =>
      sites.filter((site) => site.status === status).length;
    return {
      published: by('PUBLISHED'),
      inReview: by('IN_REVIEW'),
      drafts: by('DRAFT'),
      views: sites.reduce((sum, site) => sum + site.analytics.views, 0),
    };
  }, [sites]);

  const attention = useMemo<AttentionItem[]>(() => {
    const items: AttentionItem[] = [];
    for (const site of sites) {
      if (site.status === 'CHANGES_REQUESTED') {
        const request = (reviews[site.id] ?? []).find(
          (review) => review.decision === 'CHANGES_REQUESTED',
        );
        items.push({
          site,
          reason: 'Changes requested',
          detail: request ? `${request.actor}: “${request.comment}”` : `Owner: ${site.owner}`,
          icon: <MessageSquareWarning size={18} aria-hidden />,
        });
      }
      if (site.status === 'IN_REVIEW') {
        const submitter = submitterOf(site, reviews[site.id] ?? []);
        const mine = submitter !== null && submitter.toLowerCase() === actor.toLowerCase();
        if (!mine) {
          items.push({
            site,
            reason: canReview ? 'Awaiting your review' : 'Awaiting RMF/CCP review',
            detail: `Version ${site.version} submitted by ${submitter ?? 'a colleague'}`,
            icon: <ClipboardCheck size={18} aria-hidden />,
          });
        }
      }
    }
    return items;
  }, [sites, reviews, actor, canReview]);

  const recent = useMemo(
    () =>
      [...sites].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)).slice(0, 5),
    [sites],
  );

  return (
    <section className="flex flex-col gap-body">
      <PageHeader
        title="Donor microsites"
        // description="Build, review and publish donor, annual-report and campaign microsites from approved components."
        meta={<Badge variant="outline">System S091</Badge>}
        actions={
          <Button
            disabled={!canBuild}
            title={canBuild ? undefined : PERMISSION_REASONS.build}
            onClick={() => void navigate(ROUTES.SITE_CREATE)}
          >
            <Plus size={16} aria-hidden /> New microsite
          </Button>
        }
      />

      <LoadGate>
        <KpiGrid
          kpis={[
            {
              id: 'published',
              label: 'Published',
              value: counts.published,
              description: 'Live for their audience',
              icon: <Globe size={18} aria-hidden />,
              to: filterLink(ROUTES.SITES, 'microsites', { status: 'PUBLISHED' }),
            },
            {
              id: 'review',
              label: 'In review',
              value: counts.inReview,
              description: 'Waiting for RMF/CCP approval',
              icon: <ClipboardCheck size={18} aria-hidden />,
              to: filterLink(ROUTES.SITES, 'microsites', { status: 'IN_REVIEW' }),
            },
            {
              id: 'drafts',
              label: 'Drafts',
              value: counts.drafts,
              description: 'Being built',
              icon: <FilePen size={18} aria-hidden />,
              to: filterLink(ROUTES.SITES, 'microsites', { status: 'DRAFT' }),
            },
            {
              id: 'views',
              label: 'Total views',
              value: formatCount(counts.views),
              description: 'Across every microsite',
              icon: <Eye size={18} aria-hidden />,
              to: ROUTES.ANALYTICS,
            },
          ]}
        />

        <div className="grid gap-6 xl:grid-cols-2">
          <SectionCard
            title="Needs attention" /* description="Sent back for changes, or waiting for a review decision." */
          >
            {attention.length === 0 ? (
              <EmptyState
                message="Nothing is waiting on you"
                hint="Sites sent back for changes and sites awaiting review will appear here."
                icon={<CheckCircle2 size={22} aria-hidden />}
              />
            ) : (
              <div className="-mx-3 divide-y divide-border">
                {attention.map((item) => (
                  <SiteRow
                    key={`${item.site.id}-${item.reason}`}
                    site={item.site}
                    icon={item.icon}
                    meta={`${item.reason} · ${item.detail}`}
                  />
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard
            title="Recently updated"
            actions={
              <Link to={ROUTES.SITES} className="text-sm font-medium text-primary hover:underline">
                View all
              </Link>
            }
          >
            {recent.length === 0 ? (
              <EmptyState
                message="No microsites yet"
                hint="Start from a template to build the first annual report or donor impact site."
                icon={<Plus size={22} aria-hidden />}
                action={
                  <Button disabled={!canBuild} onClick={() => void navigate(ROUTES.SITE_CREATE)}>
                    New microsite
                  </Button>
                }
              />
            ) : (
              <div className="-mx-3 divide-y divide-border">
                {recent.map((site) => (
                  <SiteRow
                    key={site.id}
                    site={site}
                    meta={`${PURPOSE_LABELS[site.purpose]} · ${site.owner} · ${formatDateTime(site.updatedAt)}`}
                  />
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      </LoadGate>
    </section>
  );
}
