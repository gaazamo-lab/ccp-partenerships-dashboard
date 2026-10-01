import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';

import {
  BulkImportModal,
  Button,
  Notice,
  type TableColumn,
  exportToCsv,
  useToast,
} from '@rfdtech/components';
import { Building2, Download, Plus, RefreshCw, Upload } from 'lucide-react';

import { useAuth } from '@partner-crm/auth';

import { ROUTES, stakeholderProfileRoute } from '@/constants/routes';
import { DataTable, type DataTableFilter, PageHeader } from '@/features/shared';
import { ImportReviewModal } from '@/features/stakeholders/components/ImportReviewModal';
import {
  PipelineBadge,
  RelationshipBadge,
} from '@/features/stakeholders/components/StatusBadges';
import {
  PIPELINE_STAGES,
  RELATIONSHIP_STATUSES,
  STAKEHOLDER_CATEGORIES,
} from '@/features/stakeholders/constants';
import type { StakeholderImportRow } from '@/features/stakeholders/duplicates';
import { displayDate, parseEngagementDate } from '@/features/stakeholders/engagements';
import { permissionHint } from '@/features/stakeholders/permissions';
import { useCrm } from '@/features/stakeholders/state/CrmContext';
import type { Stakeholder, StakeholderImportResult } from '@/features/stakeholders/types';

const columns: TableColumn<Stakeholder>[] = [
  {
    id: 'name',
    header: 'Stakeholder',
    accessorKey: 'name',
    sortable: true,
    minWidth: 260,
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
          {row.shortName}
        </span>
        <div className="min-w-0">
          <p className="truncate font-semibold text-foreground">{row.name}</p>
          <p className="truncate text-xs text-foreground-muted">{row.location}</p>
        </div>
      </div>
    ),
  },
  { id: 'category', header: 'Category', accessorKey: 'category', sortable: true, minWidth: 150 },
  {
    id: 'owner',
    header: 'Relationship owner',
    accessorKey: 'owner',
    sortable: true,
    minWidth: 160,
  },
  {
    id: 'status',
    header: 'Status',
    accessorKey: 'status',
    sortable: true,
    minWidth: 150,
    cell: ({ row }) => <RelationshipBadge status={row.status} />,
  },
  {
    id: 'pipelineStage',
    header: 'Pipeline',
    // Sort in funnel order rather than alphabetically.
    accessorFn: (row) => String(PIPELINE_STAGES.indexOf(row.pipelineStage)),
    sortable: true,
    minWidth: 130,
    cell: ({ row }) => <PipelineBadge stage={row.pipelineStage} />,
  },
  {
    id: 'lastEngagement',
    header: 'Last engagement',
    accessorFn: (row) => {
      const time = parseEngagementDate(row.lastEngagement);
      return Number.isNaN(time) ? '0' : String(time).padStart(15, '0');
    },
    sortable: true,
    minWidth: 140,
    cell: ({ row }) => displayDate(row.lastEngagement),
  },
];

const EXPORT_COLUMNS = [
  { header: 'Organisation', accessor: (row: Stakeholder) => row.name },
  { header: 'Category', accessor: (row: Stakeholder) => row.category },
  { header: 'Relationship owner', accessor: (row: Stakeholder) => row.owner },
  { header: 'Status', accessor: (row: Stakeholder) => row.status },
  { header: 'Pipeline stage', accessor: (row: Stakeholder) => row.pipelineStage },
  { header: 'Health', accessor: (row: Stakeholder) => row.health },
  { header: 'Location', accessor: (row: Stakeholder) => row.location },
  { header: 'Last engagement', accessor: (row: Stakeholder) => displayDate(row.lastEngagement) },
];

