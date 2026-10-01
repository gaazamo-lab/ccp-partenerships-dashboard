import type { CSSProperties, ReactNode } from 'react';

import { ArrowRight, Download, FileText, ImageIcon, Quote } from 'lucide-react';

import type { MicrositeBlock, PublicMicrosite } from '@partner-crm/types';

import {
  accentOf,
  allocationShares,
  blockHasContent,
  formatMoney,
  isImageUrl,
  safeHref,
} from '@/features/microsites/domain';
import { BLOCK_LABELS, PURPOSE_LABELS } from '@/features/microsites/labels';

/**
 * Renders a published microsite from its blocks. Used by the public viewer and
 * by the builder's live preview, so what reviewers approve is exactly what
 * visitors see.
 *
 * Layout responds to the renderer's own width (container queries), not the
 * window's, so the builder's mobile preview shows the real phone layout.
 */

interface MicrositeRendererProps {
  site: PublicMicrosite;
  /** Builder preview: show a placeholder where a block has no content yet. */
  showEmptyBlocks?: boolean;
}

/** Tint of the accent over the page surface, for quiet panels and tracks. */
function tint(accent: string, percent: number) {
  return `color-mix(in srgb, ${accent} ${percent}%, var(--clet-bg, #fff))`;
}

function Paragraphs({ text, className }: { text: string; className?: string }) {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  if (paragraphs.length === 0) return null;
  return (
    <div className={`space-y-4 ${className ?? ''}`}>
      {paragraphs.map((paragraph, index) => (
        <p key={index} className="whitespace-pre-line">
          {paragraph}
        </p>
      ))}
    </div>
  );
}

function Section({
  children,
  tinted,
  accent,
}: {
  children: ReactNode;
  tinted?: boolean;
  accent: string;
}) {
  return (
    <section style={tinted ? { background: tint(accent, 6) } : undefined}>
      <div className="mx-auto max-w-5xl px-5 py-10 @3xl:px-8 @3xl:py-14">{children}</div>
    </section>
  );
}

function SectionHeading({ heading, body, accent }: { heading: string; body?: string; accent: string }) {
  if (!heading.trim() && !body?.trim()) return null;
  return (
    <div className="mb-6 max-w-3xl space-y-3 @3xl:mb-8">
      <span aria-hidden className="block h-1 w-10 rounded-full" style={{ background: accent }} />
      {heading.trim() ? (
        <h2 className="text-2xl font-semibold tracking-tight text-foreground @3xl:text-3xl">{heading}</h2>
      ) : null}
      {body?.trim() ? <Paragraphs text={body} className="text-base leading-7 text-foreground-muted" /> : null}
    </div>
  );
}

/**
 * An S080 asset. A web address renders as the image; a DAM ID renders as a
 * labelled tile until the asset service resolves it.
 */
export function AssetTile({
  assetRef,
  alt,
  accent,
  onAccent,
  className,
}: {
  assetRef: string;
  alt: string;
  accent: string;
  onAccent?: boolean;
  className?: string;
}) {
  if (isImageUrl(assetRef)) {
    return (
      <img
        src={assetRef}
        alt={alt}
        loading="lazy"
        referrerPolicy="no-referrer"
        className={`h-full w-full rounded-xl object-cover ${className ?? ''}`}
      />
    );
  }
  const style: CSSProperties = onAccent
    ? {}
    : { background: `linear-gradient(135deg, ${tint(accent, 16)}, ${tint(accent, 4)})` };
  return (
    <div
      role="img"
      aria-label={alt ? `${alt} (S080 asset ${assetRef})` : `S080 asset ${assetRef}`}
      style={style}
      className={`flex h-full min-h-40 w-full flex-col items-center justify-center gap-2 rounded-xl border p-4 text-center ${
        onAccent ? 'border-white/25 bg-white/10 text-white' : 'border-border text-foreground-muted'
      } ${className ?? ''}`}
    >
      <ImageIcon size={26} strokeWidth={1.5} aria-hidden style={onAccent ? undefined : { color: accent }} />
      <span className="text-[11px] font-semibold uppercase tracking-wider opacity-80">S080 asset</span>
      <span className="break-all font-mono text-xs">{assetRef}</span>
    </div>
  );
}

