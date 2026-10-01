import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';

import { Badge, Button, Card } from '@rfdtech/components';
import { ExternalLink, SearchX } from 'lucide-react';

import type { Microsite } from '@partner-crm/types';
import { EmptyState, PageHeader } from '@partner-crm/ui';

import { ROUTES, publicSiteRoute } from '@/constants/routes';
import { LoadGate } from '@/features/microsites/components/LoadGate';
import { MicrositeAccessBadge, MicrositeStatusBadge } from '@/features/microsites/components/MicrositeBadges';
import { type BuilderTab, BuilderWorkspace } from '@/features/microsites/components/builder/BuilderWorkspace';
import { useMicrosites } from '@/features/microsites/state/useMicrosites';

function Builder({ site }: { site: Microsite }) {
  const { loadReviews } = useMicrosites();
  const [tab, setTab] = useState<BuilderTab>('content');

  useEffect(() => {
    void loadReviews(site.id);
  }, [loadReviews, site.id, site.status]);

  return (
    <section className="flex flex-col gap-body">
      <PageHeader
        title={site.title}
        // description={`${PURPOSE_LABELS[site.purpose]} · Owner: ${site.owner} · Version ${site.version}`}
        backTo={{ to: ROUTES.SITES, label: 'Back to microsites' }}
        meta={
          <>
            <span className="font-mono text-xs font-bold text-primary">/sites/{site.slug}</span>
            <MicrositeStatusBadge status={site.status} />
            <MicrositeAccessBadge access={site.access} />
            <Badge variant="outline">System S091</Badge>
          </>
        }
        actions={
          site.status === 'PUBLISHED' ? (
            <Link to={publicSiteRoute(site.slug)} target="_blank" rel="noopener">
              <Button variant="outline">
                <ExternalLink size={16} aria-hidden /> View live
              </Button>
            </Link>
          ) : null
        }
      />
      <BuilderWorkspace key={`${site.id}:${site.version}`} site={site} tab={tab} onTabChange={setTab} />
    </section>
  );
}

export function Component() {
  const navigate = useNavigate();
  const { siteId } = useParams();
  const { sites } = useMicrosites();
  const site = sites.find((item) => item.id === siteId);

  return (
    <LoadGate>
      {site ? (
        <Builder site={site} />
      ) : (
        <section className="flex flex-col gap-body">
          <PageHeader title="Microsite not found" backTo={{ to: ROUTES.SITES, label: 'Back to microsites' }} />
          <Card bordered>
            <EmptyState
              message="This microsite is no longer available"
              hint={`Nothing matches the reference ${siteId ?? ''}. The link may be out of date.`}
              icon={<SearchX size={22} aria-hidden />}
              action={<Button onClick={() => void navigate(ROUTES.SITES)}>Browse all microsites</Button>}
            />
          </Card>
        </section>
      )}
    </LoadGate>
  );
}