export function Component() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { stakeholders, importStakeholders, loading, error, reload } = useCrm();
  const { toast } = useToast();
  const [importOpen, setImportOpen] = useState(false);
  const [review, setReview] = useState<StakeholderImportResult | null>(null);
  const createHint = permissionHint(user?.role, 'create');
  const importHint = permissionHint(user?.role, 'import');
  const exportHint = permissionHint(user?.role, 'export');

  const filters = useMemo<DataTableFilter<Stakeholder>[]>(
    () => [
      {
        key: 'category',
        label: 'Category',
        options: STAKEHOLDER_CATEGORIES,
        value: (row) => row.category,
      },
      {
        key: 'status',
        label: 'Status',
        options: RELATIONSHIP_STATUSES,
        value: (row) => row.status,
      },
      {
        key: 'pipeline',
        label: 'Pipeline stage',
        options: PIPELINE_STAGES,
        value: (row) => row.pipelineStage,
      },
      {
        key: 'owner',
        label: 'Owner',
        options: [...new Set(stakeholders.map((row) => row.owner))].sort(),
        value: (row) => row.owner,
      },
    ],
    [stakeholders],
  );

  const addButton = (
    <Button
      onClick={() => void navigate(ROUTES.STAKEHOLDER_CREATE)}
      disabled={Boolean(createHint)}
      title={createHint}
    >
      <Plus size={17} aria-hidden /> Add stakeholder
    </Button>
  );

  return (
    <section className="flex flex-col gap-body">
      <PageHeader
        title="Stakeholders"
        // description="The authoritative register of CLET's external organisations and key relationships."
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => setImportOpen(true)}
              disabled={Boolean(importHint)}
              title={importHint}
            >
              <Upload size={17} aria-hidden /> Import
            </Button>
            {addButton}
          </>
        }
      />

      {error ? (
        <Notice variant="error" title="The register could not be loaded" leftBorder>
          <p>{error}</p>
          <Button className="mt-3" size="sm" variant="outline" onClick={reload}>
            <RefreshCw size={14} aria-hidden /> Try again
          </Button>
        </Notice>
      ) : null}

      <DataTable
        paramPrefix="stakeholders"
        columns={columns}
        data={stakeholders}
        rowKey={(row) => row.id}
        loading={loading}
        searchPlaceholder="Search by stakeholder, category, or owner"
        searchFields={(row) => [row.name, row.shortName, row.category, row.owner, row.location]}
        filters={filters}
        onRowClick={(row) => void navigate(stakeholderProfileRoute(row.id))}
        empty={{
          message: loading ? 'Loading the register' : 'No stakeholders yet',
          hint: loading
            ? 'Stakeholders appear here as soon as the S081 register responds.'
            : 'Add the first external organisation, or import a list to get started.',
          icon: <Building2 size={22} aria-hidden />,
          action: loading ? undefined : addButton,
        }}
        actions={(visible) => (
          <Button
            variant="ghost"
            size="sm"
            disabled={visible.length === 0 || Boolean(exportHint)}
            title={exportHint}
            onClick={() => exportToCsv(visible, EXPORT_COLUMNS, 's081-stakeholders.csv')}
          >
            <Download size={16} aria-hidden /> Export
          </Button>
        )}
      />

      {importOpen ? (
        <BulkImportModal
          open={importOpen}
          onOpenChange={setImportOpen}
          title="Import stakeholder organisations"
          allowImportWithWarnings
          fields={[
            {
              key: 'name',
              label: 'Organisation name',
              required: true,
              unique: true,
              matchKeys: ['organisation', 'stakeholder'],
            },
            { key: 'shortName', label: 'Short name', matchKeys: ['acronym'] },
            {
              key: 'category',
              label: 'Category',
              required: true,
              options: [...STAKEHOLDER_CATEGORIES],
              optionsIgnoreCase: true,
            },
            { key: 'owner', label: 'Relationship owner', required: true },
            { key: 'location', label: 'Location', required: true },
            { key: 'website', label: 'Website' },
            { key: 'description', label: 'Relationship summary' },
          ]}
          onComplete={(result) => {
            const rows = result.rows.map(
              (row): StakeholderImportRow => ({
                name: row.name ?? '',
                shortName: row.shortName ?? '',
                category: row.category ?? '',
                owner: row.owner ?? '',
                location: row.location ?? '',
                website: row.website ?? '',
                description: row.description ?? '',
              }),
            );
            const outcome = importStakeholders(rows);
            setImportOpen(false);
            if (outcome.skipped.length > 0) {
              setReview(outcome);
            } else {
              toast({
                title: `${outcome.created} stakeholder${outcome.created === 1 ? '' : 's'} imported`,
                description: 'Duplicate and boundary checks found nothing to hold back.',
                variant: 'success',
              });
            }
          }}
        />
      ) : null}

      {review ? (
        <ImportReviewModal
          open
          onOpenChange={(open) => {
            if (!open) setReview(null);
          }}
          result={review}
        />
      ) : null}
    </section>
  );
}
