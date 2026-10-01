import { useState } from 'react';

import { Button, Notice, useToast } from '@rfdtech/components';
import { CheckCircle2, History, MessageSquareWarning, Send } from 'lucide-react';

import type { Microsite, MicrositeReview, MicrositeReviewInput } from '@partner-crm/types';
import { EmptyState, SectionCard, TextareaField, formatDateTime } from '@partner-crm/ui';

import { ReviewDecisionBadge } from '@/features/microsites/components/MicrositeBadges';
import { reviewBlockers, submitterOf } from '@/features/microsites/domain';
import { PERMISSION_REASONS } from '@/features/microsites/permissions';
import { useMicrosites } from '@/features/microsites/state/useMicrosites';

interface ReviewTabProps {
  site: Microsite;
  history: MicrositeReview[];
  canSubmit: boolean;
  canReview: boolean;
  /** Unsaved edits must be saved before submitting. */
  dirty: boolean;
}

const SUCCESS: Record<MicrositeReviewInput['decision'], { title: string; description: string }> = {
  SUBMITTED: {
    title: 'Submitted for review',
    description: 'RMF/CCP reviewers can now approve it or request changes.',
  },
  APPROVED: { title: 'Version approved', description: 'It can now be published.' },
  CHANGES_REQUESTED: {
    title: 'Changes requested',
    description: 'The owner has been sent your comments.',
  },
};

export function ReviewTab({ site, history, canSubmit, canReview, dirty }: ReviewTabProps) {
  const { review, actor } = useMicrosites();
  const { toast } = useToast();
  const [comment, setComment] = useState('');
  const [commentError, setCommentError] = useState<string | null>(null);
  const [busy, setBusy] = useState<MicrositeReviewInput['decision'] | null>(null);

  const submitter = submitterOf(site, history);
  const decide = async (decision: MicrositeReviewInput['decision']) => {
    const input = { decision, comment: comment.trim() };
    const blockers = reviewBlockers(site, input, actor, history);
    if (blockers.length > 0) {
      setCommentError(blockers[0] ?? null);
      return;
    }
    setBusy(decision);
    try {
      await review(site.id, input);
      setComment('');
      setCommentError(null);
      toast({ ...SUCCESS[decision], variant: 'success' });
    } catch {
      // The provider has already toasted the server's reason.
    } finally {
      setBusy(null);
    }
  };

  const approveBlocked = reviewBlockers(
    site,
    { decision: 'APPROVED', comment: '' },
    actor,
    history,
  )[0];

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <SectionCard
        title="Review and approval" /* description="Brief → build → RMF/CCP review → approve → publish." */
      >
        {site.status === 'DRAFT' ? (
          <div className="space-y-4">
            <p className="text-sm text-foreground-muted">
              Submit version {site.version} when the content is complete. Someone other than you
              must approve it.
            </p>
            {dirty ? (
              <Notice variant="warning" title="Save first" leftBorder>
                You have unsaved content changes. Save them so reviewers see the latest version.
              </Notice>
            ) : null}
            <TextareaField
              label="Note for reviewers (optional)"
              rows={3}
              value={comment}
              onChange={setComment}
              disabled={!canSubmit}
            />
            <div className="flex justify-end">
              <Button
                disabled={!canSubmit || dirty || busy !== null}
                loading={busy === 'SUBMITTED'}
                title={canSubmit ? undefined : PERMISSION_REASONS.submit}
                onClick={() => void decide('SUBMITTED')}
              >
                <Send size={16} aria-hidden /> Submit for review
              </Button>
            </div>
          </div>
        ) : site.status === 'IN_REVIEW' ? (
          <div className="space-y-4">
            <p className="text-sm text-foreground-muted">
              Version {site.version} was submitted by {submitter ?? 'a colleague'}. Check the
              Preview tab, then decide.
            </p>
            {!canReview ? (
              <Notice variant="warning" title="Review decisions are restricted" leftBorder>
                {PERMISSION_REASONS.review}
              </Notice>
            ) : approveBlocked ? (
              <Notice variant="warning" title="Four-eyes rule" leftBorder>
                {approveBlocked}
              </Notice>
            ) : null}
            <TextareaField
              label="Comment"
              rows={4}
              value={comment}
              onChange={(value) => {
                setComment(value);
                setCommentError(null);
              }}
              // description="Required when requesting changes."
              error={commentError ?? undefined}
              disabled={!canReview}
            />
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                variant="outline"
                disabled={!canReview || busy !== null}
                loading={busy === 'CHANGES_REQUESTED'}
                onClick={() => void decide('CHANGES_REQUESTED')}
              >
                <MessageSquareWarning size={16} aria-hidden /> Request changes
              </Button>
              <Button
                disabled={!canReview || Boolean(approveBlocked) || busy !== null}
                loading={busy === 'APPROVED'}
                onClick={() => void decide('APPROVED')}
              >
                <CheckCircle2 size={16} aria-hidden /> Approve version {site.version}
              </Button>
            </div>
          </div>
        ) : site.status === 'CHANGES_REQUESTED' ? (
          <Notice variant="error" title="Changes were requested" leftBorder>
            {history.find((entry) => entry.decision === 'CHANGES_REQUESTED')?.comment ||
              'See the review history.'}{' '}
            Edit and save the content to start a new draft, then submit it again.
          </Notice>
        ) : (
          <p className="text-sm text-foreground-muted">
            {site.status === 'ARCHIVED'
              ? 'This microsite is archived; no further review is possible.'
              : `Version ${site.version} is approved. Editing the content will return it to draft for a new review.`}
          </p>
        )}
      </SectionCard>

      <SectionCard
        title="Review history" /* description="Every submission and decision, newest first." */
      >
        {history.length === 0 ? (
          <EmptyState
            message="No review activity yet"
            hint="Submissions and decisions will be listed here."
            icon={<History size={22} aria-hidden />}
          />
        ) : (
          <ol className="space-y-4">
            {history.map((entry) => (
              <li key={entry.id} className="border-l-2 border-border pl-4">
                <div className="flex flex-wrap items-center gap-2">
                  <ReviewDecisionBadge decision={entry.decision} />
                  <span className="text-xs text-foreground-muted">
                    v{entry.version} · {entry.actor} · {formatDateTime(entry.occurredAt)}
                  </span>
                </div>
                {entry.comment ? (
                  <p className="mt-1.5 text-sm leading-6 text-foreground">{entry.comment}</p>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </SectionCard>
    </div>
  );
}
