import { useEffect, useState } from 'react';
import { Link } from 'react-router';

import { Badge, Input } from '@rfdtech/components';
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  LockKeyhole,
  Megaphone,
  MessageSquareText,
  Search,
  ShieldCheck,
  Users,
} from 'lucide-react';

import { formatCount, formatDate } from '@partner-crm/ui';

import { consultationRoute } from '@/constants/routes';
import { useConsultations } from '@/features/consultations/state/ConsultationsContext';

const chip = (active: boolean) =>
  `rounded-full px-4 py-2 text-sm font-medium transition-all ${
    active
      ? 'bg-primary text-primary-foreground shadow-sm'
      : 'bg-surface text-foreground-muted ring-1 ring-border hover:text-primary hover:ring-primary'
  }`;

const steps = [
  { icon: Search, title: 'Find a consultation', text: 'Browse the topics that are open and read why each one matters.' },
  { icon: MessageSquareText, title: 'Share your view', text: 'Answer at your own pace. No account is needed for public consultations.' },
  { icon: Megaphone, title: 'See what we heard', text: 'Results are published with the actions CLET takes in response.' },
];

export function Component() {
  const { publicConsultations, publicLoading, publicError, loadPublic } = useConsultations();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');

  useEffect(() => {
    void loadPublic();
  }, [loadPublic]);

  const categories = [...new Set(publicConsultations.map((item) => item.category))].sort();
  const term = search.trim().toLowerCase();
  const matches = publicConsultations.filter(
    (item) =>
      (!category || item.category === category) &&
      (!term || `${item.title} ${item.summary} ${item.category}`.toLowerCase().includes(term)),
  );
  const active = matches.filter((item) => item.status === 'OPEN');
  const upcoming = matches.filter((item) => item.status === 'SCHEDULED');
  const closed = matches.filter((item) => item.status === 'CLOSED');
  const openCount = publicConsultations.filter((item) => item.status === 'OPEN').length;
  const totalResponses = publicConsultations.reduce((sum, item) => sum + (item.responseCount ?? 0), 0);

  return (
    <main>
      <section className="relative isolate overflow-hidden bg-primary text-primary-foreground">
        <img src="/login-hero.avif" alt="" aria-hidden className="absolute inset-0 -z-20 size-full object-cover" />
        <div className="absolute inset-0 -z-10 bg-linear-to-br from-primary via-primary/90 to-primary/60" aria-hidden />
        <div className="mx-auto grid max-w-6xl gap-10 px-5 pb-32 pt-16 lg:grid-cols-[1.35fr_0.65fr] lg:items-center lg:pt-24">
          <div>
            <h1 className="max-w-3xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Take part in CLET public consultations
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-primary-foreground/90">
              Share your experience on legal education, professional standards and services. Your answers shape the decisions we make, and you can respond without creating an account.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <a
                href="#open-consultations"
                className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-primary shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
              >
                View open consultations <ArrowRight size={16} aria-hidden />
              </a>
              <span className="flex items-center gap-2 text-sm text-primary-foreground/85">
                <ShieldCheck size={18} aria-hidden /> Protected under Act 843
              </span>
            </div>
          </div>

          <div className="rounded-3xl bg-white/12 p-7 ring-1 ring-white/25 backdrop-blur-md">
            <p className="text-6xl font-bold tabular-nums">{openCount}</p>
            <p className="mt-2 text-lg font-medium">consultation{openCount === 1 ? '' : 's'} open now</p>
            <div className="my-5 h-px bg-white/25" />
            <div className="flex items-center gap-3">
              <Users size={20} aria-hidden />
              <p className="text-sm text-primary-foreground/90">
                <span className="font-semibold">{formatCount(totalResponses)}</span> responses received so far
              </p>
            </div>
            <p className="mt-3 text-sm text-primary-foreground/80">
              Each consultation explains how your response will be used before you begin.
            </p>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-5">
        <section aria-label="Find a consultation" className="relative z-10 -mt-20 rounded-2xl bg-surface p-5 shadow-xl ring-1 ring-border sm:p-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground-muted" size={19} aria-hidden />
            <Input
              aria-label="Search consultations"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by topic, title or keyword"
              className="h-12 text-base" style={{ paddingLeft: '3rem' }}
            />
          </div>
          {categories.length > 1 ? (
            <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Filter by category">
              <button type="button" className={chip(!category)} aria-pressed={!category} onClick={() => setCategory('')}>
                All topics
              </button>
              {categories.map((item) => (
                <button key={item} type="button" className={chip(category === item)} aria-pressed={category === item} onClick={() => setCategory(item)}>
                  {item}
                </button>
              ))}
            </div>
          ) : null}
          {publicError ? <p className="mt-3 text-sm text-error">Consultations could not be loaded: {publicError}</p> : null}
        </section>

        <div className="space-y-20 py-16">
          <section id="open-consultations" aria-labelledby="open-heading" className="scroll-mt-8">
            <div className="mb-8 flex items-end justify-between gap-4">
              <div>
                <h2 id="open-heading" className="text-3xl font-bold tracking-tight">Current consultations</h2>
                <p className="mt-2 text-foreground-muted">Pick a topic and tell us what you think.</p>
              </div>
            </div>
            {publicLoading ? <p className="text-foreground-muted">Loading consultations…</p> : null}
            {!publicLoading && !active.length ? (
              <div className="rounded-2xl border border-dashed border-border bg-surface-subtle p-10 text-center text-foreground-muted">
                {term || category
                  ? 'No open consultations match your search. Try another topic or clear the search.'
                  : 'No consultations are open right now. Check back soon, or read what we heard from recent consultations below.'}
              </div>
            ) : null}
            <div className={`grid gap-6 ${active.length > 1 ? 'lg:grid-cols-2' : ''}`}>
              {active.map((item) => (
                <article
                  key={item.id}
                  className="group relative flex flex-col overflow-hidden rounded-2xl bg-surface p-7 shadow-sm ring-1 ring-border transition duration-200 hover:-translate-y-1 hover:shadow-xl hover:ring-primary"
                >
                  <div className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-primary to-primary/30" aria-hidden />
                  <div className="flex items-start justify-between gap-4">
                    <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                      <FileText size={22} aria-hidden />
                    </span>
                    <div className="flex flex-wrap justify-end gap-2">
                      <Badge variant="success">Open</Badge>
                      <Badge variant="outline">{item.category}</Badge>
                    </div>
                  </div>
                  <h3 className="mt-5 text-xl font-semibold leading-snug">{item.title}</h3>
                  <p className="mt-3 flex-1 leading-7 text-foreground-muted">{item.summary}</p>
                  <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-foreground-muted">
                    <span className="flex items-center gap-2"><Clock3 size={16} aria-hidden />{item.estimatedMinutes} minutes</span>
                    <span className="flex items-center gap-2"><CalendarDays size={16} aria-hidden />Closes {formatDate(item.closesAt)}</span>
                  </div>
                  <Link
                    to={consultationRoute(item.slug)}
                    className="mt-7 inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition group-hover:gap-3 hover:opacity-90"
                  >
                    Take part <ArrowRight size={16} aria-hidden />
                  </Link>
                </article>
              ))}
            </div>
          </section>

          {upcoming.length ? (
            <section aria-labelledby="upcoming-heading">
              <h2 id="upcoming-heading" className="mb-6 text-2xl font-bold tracking-tight">Coming soon</h2>
              <div className={`grid gap-5 ${upcoming.length > 1 ? 'sm:grid-cols-2' : ''}`}>
                {upcoming.map((item) => (
                  <article key={item.id} className="rounded-2xl bg-surface-subtle p-6 ring-1 ring-border">
                    <Badge variant="primary">Opens {formatDate(item.opensAt)}</Badge>
                    <h3 className="mt-4 text-lg font-semibold">{item.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-foreground-muted">{item.summary}</p>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          <section aria-labelledby="how-heading">
            <h2 id="how-heading" className="text-center text-3xl font-bold tracking-tight">How it works</h2>
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {steps.map(({ icon: Icon, title, text }, index) => (
                <div key={title} className="rounded-2xl bg-surface p-7 text-center shadow-sm ring-1 ring-border">
                  <span className="mx-auto grid size-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-md">
                    <Icon size={24} aria-hidden />
                  </span>
                  <p className="mt-5 text-sm font-semibold text-foreground-muted">Step {index + 1}</p>
                  <h3 className="mt-1 text-lg font-semibold">{title}</h3>
                  <p className="mt-2 leading-7 text-foreground-muted">{text}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="grid gap-8 overflow-hidden rounded-3xl bg-primary p-8 text-primary-foreground shadow-lg md:grid-cols-2 md:items-center md:p-12">
            <div>
              <span className="grid size-12 place-items-center rounded-xl bg-white/15"><LockKeyhole size={22} aria-hidden /></span>
              <h2 className="mt-5 text-3xl font-bold tracking-tight">You control whether your identity is linked</h2>
              <p className="mt-4 leading-7 text-primary-foreground/85">
                Where anonymous responses are allowed, contact details are stored only when you explicitly consent. Survey exports never include identity fields.
              </p>
            </div>
            <ul className="space-y-4">
              {[
                'No registration for public consultations',
                'Required questions are clearly marked',
                'Purpose and closing date shown upfront',
                'Results published as “what we heard”',
              ].map((text) => (
                <li key={text} className="flex items-center gap-3 rounded-xl bg-white/10 px-4 py-3 ring-1 ring-white/15">
                  <CheckCircle2 className="shrink-0" size={20} aria-hidden />
                  {text}
                </li>
              ))}
            </ul>
          </section>

          {closed.length ? (
            <section aria-labelledby="closed-heading">
              <h2 id="closed-heading" className="mb-2 text-2xl font-bold tracking-tight">What we heard</h2>
              <p className="mb-6 text-foreground-muted">Recently closed consultations and their outcomes.</p>
              <div className={`grid gap-4 ${closed.length > 1 ? 'md:grid-cols-2' : ''}`}>
                {closed.map((item) => (
                  <Link
                    key={item.id}
                    to={consultationRoute(item.slug)}
                    className="group flex items-center justify-between gap-4 rounded-2xl bg-surface p-5 shadow-sm ring-1 ring-border transition hover:-translate-y-0.5 hover:shadow-md hover:ring-primary"
                  >
                    <span>
                      <span className="block font-semibold group-hover:text-primary">{item.title}</span>
                      <span className="mt-1 block text-sm text-foreground-muted">
                        {formatCount(item.responseCount)} responses · {item.outcomeSummary ? 'Outcome published' : 'Outcome coming soon'}
                      </span>
                    </span>
                    <ArrowRight className="shrink-0 transition group-hover:translate-x-1" size={18} aria-hidden />
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </main>
  );
}
