import { useMemo } from 'react';
import { useNavigate } from 'react-router';

import { Badge, Button, type TableColumn, exportToCsv } from '@rfdtech/components';
import { CalendarRange, Download, FileText, Megaphone, Plus, Sparkles } from 'lucide-react';

import type { KolProfile } from '@partner-crm/types';

import { ROUTES, kolProfileRoute } from '@/constants/routes';
import {
  AvailabilityBadge,
  InfluenceBadge,
  KolStatusBadge,
  RiskBadge,
  TagList,
} from '@/features/kol/components/KolBadges';
import { LoadNotice } from '@/features/kol/components/LoadNotice';
import {
  CATEGORY_LABELS,
  CONTENT_REVIEW_STAGES,
  REACH_WINDOW_DAYS,
  impactSummary,
  openEngagements,
} from '@/features/kol/domain';
import {
  CATEGORY_OPTIONS,
  INFLUENCE_OPTIONS,
  RISK_OPTIONS,
  STATUS_OPTIONS,
  displayName,
} from '@/features/kol/kolForm';
import { useKol } from '@/features/kol/state/useKol';
import { useKolAccess } from '@/features/kol/state/useKolAccess';
import {
  DataTable,
  type DataTableFilter,
  type Kpi,
  KpiGrid,
  PageHeader,
  filterLink,
  formatCount,
  titleCase,
  useNow,
} from '@/features/shared';
import { useCrm } from '@/features/stakeholders/state/CrmContext';

const PARAM_PREFIX = 'kols';

