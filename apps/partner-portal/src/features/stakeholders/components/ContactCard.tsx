import { Badge, Button, Card } from '@rfdtech/components';
import { Mail, Pencil, Phone, ShieldCheck } from 'lucide-react';

import { formatDate, formatDateTime, initials } from '@/features/shared';
import { ConsentBadge, ScreeningBadge } from '@/features/stakeholders/components/StatusBadges';
import { OPEN_SCREENING } from '@/features/stakeholders/constants';
import type { StakeholderContact } from '@/features/stakeholders/types';

interface ContactCardProps {
  contact: StakeholderContact;
  /** Undefined when the role may act; otherwise the reason it cannot. */
  contactsBlockedReason?: string;
  screeningBlockedReason?: string;
  onEdit: () => void;
  onConsent: (action: 'record' | 'withdraw') => void;
  onToggleActive: () => void;
  onScreen: () => void;
}

export function ContactCard({
  contact,
  contactsBlockedReason,
  screeningBlockedReason,
  onEdit,
  onConsent,
  onToggleActive,
  onScreen,
}: ContactCardProps) {
  const record = contact.screeningRecord;
  const awaitingDecision = OPEN_SCREENING.includes(contact.screening);
  const canContacts = !contactsBlockedReason;

  return (
    <Card bordered className={contact.active ? undefined : 'opacity-70'}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-primary/10 font-bold text-primary">
            {initials(contact.name)}
          </span>
          <div className="min-w-0">
            <h3 className="truncate font-semibold text-foreground">{contact.name}</h3>
            <p className="truncate text-sm text-foreground-muted">{contact.role || 'No role set'}</p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
          {!contact.active ? <Badge variant="default">Inactive</Badge> : null}
          <ScreeningBadge status={contact.screening} />
        </div>
      </div>

      <div className="mt-5 space-y-2 text-sm text-foreground-muted">
        <a href={`mailto:${contact.email}`} className="flex items-center gap-2 hover:text-primary">
          <Mail size={15} aria-hidden /> {contact.email}
        </a>
        {contact.phone ? (
          <a href={`tel:${contact.phone}`} className="flex items-center gap-2 hover:text-primary">
            <Phone size={15} aria-hidden /> {contact.phone}
          </a>
        ) : null}
      </div>

      {record ? (
        <div className="mt-4 rounded-xl bg-surface-subtle p-3 text-sm">
          <p className="flex items-center gap-2 font-semibold text-foreground">
            <ShieldCheck size={15} aria-hidden /> S203 {record.outcome.toLowerCase()}
            {record.caseRef ? (
              <span className="font-mono text-xs text-foreground-muted">{record.caseRef}</span>
            ) : null}
          </p>
          <p className="mt-1 text-xs text-foreground-muted">
            {record.reviewer} · {formatDateTime(record.reviewedAt)}
          </p>
          {record.notes ? <p className="mt-2 text-foreground-muted">{record.notes}</p> : null}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border-subtle pt-4">
        <ConsentBadge consent={contact.consent} />
        {contact.consentDate ? (
          <span className="text-xs text-foreground-muted">
            {formatDate(contact.consentDate)}
            {contact.consentChannel ? ` · ${contact.consentChannel}` : ''}
          </span>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {awaitingDecision && contact.active ? (
          <Button
            size="sm"
            onClick={onScreen}
            disabled={Boolean(screeningBlockedReason)}
            title={screeningBlockedReason}
          >
            Record S203 decision
          </Button>
        ) : null}
        <Button
          variant="ghost"
          size="sm"
          onClick={onEdit}
          disabled={!canContacts}
          title={contactsBlockedReason}
        >
          <Pencil size={14} aria-hidden /> Edit
        </Button>
        {contact.consent === 'Consented' ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onConsent('withdraw')}
            disabled={!canContacts}
            title={contactsBlockedReason}
          >
            Withdraw consent
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onConsent('record')}
            disabled={!canContacts || !contact.active}
            title={contactsBlockedReason ?? (contact.active ? undefined : 'Reactivate first.')}
          >
            Record consent
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleActive}
          disabled={!canContacts}
          title={contactsBlockedReason}
        >
          {contact.active ? 'Deactivate' : 'Reactivate'}
        </Button>
      </div>
    </Card>
  );
}