function Hero({ block, site, accent }: { block: MicrositeBlock | null; site: PublicMicrosite; accent: string }) {
  const heading = block?.heading.trim() || site.title;
  const body = block?.body.trim() || site.tagline;
  const image = block?.assetRefs[0];
  return (
    <header className="relative overflow-hidden text-white" style={{ background: accent }}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 85% 10%, rgba(255,255,255,0.18), transparent 55%), linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.18))',
        }}
      />
      <div
        className={`relative mx-auto grid max-w-5xl items-center gap-8 px-5 py-12 @3xl:px-8 @3xl:py-20 ${
          image ? '@3xl:grid-cols-[1.15fr_1fr]' : ''
        }`}
      >
        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/80">
            {PURPOSE_LABELS[site.purpose]}
          </p>
          <h1 className="text-3xl font-semibold leading-tight tracking-tight @3xl:text-5xl">{heading}</h1>
          {body ? <Paragraphs text={body} className="max-w-2xl text-base leading-7 text-white/90 @3xl:text-lg" /> : null}
        </div>
        {image ? (
          <div className="aspect-[4/3] w-full">
            <AssetTile assetRef={image} alt={heading} accent={accent} onAccent className="h-full" />
          </div>
        ) : null}
      </div>
    </header>
  );
}