export function Component() {
  const navigate = useNavigate();
  const { profiles, engagements, content, mentions, loading } = useKol();
  const { stakeholders } = useCrm();
  const { canManage, canExport } = useKolAccess();
  const now = useNow();

  const stakeholderName = useMemo(() => {
    const byId = new Map(stakeholders.map((item) => [item.id, item.name]));
    return (id: string | null) => (id ? (byId.get(id) ?? 'Unknown stakeholder') : '');
  }, [stakeholders]);

  const columns = useMemo<TableColumn<KolProfile>[]>(
    () => [
      {
        id: 'fullName',
        header: 'KOL',
        accessorKey: 'fullName',
        sortable: true,
        minWidth: 260,
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate font-semibold text-foreground">{displayName(row)}</p>
            <p className="mt-1 truncate text-xs text-foreground-muted">
              {[row.position, row.organisation].filter(Boolean).join(' · ') || 'No organisation recorded'}
            </p>
          </div>
        ),
      },
      {
        id: 'category',
        header: 'Category',
        accessorFn: (row) => CATEGORY_LABELS[row.category],
        sortable: true,
        minWidth: 150,
      },
      {
        id: 'expertise',
        header: 'Expertise',
        accessorFn: (row) => row.expertise.join(', '),
        minWidth: 220,
        cell: ({ row }) => <TagList tags={row.expertise} max={2} empty="Not tagged" />,
      },
      {
        id: 'influenceLevel',
        header: 'Influence',
        accessorKey: 'influenceLevel',
        sortable: true,
        minWidth: 130,
        cell: ({ row }) => <InfluenceBadge level={row.influenceLevel} />,
      },
      {
        id: 'availability',
        header: 'Availability',
        accessorKey: 'availability',
        sortable: true,
        minWidth: 120,
        cell: ({ row }) => <AvailabilityBadge availability={row.availability} />,
      },
      {
        id: 'riskLevel',
        header: 'Risk',
        accessorKey: 'riskLevel',
        sortable: true,
        minWidth: 130,
        cell: ({ row }) => <RiskBadge level={row.riskLevel} />,
      },
      {
        id: 'status',
        header: 'Status',
        accessorKey: 'status',
        sortable: true,
        minWidth: 110,
        cell: ({ row }) => <KolStatusBadge status={row.status} />,
      },
      {
        id: 'relationshipOwner',
        header: 'Owner',
        accessorKey: 'relationshipOwner',
        sortable: true,
        minWidth: 140,
      },
      {
        id: 'stakeholder',
        header: 'S081 stakeholder',
        accessorFn: (row) => stakeholderName(row.stakeholderId),
        sortable: true,
        minWidth: 200,
        cell: ({ row }) =>
          row.stakeholderId ? (
            <span className="text-sm text-foreground">{stakeholderName(row.stakeholderId)}</span>
          ) : row.alumniRef ? (
            <Badge variant="outline" size="sm">
              S034 alumnus
            </Badge>
          ) : (
            <span className="text-sm text-foreground-muted">Not linked</span>
          ),
      },
    ],
    [stakeholderName],
  );

  const filters = useMemo<DataTableFilter<KolProfile>[]>(
    () => [
      { key: 'category', label: 'Category', options: CATEGORY_OPTIONS, value: (row) => row.category },
      { key: 'status', label: 'Status', options: STATUS_OPTIONS, value: (row) => row.status },
      {
        key: 'influence',
        label: 'Influence',
        options: INFLUENCE_OPTIONS,
        value: (row) => row.influenceLevel,
      },
      { key: 'risk', label: 'Risk', options: RISK_OPTIONS, value: (row) => row.riskLevel },
      {
        key: 'owner',
        label: 'Relationship owner',
        options: [...new Set(profiles.map((item) => item.relationshipOwner))].sort(),
        value: (row) => row.relationshipOwner,
      },
    ],
    [profiles],
  );

  const kpis = useMemo<Kpi[]>(() => {
    const summary = impactSummary({ engagements, content, mentions }, now);
    return [
      {
        id: 'active',
        label: 'Active KOLs',
        value: profiles.filter((item) => item.status === 'ACTIVE').length,
        description: `${profiles.filter((item) => item.status === 'PROSPECT').length} prospects being cultivated`,
        icon: <Sparkles size={20} aria-hidden />,
        to: filterLink(ROUTES.KOLS, PARAM_PREFIX, { status: 'ACTIVE' }),
      },
      {
        id: 'pipeline',
        label: 'In pipeline',
        value: openEngagements(engagements).length,
        description: 'Planned, invited or confirmed',
        icon: <CalendarRange size={20} aria-hidden />,
        to: ROUTES.KOL_PIPELINE,
      },
      {
        id: 'review',
        label: 'Content in review',
        value: content.filter((item) => CONTENT_REVIEW_STAGES.includes(item.stage)).length,
        description: 'Drafts submitted or under review',
        icon: <FileText size={20} aria-hidden />,
        to: `${ROUTES.KOL_PIPELINE}#content`,
      },
      {
        id: 'reach',
        label: `${REACH_WINDOW_DAYS}-day reach`,
        value: formatCount(summary.recentReach),
        description: 'Attributed media audience (S085 + manual)',
        icon: <Megaphone size={20} aria-hidden />,
        to: ROUTES.KOL_IMPACT,
      },
    ];
  }, [profiles, engagements, content, mentions, now]);

  const exportRows = (rows: KolProfile[]) =>
    exportToCsv(
      rows,
      [
        { header: 'Name', accessor: (row: KolProfile) => displayName(row) },
        { header: 'Category', accessor: (row: KolProfile) => CATEGORY_LABELS[row.category] },
        { header: 'Organisation', accessor: (row: KolProfile) => row.organisation },
        { header: 'Position', accessor: (row: KolProfile) => row.position },
        { header: 'Status', accessor: (row: KolProfile) => titleCase(row.status) },
        { header: 'Influence', accessor: (row: KolProfile) => titleCase(row.influenceLevel) },
        { header: 'Availability', accessor: (row: KolProfile) => titleCase(row.availability) },
        { header: 'Risk', accessor: (row: KolProfile) => titleCase(row.riskLevel) },
        { header: 'Expertise', accessor: (row: KolProfile) => row.expertise.join('; ') },
        { header: 'Influence areas', accessor: (row: KolProfile) => row.influenceAreas.join('; ') },
        { header: 'Relationship owner', accessor: (row: KolProfile) => row.relationshipOwner },
        { header: 'S081 stakeholder', accessor: (row: KolProfile) => stakeholderName(row.stakeholderId) },
        { header: 'S034 alumni ref', accessor: (row: KolProfile) => row.alumniRef ?? '' },
        { header: 'Email', accessor: (row: KolProfile) => row.email },
      ],
      's092-kol-register.csv',
    );

  const addButton = (
    <Button
      disabled={!canManage}
      title={canManage ? undefined : 'Your role cannot add KOL profiles.'}
      onClick={() => void navigate(ROUTES.KOL_CREATE)}
    >
      <Plus size={17} aria-hidden /> Add KOL
    </Button>
  );

  return (
    <section className="flex flex-col gap-body">
      <PageHeader
        title="KOL register"
        // description="Senior advocates, judges, legal academics, policy influencers, notable alumni and media voices — each linked to their S081 or S034 record."
        // meta={<Badge variant="outline">System S092</Badge>}
        actions={addButton}
      />

      <LoadNotice canManage={canManage} />

      <KpiGrid kpis={kpis} loading={loading} />

      <DataTable
        paramPrefix={PARAM_PREFIX}
        columns={columns}
        data={profiles}
        rowKey={(row) => row.id}
        loading={loading}
        searchPlaceholder="Search name, organisation, expertise or owner"
        searchFields={(row) => [
          row.fullName,
          row.organisation,
          row.position,
          row.relationshipOwner,
          stakeholderName(row.stakeholderId),
          ...row.expertise,
          ...row.influenceAreas,
        ]}
        filters={filters}
        onRowClick={(row) => void navigate(kolProfileRoute(row.id))}
        empty={{
          message: 'No KOLs in the register yet',
          hint: 'Add the first thought leader and link them to their S081 stakeholder or S034 alumni record.',
          icon: <Sparkles size={22} aria-hidden />,
          action: addButton,
        }}
        actions={(visible) => (
          <Button
            variant="ghost"
            size="sm"
            disabled={visible.length === 0 || !canExport}
            title={canExport ? undefined : 'Your role cannot export KOL data.'}
            onClick={() => exportRows(visible)}
          >
            <Download size={16} aria-hidden /> Export
          </Button>
        )}
      />
    </section>
  );
}
