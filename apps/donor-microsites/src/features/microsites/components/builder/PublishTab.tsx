import { useState } from 'react';
import { Link } from 'react-router';

import { Button, Notice, useToast } from '@rfdtech/components';
import {
  Archive,
  CheckCircle2,
  CircleDashed,
  Copy,
  ExternalLink,
  Globe,
  Undo2,
} from 'lucide-react';

import type { Microsite } from '@partner-crm/types';
import { DetailGrid, DetailItem, SectionCard, formatDateTime } from '@partner-crm/ui';

import { publicSiteRoute } from '@/constants/routes';
import { MicrositeAccessBadge } from '@/features/microsites/components/MicrositeBadges';
import { publishBlockers, publishChecks } from '@/features/microsites/domain';
import { PERMISSION_REASONS } from '@/features/microsites/permissions';
import { useMicrosites } from '@/features/microsites/state/useMicrosites';

import { ArchiveModal } from './ArchiveModal';

interface PublishTabProps {
  site: Microsite;
  canPublish: boolean;
  canArchive: boolean;
}

export function PublishTab({ site, canPublish, canArchive }: PublishTabProps) {
  const { publish, unpublish, hasStoredCode } = useMicrosites();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);

  const storedCode = hasStoredCode(site);
  const checks = publishChecks(site, storedCode);
  const blocked = publishBlockers(site, storedCode).length > 0;
  const path = publicSiteRoute(site.slug);

  const run = async (action: 'publish' | 'unpublish') => {
    setBusy(true);
    try {
      if (action === 'publish') {
        const saved = await publish(site.id);
        toast({
          title: 'Microsite published',
          description: `Version ${saved.version} is live at ${path}.`,
          variant: 'success',
        });
      } else {
        await unpublish(site.id);
        toast({
          title: 'Microsite unpublished',
          description: 'It is offline and stays approved until edited.',
          variant: 'success',
        });
      }
    } catch {
      // The provider has already toasted the server's reason.
    } finally {
      setBusy(false);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${path}`);
      toast({
        title: 'Link copied',
        description: 'Share it with the audience, with the access code if one is set.',
      });
    } catch {
      toast({
        title: 'Could not copy the link',
        description: `Copy it by hand: ${path}`,
        variant: 'warning',
      });
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <SectionCard title="Publishing" /* description="Only an approved version can go live." */>
        <div className="space-y-5">
          <ul className="space-y-2">
            {checks.map((check) => (
              <li key={check.id} className="flex items-center gap-2 text-sm">
                {check.passed ? (
                  <CheckCircle2 size={18} aria-hidden className="text-success" />
                ) : (
                  <CircleDashed size={18} aria-hidden className="text-foreground-muted" />
                )}
                <span className={check.passed ? 'text-foreground' : 'text-foreground-muted'}>
                  {check.label}
                </span>
                <span className="sr-only">{check.passed ? '(done)' : '(not yet)'}</span>
              </li>
            ))}
          </ul>

          {!canPublish ? (
            <Notice variant="warning" title="Publishing is restricted" leftBorder>
              {PERMISSION_REASONS.publish}
            </Notice>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {site.status === 'PUBLISHED' ? (
              <Button
                variant="outline"
                disabled={!canPublish || busy}
                loading={busy}
                onClick={() => void run('unpublish')}
              >
                <Undo2 size={16} aria-hidden /> Unpublish
              </Button>
            ) : (
              <Button
                disabled={!canPublish || blocked || busy}
                loading={busy}
                onClick={() => void run('publish')}
              >
                <Globe size={16} aria-hidden /> Publish version {site.version}
              </Button>
            )}
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Public link" /* description="Promote it by email, social media or QR code once live." */
      >
        <div className="space-y-4">
          <DetailGrid columns={2}>
            <DetailItem label="Access" value={<MicrositeAccessBadge access={site.access} />} />
            <DetailItem
              label="Live version"
              value={
                site.publishedVersion !== null ? `v${site.publishedVersion}` : 'Never published'
              }
              hint={site.publishedAt ? `Since ${formatDateTime(site.publishedAt)}` : undefined}
            />
          </DetailGrid>
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface-subtle px-3 py-2">
            <span className="min-w-0 flex-1 truncate font-mono text-sm text-foreground">
              {path}
            </span>
            <Button size="sm" variant="ghost" onClick={() => void copyLink()}>
              <Copy size={14} aria-hidden /> Copy
            </Button>
            {site.status === 'PUBLISHED' ? (
              <Link
                to={path}
                target="_blank"
                rel="noopener"
                className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                Open <ExternalLink size={14} aria-hidden />
              </Link>
            ) : null}
          </div>
          {site.status !== 'PUBLISHED' ? (
            <p className="text-xs text-foreground-muted">
              The link works once the microsite is published.
            </p>
          ) : null}
        </div>
      </SectionCard>

      <SectionCard
        title="Archive"
        // description="When a campaign or report reaches the end of its life, archive it with its S003 records reference."
        className="xl:col-span-2"
      >
        {site.status === 'ARCHIVED' ? (
          <DetailGrid columns={2}>
            <DetailItem
              label="S003 archive reference"
              value={<span className="font-mono">{site.archiveRef}</span>}
            />
            <DetailItem label="Archived" value={formatDateTime(site.archivedAt)} />
          </DetailGrid>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-foreground-muted">
              Archiving is permanent and takes the microsite offline.
            </p>
            <Button
              variant="destructive"
              disabled={!canArchive}
              title={canArchive ? undefined : PERMISSION_REASONS.archive}
              onClick={() => setArchiveOpen(true)}
            >
              <Archive size={16} aria-hidden /> Archive microsite
            </Button>
          </div>
        )}
      </SectionCard>

      {archiveOpen ? <ArchiveModal site={site} open onOpenChange={setArchiveOpen} /> : null}
    </div>
  );
}