function Metrics({ block, accent }: { block: MicrositeBlock; accent: string }) {
  return (
    <Section accent={accent} tinted>
      <SectionHeading heading={block.heading} body={block.body} accent={accent} />
      <ul className="grid gap-4 @md:grid-cols-2 @4xl:grid-cols-4">
        {block.metrics.map((metric, index) => (
          <li
            key={`${metric.label}-${index}`}
            className="flex flex-col gap-1 rounded-xl border border-border border-t-4 bg-surface p-5"
            style={{ borderTopColor: accent }}
          >
            <span className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">{metric.value}</span>
            <span className="text-sm font-medium text-foreground">{metric.label}</span>
            {metric.sourceRef ? (
              <span className="mt-auto pt-2 font-mono text-[11px] text-foreground-muted">
                Source {metric.sourceRef}
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    </Section>
  );
}

function FundUtilisation({ block, accent }: { block: MicrositeBlock; accent: string }) {
  const { total, rows } = allocationShares(block);
  const largest = Math.max(...rows.map((row) => row.amount), 0);
  return (
    <Section accent={accent}>
      <SectionHeading heading={block.heading} body={block.body} accent={accent} />
      <div className="rounded-xl border border-border bg-surface p-5 @3xl:p-6">
        <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2 border-b border-border pb-4">
          <span className="text-sm font-medium text-foreground-muted">Total</span>
          <span className="text-2xl font-semibold tabular-nums text-foreground">
            {formatMoney(total, block.currency)}
          </span>
        </div>
        <ul className="space-y-4">
          {rows.map((row, index) => {
            const money = formatMoney(row.amount, block.currency);
            // Bars share one scale — the largest line fills the track.
            const width = largest > 0 ? (row.amount / largest) * 100 : 0;
            return (
              <li key={`${row.label}-${index}`} title={`${row.label}: ${money} (${row.percent}%)`}>
                <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 text-sm">
                  <span className="font-medium text-foreground">{row.label}</span>
                  <span className="tabular-nums text-foreground-muted">
                    <span className="font-semibold text-foreground">{money}</span> · {row.percent}%
                  </span>
                </div>
                <div aria-hidden className="h-2.5 w-full rounded-full" style={{ background: tint(accent, 10) }}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${Math.max(width, row.amount > 0 ? 1 : 0)}%`, background: accent }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </Section>
  );
}

function Story({ block, accent, flip }: { block: MicrositeBlock; accent: string; flip: boolean }) {
  const image = block.assetRefs[0];
  return (
    <Section accent={accent}>
      <div className={`grid items-center gap-6 @3xl:gap-10 ${image ? '@3xl:grid-cols-2' : ''}`}>
        {image ? (
          <div className={`aspect-[4/3] w-full ${flip ? '@3xl:order-2' : ''}`}>
            <AssetTile assetRef={image} alt={block.heading} accent={accent} className="h-full" />
          </div>
        ) : null}
        <div className="space-y-3">
          <span aria-hidden className="block h-1 w-10 rounded-full" style={{ background: accent }} />
          {block.heading.trim() ? (
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">{block.heading}</h2>
          ) : null}
          <Paragraphs text={block.body} className="text-base leading-7 text-foreground-muted" />
        </div>
      </div>
    </Section>
  );
}

function PullQuote({ block, accent }: { block: MicrositeBlock; accent: string }) {
  return (
    <Section accent={accent} tinted>
      <figure className="mx-auto max-w-3xl text-center">
        <Quote size={36} aria-hidden className="mx-auto mb-4" style={{ color: accent }} />
        {block.heading.trim() ? (
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-foreground-muted">
            {block.heading}
          </p>
        ) : null}
        <blockquote className="text-xl font-medium leading-snug text-foreground @3xl:text-3xl">
          “{block.body.trim()}”
        </blockquote>
        {block.attribution.trim() ? (
          <figcaption className="mt-5 text-sm font-medium text-foreground-muted">— {block.attribution}</figcaption>
        ) : null}
      </figure>
    </Section>
  );
}

function Gallery({ block, accent }: { block: MicrositeBlock; accent: string }) {
  return (
    <Section accent={accent}>
      <SectionHeading heading={block.heading} body={block.body} accent={accent} />
      <ul className="grid grid-cols-2 gap-3 @3xl:grid-cols-3">
        {block.assetRefs.map((ref, index) => (
          <li key={`${ref}-${index}`} className="aspect-square">
            <AssetTile assetRef={ref} alt={`${block.heading || 'Gallery'} image ${index + 1}`} accent={accent} className="h-full" />
          </li>
        ))}
      </ul>
    </Section>
  );
}

function CallToAction({ block, accent }: { block: MicrositeBlock; accent: string }) {
  const links = block.links
    .map((link) => ({ ...link, href: safeHref(link.url) }))
    .filter((link): link is typeof link & { href: string } => Boolean(link.href));
  return (
    <Section accent={accent}>
      <div className="relative overflow-hidden rounded-2xl px-6 py-10 text-white @3xl:px-12" style={{ background: accent }}>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(circle at 0% 100%, rgba(255,255,255,0.16), transparent 50%)' }}
        />
        <div className="relative flex flex-col gap-6 @3xl:flex-row @3xl:items-center @3xl:justify-between">
          <div className="max-w-2xl space-y-2">
            {block.heading.trim() ? <h2 className="text-2xl font-semibold tracking-tight">{block.heading}</h2> : null}
            <Paragraphs text={block.body} className="text-base leading-7 text-white/90" />
          </div>
          {links.length > 0 ? (
            <div className="flex flex-col gap-3 @sm:flex-row @3xl:flex-col @4xl:flex-row">
              {links.map((link, index) => (
                <a
                  key={`${link.href}-${index}`}
                  href={link.href}
                  target={link.href.startsWith('http') ? '_blank' : undefined}
                  rel={link.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                  className={`inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90 ${
                    index === 0 ? 'bg-white' : 'border border-white/70 text-white'
                  }`}
                  style={index === 0 ? { color: accent } : undefined}
                >
                  {link.label}
                  <ArrowRight size={16} aria-hidden />
                </a>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </Section>
  );
}

function hostOf(href: string): string {
  if (href.startsWith('mailto:')) return href.slice(7);
  try {
    return new URL(href).host;
  } catch {
    return 'This site';
  }
}

function Downloads({ block, accent }: { block: MicrositeBlock; accent: string }) {
  const links = block.links
    .map((link) => ({ ...link, href: safeHref(link.url) }))
    .filter((link): link is typeof link & { href: string } => Boolean(link.href));
  return (
    <Section accent={accent}>
      <SectionHeading heading={block.heading} body={block.body} accent={accent} />
      <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
        {links.map((link, index) => (
          <li key={`${link.href}-${index}`}>
            <a
              href={link.href}
              target={link.href.startsWith('http') ? '_blank' : undefined}
              rel={link.href.startsWith('http') ? 'noopener noreferrer' : undefined}
              className="flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-surface-subtle"
            >
              <span
                className="grid size-10 shrink-0 place-items-center rounded-lg"
                style={{ background: tint(accent, 12), color: accent }}
              >
                <FileText size={18} aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-foreground">{link.label}</span>
                <span className="block truncate text-xs text-foreground-muted">{hostOf(link.href)}</span>
              </span>
              <Download size={18} aria-hidden className="shrink-0 text-foreground-muted" />
            </a>
          </li>
        ))}
      </ul>
    </Section>
  );
}

function RichText({ block, accent }: { block: MicrositeBlock; accent: string }) {
  return (
    <Section accent={accent}>
      <div className="max-w-3xl space-y-3">
        <span aria-hidden className="block h-1 w-10 rounded-full" style={{ background: accent }} />
        {block.heading.trim() ? (
          <h2 className="text-2xl font-semibold tracking-tight text-foreground @3xl:text-3xl">{block.heading}</h2>
        ) : null}
        <Paragraphs text={block.body} className="text-base leading-7 text-foreground-secondary" />
      </div>
    </Section>
  );
}

function EmptyBlock({ block }: { block: MicrositeBlock }) {
  return (
    <div className="mx-auto max-w-5xl px-5 py-4 @3xl:px-8">
      <div className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-foreground-muted">
        Empty {BLOCK_LABELS[block.type].toLowerCase()} block — add content in the Content tab.
      </div>
    </div>
  );
}

/** Whether the block has the specific content its layout needs. */
function renderable(block: MicrositeBlock): boolean {
  switch (block.type) {
    case 'METRICS':
      return block.metrics.length > 0;
    case 'FUND_UTILISATION':
      return block.allocations.length > 0;
    case 'GALLERY':
      return block.assetRefs.length > 0;
    case 'QUOTE':
      return Boolean(block.body.trim());
    case 'DOWNLOADS':
      return block.links.some((link) => safeHref(link.url));
    case 'HERO':
      return true;
    default:
      return blockHasContent(block);
  }
}

export function MicrositeRenderer({ site, showEmptyBlocks = false }: MicrositeRendererProps) {
  const accent = accentOf(site);
  const hasHero = site.blocks.some((block) => block.type === 'HERO');
  // Stories alternate image sides, counted among stories only.
  const storyIds = site.blocks.filter((block) => block.type === 'STORY').map((block) => block.id);

  return (
    <article className="@container bg-surface text-foreground">
      {hasHero ? null : <Hero block={null} site={site} accent={accent} />}
      {site.blocks.map((block) => {
        if (!renderable(block)) return showEmptyBlocks ? <EmptyBlock key={block.id} block={block} /> : null;
        switch (block.type) {
          case 'HERO':
            return <Hero key={block.id} block={block} site={site} accent={accent} />;
          case 'RICH_TEXT':
            return <RichText key={block.id} block={block} accent={accent} />;
          case 'METRICS':
            return <Metrics key={block.id} block={block} accent={accent} />;
          case 'FUND_UTILISATION':
            return <FundUtilisation key={block.id} block={block} accent={accent} />;
          case 'STORY':
            return <Story key={block.id} block={block} accent={accent} flip={storyIds.indexOf(block.id) % 2 === 1} />;
          case 'QUOTE':
            return <PullQuote key={block.id} block={block} accent={accent} />;
          case 'GALLERY':
            return <Gallery key={block.id} block={block} accent={accent} />;
          case 'CALL_TO_ACTION':
            return <CallToAction key={block.id} block={block} accent={accent} />;
          case 'DOWNLOADS':
            return <Downloads key={block.id} block={block} accent={accent} />;
          default:
            return null;
        }
      })}
    </article>
  );
}
