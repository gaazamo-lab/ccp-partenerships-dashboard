import { useState } from 'react';

import { Button } from '@rfdtech/components';
import { ExternalLink, FilePlus2, FileText } from 'lucide-react';

import type { KolContent } from '@partner-crm/types';

import { ContentFormModal } from '@/features/kol/components/ContentFormModal';
import { ContentStageBadge } from '@/features/kol/components/KolBadges';
import { ContentDialogs } from '@/features/kol/components/KolDialogs';
import { ContentStepper } from '@/features/kol/components/ContentStepper';
import { CONTENT_TYPE_LABELS, contentActionLabel } from '@/features/kol/domain';
import {
  type ContentDialog,
  contentMenuItems,
  primaryContentAction,
} from '@/features/kol/kolActions';
import { MANAGE_DENIED_REASON } from '@/features/kol/permissions';
import {
  ActionMenu,
  DetailGrid,
  DetailItem,
  EmptyState,
  SectionCard,
  formatDate,
} from '@/features/shared';

interface ContentTabProps {
  kolId: string;
  content: KolContent[];
  canManage: boolean;
}

export function ContentTab({ kolId, content, canManage }: ContentTabProps) {
  const [commissionOpen, setCommissionOpen] = useState(false);
  const [dialog, setDialog] = useState<ContentDialog>(null);

  const commissionButton = (
    <Button
      size="sm"
      disabled={!canManage}
      title={canManage ? undefined : MANAGE_DENIED_REASON}
      onClick={() => setCommissionOpen(true)}
    >
      <FilePlus2 size={15} aria-hidden /> Commission content
    </Button>
  );

  return (
    <SectionCard
      title="Content collaborations"
      // description="Draft submission (S003) → CLET review → publication on S076."
      actions={commissionButton}
    >
      {content.length === 0 ? (
        <EmptyState
          message="No content collaborations yet"
          hint="Commission an op-ed, article, blog post, video or podcast episode."
          icon={<FileText size={22} aria-hidden />}
          action={commissionButton}
        />
      ) : (
        <div className="divide-y divide-border-subtle">
          {content.map((item) => {
            const primary = primaryContentAction(item);
            return (
              <article key={item.id} className="space-y-4 py-5 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-foreground">{item.title}</p>
                      <ContentStageBadge stage={item.stage} />
                    </div>
                    <p className="mt-1 text-xs text-foreground-muted">
                      {CONTENT_TYPE_LABELS[item.contentType]} · Due {formatDate(item.dueDate)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {primary ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!canManage}
                        title={canManage ? undefined : MANAGE_DENIED_REASON}
                        onClick={() => setDialog({ content: item, target: primary })}
                      >
                        {contentActionLabel(item.stage, primary)}
                      </Button>
                    ) : null}
                    <ActionMenu
                      label={`Actions for ${item.title}`}
                      items={contentMenuItems(item, canManage, setDialog)}
                    />
                  </div>
                </div>

                <ContentStepper stage={item.stage} />

                <DetailGrid columns={3}>
                  <DetailItem
                    label="S003 draft"
                    value={<span className="font-mono text-xs">{item.draftRef ?? 'Not submitted'}</span>}
                  />
                  <DetailItem label="Reviewer" value={item.reviewer ?? 'Not assigned'} />
                  <DetailItem
                    label="S076 publication"
                    value={
                      item.publishedUrl ? (
                        <a
                          href={item.publishedUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-primary hover:underline"
                        >
                          {item.cmsRef ?? 'View'} <ExternalLink size={12} aria-hidden />
                        </a>
                      ) : (
                        'Not published'
                      )
                    }
                    hint={item.publishedAt ? `Published ${formatDate(item.publishedAt)}` : undefined}
                  />
                </DetailGrid>

                {item.reviewNotes ? (
                  <p className="rounded-lg bg-surface-subtle px-3 py-2 text-sm text-foreground">
                    <span className="font-medium">Review notes: </span>
                    {item.reviewNotes}
                  </p>
                ) : null}
              </article>
            );
          })}
        </div>
      )}

      {commissionOpen ? (
        <ContentFormModal kolId={kolId} open onOpenChange={setCommissionOpen} />
      ) : null}
      <ContentDialogs dialog={dialog} onClose={() => setDialog(null)} />
    </SectionCard>
  );
}
