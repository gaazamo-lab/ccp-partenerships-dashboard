import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';

import {
  Badge,
  Button,
  Card,
  Dropdown,
  Notice,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Timeline,
  TimelineData,
  TimelineFooter,
  TimelineItem,
  TimelineTitle,
  useToast,
} from '@rfdtech/components';
import {
  ArrowRight,
  Building2,
  ChevronRight,
  ExternalLink,
  Globe2,
  IdCard,
  MapPin,
  Pencil,
  Plus,
  Power,
  SearchX,
  UserRound,
} from 'lucide-react';

import { useAuth } from '@partner-crm/auth';

import { ROUTES, partnershipRoute } from '@/constants/routes';
import { ScreeningDecisionModal } from '@/features/compliance/components/ScreeningDecisionModal';
import { PartnershipStatusBadge } from '@/features/partnerships/components/PartnershipStatusBadge';
import { usePartnerships } from '@/features/partnerships/state/usePartnerships';
import {
  ActionMenu,
  EmptyState,
  PageHeader,
  SectionCard,
  initials,
  useNow,
} from '@/features/shared';
import { type ConsentAction, ConsentModal } from '@/features/stakeholders/components/ConsentModal';
import { ContactCard } from '@/features/stakeholders/components/ContactCard';
import { ContactFormModal } from '@/features/stakeholders/components/ContactFormModal';
import { EngagementFormModal } from '@/features/stakeholders/components/EngagementFormModal';
import { StakeholderFormModal } from '@/features/stakeholders/components/StakeholderFormModal';
import { HealthBadge } from '@/features/stakeholders/components/StatusBadges';
import { ENGAGEMENT_TYPES, PIPELINE_STAGES } from '@/features/stakeholders/constants';
import {
  displayDate,
  filterEngagements,
  sortEngagements,
} from '@/features/stakeholders/engagements';
import { permissionHint } from '@/features/stakeholders/permissions';
import { engagementBlockReason } from '@/features/stakeholders/screening';
import { useCrm } from '@/features/stakeholders/state/CrmContext';
import type {
  EngagementType,
  PipelineStage,
  StakeholderContact,
} from '@/features/stakeholders/types';

const timelineMode = {
  Call: 'muted',
  Campaign: 'primary',
  Correspondence: 'muted',
  Email: 'muted',
  Event: 'success',
  Meeting: 'muted',
  MOU: 'warning',
} as const satisfies Record<EngagementType, string>;

type ProfileTab = 'overview' | 'contacts' | 'timeline' | 'linked';

function stakeholderType(category: string) {
  return category === 'Professional body' ? 'Professional association' : category;
}

function relativeDate(date: string, now: number) {
  const elapsed = Math.max(0, Math.floor((now - new Date(date).getTime()) / 86_400_000));
  if (elapsed === 0) return 'today';
  if (elapsed === 1) return '1 day ago';
  return `${elapsed} days ago`;
}

