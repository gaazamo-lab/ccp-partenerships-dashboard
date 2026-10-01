import { useMemo, useState } from 'react';

import { Button, type TableColumn } from '@rfdtech/components';
import { ExternalLink, Newspaper, Plus } from 'lucide-react';

import type { KolContent, KolMediaMention } from '@partner-crm/types';

import { MentionFormModal } from '@/features/kol/components/MentionFormModal';
import { MentionSourceBadge, SentimentBadge } from '@/features/kol/components/KolBadges';
import { REACH_WINDOW_DAYS, mentionsWithin, totalReach } from '@/features/kol/domain';
import { MANAGE_DENIED_REASON } from '@/features/kol/permissions';
import {
  DataTable,
  type Kpi,
  KpiGrid,
  SectionCard,
  formatCount,
  formatDate,
  rate,
  useNow,
} from '@/features/shared';

interface MediaTabProps {
  kolId: string;
  mentions: KolMediaMention[];
  content: KolContent[];
  canManage: boolean;
}

export function MediaTab({ kolId, mentions, content, canManage }: MediaTabProps) {
  const [addOpen, setAddOpen] = useState(false);
  const now = useNow();
  const contentTitle = useMemo(() => {
    const byId = new Map(content.map((item) => [item.id, item.title]));
    return (id: string | null) => (id ? (byId.get(id) ?? null) : null);
  }, [content]);

  const kpis = useMemo<Kpi[]>(() => {
    const positive = mentions.filter((item) => item.sentiment === 'POSITIVE').length;
    return [
      { id: 'reach', label: 'Total reach', value: formatCount(totalReach(mentions)) },
      {
        id: 'recent',
        label: `${REACH_WINDOW_DAYS}-day reach`,
        value: formatCount(totalReach(mentionsWithin(mentions, REACH_WINDOW_DAYS, now))),
      },
      { id: 'mentions', label: 'Mentions', value: mentions.length },
      { id: 'positive', label: 'Positive share', value: `${rate(positive, mentions.length)}%` },
    ];
  }, [mentions, now]);

  const columns = useMemo<TableColumn<KolMediaMention>[]>(
    () => [
      {
        id: 'headline',
        header: 'Coverage',
        accessorKey: 'headline',
        sortable: true,
        minWidth: 300,
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="font-semibold text-foreground">
              {row.url ? (
                <a
                  href={row.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 hover:text-primary hover:underline"
                >
                  {row.headline} <ExternalLink size={12} aria-hidden />
                </a>
              ) : (
                row.headline
              )}
            </p>
            <p className="mt-1 text-xs text-foreground-muted">
              {row.outlet}
              {contentTitle(row.contentId) ? ` · on “${contentTitle(row.contentId)}”` : ''}
            </p>
          </div>
        ),
      },
      {
        id: 'publishedAt',
        header: 'Published',
        accessorKey: 'publishedAt',
        sortable: true,
        minWidth: 120,
        cell: ({ row }) => formatDate(row.publishedAt),
      },
      {
        id: 'reach',
        header: 'Reach',
        // Zero-padded so the table's text sort orders numbers correctly.
        accessorFn: (row) => String(row.reach).padStart(12, '0'),
        sortable: true,
        align: 'right',
        minWidth: 100,
        cell: ({ row }) => formatCount(row.reach),
      },
      {
        id: 'sentiment',
        header: 'Sentiment',
        accessorKey: 'sentiment',
        sortable: true,
        minWidth: 110,
        cell: ({ row }) => <SentimentBadge sentiment={row.sentiment} />,
      },
      {
        id: 'source',
        header: 'Source',
        accessorKey: 'source',
        sortable: true,
        minWidth: 150,
        cell: ({ row }) => <MentionSourceBadge source={row.source} />,
      },
    ],
    [contentTitle],
  );

  const addButton = (
    <Button
      size="sm"
      disabled={!canManage}
      title={canManage ? undefined : MANAGE_DENIED_REASON}
      onClick={() => setAddOpen(true)}
    >
      <Plus size={15} aria-hidden /> Log mention
    </Button>
  );

  return (
    <div className="flex flex-col gap-6">
      <KpiGrid kpis={kpis} />
      <SectionCard
        title="Media reach"
        // description="Coverage attributed by S085 press monitoring, plus mentions logged manually."
        actions={addButton}
      >
        <DataTable
          paramPrefix="kol-mentions"
          columns={columns}
          data={mentions}
          rowKey={(row) => row.id}
          pageSize={10}
          filters={[
            {
              key: 'sentiment',
              label: 'Sentiment',
              options: [
                { value: 'POSITIVE', label: 'Positive' },
                { value: 'NEUTRAL', label: 'Neutral' },
                { value: 'NEGATIVE', label: 'Negative' },
              ],
              value: (row) => row.sentiment,
            },
            {
              key: 'source',
              label: 'Source',
              options: [
                { value: 'S085', label: 'S085 press monitoring' },
                { value: 'MANUAL', label: 'Manual' },
              ],
              value: (row) => row.source,
            },
          ]}
          empty={{
            message: 'No media mentions yet',
            hint: 'S085 attributes press coverage automatically; log radio, social or regional coverage manually.',
            icon: <Newspaper size={22} aria-hidden />,
            action: addButton,
          }}
        />
      </SectionCard>
      {addOpen ? (
        <MentionFormModal kolId={kolId} content={content} open onOpenChange={setAddOpen} />
      ) : null}
    </div>
  );
}
