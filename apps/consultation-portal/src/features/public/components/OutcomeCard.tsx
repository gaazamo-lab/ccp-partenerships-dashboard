import { Card } from '@rfdtech/components';
import { MessagesSquare } from 'lucide-react';

import type { Consultation } from '@partner-crm/types';
import { formatCount, formatDate } from '@partner-crm/ui';

/** Closed consultation: the published "what we heard" summary, or when to expect it. */
export function OutcomeCard({ consultation }: { consultation: Consultation }) {
  return (
    <Card bordered>
      <div className="flex items-center gap-2 text-primary">
        <MessagesSquare size={20} aria-hidden />
        <h2 className="text-xl font-semibold text-foreground">What we heard</h2>
      </div>
      <p className="mt-1 text-sm text-foreground-muted">
        Closed {formatDate(consultation.closesAt)} · {formatCount(consultation.responseCount)} responses
      </p>
      {consultation.outcomeSummary ? (
        <div className="mt-5 space-y-4 leading-7">
          {consultation.outcomeSummary.split(/\n{2,}/).map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      ) : (
        <p className="mt-5 leading-7 text-foreground-muted">
          Thank you to everyone who took part. CLET is analysing the responses and will publish a summary of what we heard,
          and what will happen next, on this page.
        </p>
      )}
    </Card>
  );
}