export function Component() {
  const navigate = useNavigate();
  const { stakeholderId } = useParams();
  const { user } = useAuth();
  const { stakeholders, loading, setRelationshipStatus, setPipelineStage, setContactActive } =
    useCrm();
  const { agreements } = usePartnerships();
  const { toast } = useToast();
  const now = useNow();
  const [activeTab, setActiveTab] = useState<ProfileTab>('overview');
  const [editOpen, setEditOpen] = useState(false);
  const [contactModal, setContactModal] = useState<{ contact?: StakeholderContact } | null>(null);
  const [consentModal, setConsentModal] = useState<{
    contact: StakeholderContact;
    action: ConsentAction;
  } | null>(null);
  const [screeningContact, setScreeningContact] = useState<StakeholderContact | null>(null);
  const [engagementOpen, setEngagementOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState<EngagementType | ''>('');
  const [sourceFilter, setSourceFilter] = useState('');

  const stakeholder = stakeholders.find((item) => item.id === stakeholderId);

  const timeline = useMemo(
    () =>
      stakeholder
        ? sortEngagements(
            filterEngagements(stakeholder.engagements, { type: typeFilter, source: sourceFilter }),
          )
        : [],
    [stakeholder, typeFilter, sourceFilter],
  );
  const sources = useMemo(
    () => [...new Set(stakeholder?.engagements.map((item) => item.source) ?? [])].sort(),
    [stakeholder],
  );

  if (!stakeholder && loading) {
    return (
      <section className="flex flex-col gap-body">
        <PageHeader
          title="Loading stakeholder"
          backTo={{ to: ROUTES.STAKEHOLDERS, label: 'Back to stakeholders' }}
        />
        <Card bordered>
          <p className="text-sm text-foreground-muted">Reading the S081 register…</p>
        </Card>
      </section>
    );
  }

  // A stale link or a deleted record must say so. Falling back to the first
  // stakeholder shows someone else's record under the requested URL, which a
  // user has no way to notice.
  if (!stakeholder) {
    return (
      <section className="flex flex-col gap-body">
        <PageHeader
          title="Stakeholder not found"
          backTo={{ to: ROUTES.STAKEHOLDERS, label: 'Back to stakeholders' }}
        />
        <Card bordered>
          <EmptyState
            message="This stakeholder is no longer on the register"
            hint={`Nothing matches the reference ${stakeholderId ?? ''}. It may have been removed, or the link may be out of date.`}
            icon={<SearchX size={22} aria-hidden />}
            action={
              <Button onClick={() => void navigate(ROUTES.STAKEHOLDERS)}>
                Browse all stakeholders
              </Button>
            }
          />
        </Card>
      </section>
    );
  }

  const stakeholderAgreements = agreements.filter((agreement) =>
    agreement.partyStakeholderIds.includes(stakeholder.id),
  );

  const role = user?.role;
  const editHint = permissionHint(role, 'edit');
  const contactsHint = permissionHint(role, 'manage_contacts');
  const screenHint = permissionHint(role, 'screen');
  const blockReason = engagementBlockReason(stakeholder);
  const inactive = stakeholder.status === 'Inactive';
  const engageHint =
    permissionHint(role, 'engage') ??
    blockReason ??
    (inactive ? 'Reactivate this stakeholder before logging engagement.' : undefined);
  const activeContacts = stakeholder.contacts.filter((contact) => contact.active).length;
  const activeAgreements = stakeholderAgreements.filter(
    (agreement) => agreement.status === 'ACTIVE',
  );
  const featuredAgreement = activeAgreements[0] ?? stakeholderAgreements[0];
  const latestEngagements = sortEngagements(stakeholder.engagements).slice(0, 3);

  const toggleRelationship = () => {
    setRelationshipStatus(stakeholder.id, inactive ? 'Active' : 'Inactive');
    toast({
      title: inactive ? 'Stakeholder reactivated' : 'Stakeholder deactivated',
      description: inactive
        ? `${stakeholder.name} is back in the active register and eligible for segments.`
        : `${stakeholder.name} is kept for the record and excluded from every segment.`,
      variant: inactive ? 'success' : 'warning',
    });
  };

  const changeStage = (stage: PipelineStage) => {
    if (stage === stakeholder.pipelineStage) return;
    setPipelineStage(stakeholder.id, stage);
    toast({
      title: 'Pipeline stage updated',
      description: `${stakeholder.name} moved to ${stage}.`,
      variant: 'success',
    });
  };

  const toggleContact = (contact: StakeholderContact) => {
    setContactActive(contact.id, !contact.active);
    toast({
      title: contact.active ? 'Contact deactivated' : 'Contact reactivated',
      description: contact.active
        ? `${contact.name} is kept for the record but excluded from segments and screening holds.`
        : `${contact.name} is active again.`,
      variant: contact.active ? 'warning' : 'success',
    });
  };

  const addContactButton = (
    <Button
      onClick={() => setContactModal({})}
      disabled={Boolean(contactsHint)}
      title={contactsHint}
    >
      <Plus size={16} aria-hidden /> Add contact
    </Button>
  );

  const logEngagementButton = (variant: 'primary' | 'ghost', size?: 'sm') => (
    <Button
      variant={variant}
      size={size}
      onClick={() => setEngagementOpen(true)}
      disabled={Boolean(engageHint)}
      title={engageHint}
    >
      <Plus size={16} aria-hidden /> Log engagement
    </Button>
  );

  return (
    <section className="flex flex-col gap-body">
      <div className="space-y-6">
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-2 text-sm text-foreground-muted"
        >
          <Link to={ROUTES.STAKEHOLDERS} className="hover:text-primary hover:underline">
            Stakeholders
          </Link>
          <ChevronRight size={15} aria-hidden />
          <span className="font-medium text-foreground">{stakeholder.name}</span>
        </nav>

        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div className="min-w-0">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              {stakeholder.name}
            </h1>
            <p className="mt-1 text-base text-foreground-muted">
              {stakeholderType(stakeholder.category)} · {stakeholder.location}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              onClick={() => setEditOpen(true)}
              disabled={Boolean(editHint)}
              title={editHint}
            >
              <Pencil size={16} aria-hidden /> Edit
            </Button>
            {logEngagementButton('primary')}
            <ActionMenu
              items={[
                ...PIPELINE_STAGES.filter((stage) => stage !== stakeholder.pipelineStage).map(
                  (stage) => ({
                    id: `stage-${stage}`,
                    label: `Move to ${stage}`,
                    onSelect: () => changeStage(stage),
                    disabled: Boolean(editHint),
                    disabledReason: editHint,
                  }),
                ),
                {
                  id: 'status',
                  label: inactive ? 'Reactivate relationship' : 'Deactivate relationship',
                  icon: <Power size={15} aria-hidden />,
                  onSelect: toggleRelationship,
                  disabled: Boolean(editHint),
                  disabledReason: editHint,
                  destructive: !inactive,
                },
              ]}
            />
          </div>
        </div>

        <dl className="grid overflow-hidden rounded-2xl border border-border bg-surface shadow-sm sm:grid-cols-2 xl:grid-cols-5">
          <div className="border-b border-border-subtle px-6 py-5 sm:border-r xl:border-b-0">
            <dt className="text-sm text-foreground-muted">Relationship health</dt>
            <dd className="mt-2">
              <HealthBadge health={stakeholder.health} />
            </dd>
          </div>
          <div className="border-b border-border-subtle px-6 py-5 xl:border-b-0 xl:border-r">
            <dt className="text-sm text-foreground-muted">Pipeline stage</dt>
            <dd className="mt-2 font-semibold text-foreground">{stakeholder.pipelineStage}</dd>
          </div>
          <div className="border-b border-border-subtle px-6 py-5 sm:border-r xl:border-b-0">
            <dt className="text-sm text-foreground-muted">Relationship owner</dt>
            <dd className="mt-2 font-semibold text-foreground">{stakeholder.owner}</dd>
          </div>
          <div className="border-b border-border-subtle px-6 py-5 xl:border-b-0 xl:border-r">
            <dt className="text-sm text-foreground-muted">Last engagement</dt>
            <dd className="mt-2 font-semibold text-foreground">
              {displayDate(stakeholder.lastEngagement)}
              <span className="ml-2 text-sm font-normal text-foreground-muted">
                {relativeDate(stakeholder.lastEngagement, now)}
              </span>
            </dd>
          </div>
          <div className="px-6 py-5">
            <dt className="text-sm text-foreground-muted">Linked agreements</dt>
            <dd className="mt-2 font-semibold text-foreground">{activeAgreements.length} active</dd>
          </div>
        </dl>
      </div>

      {blockReason ? (
        <Notice variant="warning" title="Engagement blocked by S203" leftBorder>
          {blockReason}
        </Notice>
      ) : null}
      {inactive ? (
        <Notice variant="info" title="Inactive relationship" leftBorder>
          This record is retained for history and excluded from every audience segment.
        </Notice>
      ) : null}

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as ProfileTab)}
        variant="pill"
      >
        <TabsList className="rounded-xl bg-surface-subtle p-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="contacts">Contacts ({activeContacts})</TabsTrigger>
          <TabsTrigger value="timeline">
            Engagement timeline ({stakeholder.engagements.length})
          </TabsTrigger>
          <TabsTrigger value="linked">Linked records ({stakeholderAgreements.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="pt-6">
          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.85fr)_minmax(19rem,0.9fr)]">
            <div className="space-y-6">
              <SectionCard
                title="Organisation profile"
                className="rounded-2xl border border-border-subtle shadow-sm"
              >
                <p className="text-base leading-7 text-foreground">
                  {stakeholder.description || 'No relationship summary has been recorded yet.'}
                </p>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div className="flex min-h-20 items-center gap-4 rounded-xl border border-border px-5 py-4">
                    <MapPin className="shrink-0 text-foreground-muted" size={20} aria-hidden />
                    <div>
                      <p className="text-sm text-foreground-muted">Location</p>
                      <p className="mt-1 font-semibold text-foreground">{stakeholder.location}</p>
                    </div>
                  </div>
                  <div className="flex min-h-20 items-center gap-4 rounded-xl border border-border px-5 py-4">
                    <Globe2 className="shrink-0 text-foreground-muted" size={20} aria-hidden />
                    <div className="min-w-0">
                      <p className="text-sm text-foreground-muted">Website</p>
                      <p className="mt-1 truncate font-semibold">
                        {stakeholder.website ? (
                          <a
                            href={
                              stakeholder.website.startsWith('http')
                                ? stakeholder.website
                                : `https://${stakeholder.website}`
                            }
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary hover:underline"
                          >
                            {stakeholder.website}
                          </a>
                        ) : (
                          'Not set'
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex min-h-20 items-center gap-4 rounded-xl border border-border px-5 py-4">
                    <Building2 className="shrink-0 text-foreground-muted" size={20} aria-hidden />
                    <div>
                      <p className="text-sm text-foreground-muted">Stakeholder type</p>
                      <p className="mt-1 font-semibold text-foreground">
                        {stakeholderType(stakeholder.category)}
                      </p>
                    </div>
                  </div>
                  <div className="flex min-h-20 items-center gap-4 rounded-xl border border-border px-5 py-4">
                    <IdCard className="shrink-0 text-foreground-muted" size={20} aria-hidden />
                    <div>
                      <p className="text-sm text-foreground-muted">Record reference</p>
                      <p className="mt-1 font-semibold uppercase text-foreground">
                        {stakeholder.id}
                      </p>
                    </div>
                  </div>
                </div>
              </SectionCard>

              <SectionCard
                title="Latest engagements"
                description={`The three most recent of ${stakeholder.engagements.length} logged engagements`}
                actions={
                  <Button variant="ghost" size="sm" onClick={() => setActiveTab('timeline')}>
                    View timeline <ArrowRight size={16} aria-hidden />
                  </Button>
                }
                className="rounded-2xl border border-border-subtle shadow-sm"
              >
                {latestEngagements.length === 0 ? (
                  <EmptyState
                    message="No engagement activity recorded"
                    hint="Logged meetings, calls and events will appear here."
                  />
                ) : (
                  <ol className="ml-2 border-l border-success/70">
                    {latestEngagements.map((event) => (
                      <li key={event.id} className="relative pb-6 pl-7 last:pb-0">
                        <span className="absolute -left-2 top-0 grid size-4 place-items-center rounded-full border border-success bg-success-bg text-[10px] text-success">
                          ✓
                        </span>
                        <p className="font-semibold text-foreground">{event.title}</p>
                        <p className="mt-1 text-sm text-foreground-muted">
                          {displayDate(event.date)} · {event.type} · {event.source}
                        </p>
                        <p className="mt-1 text-sm leading-6 text-foreground-muted">
                          {event.summary}
                        </p>
                      </li>
                    ))}
                  </ol>
                )}
              </SectionCard>
            </div>

            <div className="space-y-6">
              <SectionCard
                title="Linked agreement"
                actions={
                  featuredAgreement ? (
                    <PartnershipStatusBadge status={featuredAgreement.status} />
                  ) : null
                }
                className="rounded-2xl border border-border-subtle shadow-sm"
              >
                {featuredAgreement ? (
                  <>
                    <p className="font-semibold text-foreground">{featuredAgreement.title}</p>
                    <p className="mt-2 text-sm text-foreground-muted">
                      {featuredAgreement.reference} · Held in MOU tracker
                    </p>
                    <Button
                      variant="outline"
                      className="mt-5"
                      onClick={() => void navigate(partnershipRoute(featuredAgreement.id))}
                    >
                      <ExternalLink size={16} aria-hidden /> Open agreement
                    </Button>
                  </>
                ) : (
                  <p className="text-sm text-foreground-muted">No agreement is linked yet.</p>
                )}
              </SectionCard>

              <SectionCard
                title="Contacts"
                className="rounded-2xl border border-border-subtle shadow-sm"
              >
                {stakeholder.contacts.length === 0 ? (
                  <p className="text-sm text-foreground-muted">No contacts have been added.</p>
                ) : (
                  <div className="space-y-5">
                    {stakeholder.contacts.slice(0, 3).map((contact) => (
                      <div key={contact.id} className="flex items-center gap-3">
                        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-primary font-medium text-primary-foreground">
                          {initials(contact.name)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-foreground">{contact.name}</p>
                          <p className="truncate text-sm text-foreground-muted">
                            {contact.role || 'No role set'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-5"
                  onClick={() => setActiveTab('contacts')}
                >
                  View all contacts <ArrowRight size={16} aria-hidden />
                </Button>
              </SectionCard>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="contacts" className="pt-6">
          {stakeholder.contacts.length === 0 ? (
            <Card bordered>
              <EmptyState
                message="No contacts yet"
                hint="Add the people CLET deals with at this organisation."
                icon={<UserRound size={22} aria-hidden />}
                action={addContactButton}
              />
            </Card>
          ) : (
            <>
              <div className="mb-4 flex justify-end">{addContactButton}</div>
              <div className="grid gap-4 lg:grid-cols-2">
                {[...stakeholder.contacts]
                  .sort((left, right) => Number(right.active) - Number(left.active))
                  .map((contact) => (
                    <ContactCard
                      key={contact.id}
                      contact={contact}
                      contactsBlockedReason={contactsHint}
                      screeningBlockedReason={screenHint}
                      onEdit={() => setContactModal({ contact })}
                      onConsent={(action) => setConsentModal({ contact, action })}
                      onToggleActive={() => toggleContact(contact)}
                      onScreen={() => setScreeningContact(contact)}
                    />
                  ))}
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="timeline" className="pt-6">
          <SectionCard
            title="Full engagement history"
            // description="Newest first, from S081 and connected systems."
            actions={logEngagementButton('ghost', 'sm')}
          >
            {stakeholder.engagements.length === 0 ? (
              <EmptyState
                message="No engagement activity recorded"
                hint="Meetings, calls, events and campaigns logged here build the relationship history."
                action={logEngagementButton('primary')}
              />
            ) : (
              <>
                <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:max-w-xl">
                  <Dropdown
                    aria-label="Filter by type"
                    value={typeFilter || null}
                    onValueChange={(value) => setTypeFilter((value ?? '') as EngagementType | '')}
                    options={ENGAGEMENT_TYPES.map((type) => ({ value: type, label: type }))}
                    placeholder="All types"
                    clearable
                  />
                  <Dropdown
                    aria-label="Filter by source"
                    value={sourceFilter || null}
                    onValueChange={(value) => setSourceFilter(value ?? '')}
                    options={sources.map((source) => ({ value: source, label: source }))}
                    placeholder="All sources"
                    clearable
                  />
                </div>
                {timeline.length === 0 ? (
                  <EmptyState
                    message="No engagements match these filters"
                    hint="Clear the type or source filter to see the full history."
                    action={
                      <Button
                        variant="outline"
                        onClick={() => {
                          setTypeFilter('');
                          setSourceFilter('');
                        }}
                      >
                        Clear filters
                      </Button>
                    }
                  />
                ) : (
                  <Timeline>
                    {timeline.map((event, index) => (
                      <TimelineItem
                        key={event.id}
                        mode={timelineMode[event.type]}
                        isLast={index === timeline.length - 1}
                      >
                        <TimelineTitle>
                          {event.title}{' '}
                          <Badge variant="outline" className="ml-1 align-middle">
                            {event.type}
                          </Badge>
                        </TimelineTitle>
                        <TimelineData>{event.summary}</TimelineData>
                        <TimelineFooter>
                          {displayDate(event.date)} · {event.source}
                        </TimelineFooter>
                      </TimelineItem>
                    ))}
                  </Timeline>
                )}
              </>
            )}
          </SectionCard>
        </TabsContent>

        <TabsContent value="linked" className="pt-6">
          {stakeholderAgreements.length === 0 ? (
            <Card bordered>
              <EmptyState
                message="No linked agreements"
                hint="Create an MOU or partnership from the S082 module when this relationship advances."
                icon={<ExternalLink size={22} aria-hidden />}
                action={
                  <Button
                    onClick={() =>
                      void navigate(`${ROUTES.PARTNERSHIP_CREATE}?stakeholderId=${stakeholder.id}`)
                    }
                  >
                    <Plus size={16} aria-hidden /> Create partnership
                  </Button>
                }
              />
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              {stakeholderAgreements.map((agreement) => (
                <Card key={agreement.id} bordered>
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="primary">S082</Badge>
                    <PartnershipStatusBadge status={agreement.status} />
                  </div>
                  <h3 className="mt-4 font-semibold text-foreground">{agreement.title}</h3>
                  <p className="mt-1 font-mono text-xs text-foreground-muted">
                    {agreement.reference}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-4"
                    onClick={() => void navigate(partnershipRoute(agreement.id))}
                  >
                    Open agreement <ExternalLink size={14} aria-hidden />
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {editOpen ? (
        <StakeholderFormModal open onOpenChange={setEditOpen} stakeholder={stakeholder} />
      ) : null}
      {contactModal ? (
        <ContactFormModal
          open
          onOpenChange={(open) => {
            if (!open) setContactModal(null);
          }}
          stakeholder={stakeholder}
          contact={contactModal.contact}
        />
      ) : null}
      {consentModal ? (
        <ConsentModal
          open
          onOpenChange={(open) => {
            if (!open) setConsentModal(null);
          }}
          contact={consentModal.contact}
          action={consentModal.action}
        />
      ) : null}
      {screeningContact ? (
        <ScreeningDecisionModal
          open
          onOpenChange={(open) => {
            if (!open) setScreeningContact(null);
          }}
          contact={screeningContact}
          stakeholder={stakeholder}
        />
      ) : null}
      {engagementOpen ? (
        <EngagementFormModal open onOpenChange={setEngagementOpen} stakeholderId={stakeholder.id} />
      ) : null}
    </section>
  );
}
