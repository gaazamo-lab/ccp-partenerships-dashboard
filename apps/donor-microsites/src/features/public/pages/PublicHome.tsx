import { Link } from 'react-router';

import { Notice } from '@rfdtech/components';
import { ArrowRight, Loader2, PanelsTopLeft } from 'lucide-react';

import type { PublicMicrosite } from '@partner-crm/types';
import { EmptyState, formatDate } from '@partner-crm/ui';

import { publicSiteRoute } from '@/constants/routes';
import { accentOf } from '@/features/microsites/domain';
import { PURPOSE_LABELS } from '@/features/microsites/labels';
import { usePublicMicrosites } from '@/features/public/usePublicMicrosites';

function SiteCard({ site }: { site: PublicMicrosite }) {
  const accent = accentOf(site);
  return (
    <Link
      to={publicSiteRoute(site.slug)}
      className="group flex w-full flex-col overflow-hidden rounded-xl border border-border bg-surface transition-shadow hover:shadow-md"
    >
      <div className="relative h-28 overflow-hidden" style={{ background: accent }}>
        <div
          aria-hidden
          className="absolute inset-0"
          style={{ background: 'radial-gradient(circle at 90% 0%, rgba(255,255,255,0.25), transparent 60%)' }}
        />
        <span className="absolute bottom-3 left-4 text-xs font-semibold uppercase tracking-[0.16em] text-white/90">
          {PURPOSE_LABELS[site.purpose]}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-5">
        <h2 className="text-lg font-semibold leading-snug text-foreground">{site.title}</h2>
        {site.tagline ? <p className="text-sm leading-6 text-foreground-muted">{site.tagline}</p> : null}
        <div className="mt-auto flex items-center justify-between pt-3 text-sm">
          <span className="text-foreground-muted">Published {formatDate(site.publishedAt)}</span>
          <span className="inline-flex items-center gap-1 font-semibold text-primary">
            Read <ArrowRight size={15} aria-hidden className="transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}

export function Component() {
  const state = usePublicMicrosites();

  return (
    <>
      <section className="border-b border-border bg-surface-subtle">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">CLET publications</p>
          <h1 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Annual reports, impact stories and campaigns
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-foreground-muted">
            See how the Council for Legal Education and Training uses the support of its partners and donors to
            train Ghana’s lawyers.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        {state.status === 'loading' ? (
          <div className="flex items-center justify-center gap-3 py-16 text-sm text-foreground-muted">
            <Loader2 size={18} className="animate-spin" aria-hidden /> Loading microsites…
          </div>
        ) : state.status === 'error' ? (
          <Notice variant="error" title="Microsites could not be loaded" leftBorder>
            {state.message} Refresh the page to try again.
          </Notice>
        ) : state.sites.length === 0 ? (
          <div className="rounded-xl border border-border">
            <EmptyState
              message="Nothing has been published yet"
              hint="Check back soon for the annual report and donor impact stories."
              icon={<PanelsTopLeft size={22} aria-hidden />}
            />
          </div>
        ) : (
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {state.sites.map((site) => (
              <li key={site.slug} className="flex">
                <SiteCard site={site} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
