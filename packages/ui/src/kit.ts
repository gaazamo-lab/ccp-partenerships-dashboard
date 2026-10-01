/**
 * The portal's shared UI kit.
 *
 * Pages compose these rather than `@rfdtech/components` primitives directly,
 * so a page header, a card section, a list, a KPI row and a form field look and
 * behave the same everywhere. Reach for the primitives only for something this
 * kit genuinely doesn't cover — and when you do it twice, add it here instead.
 */

export { ActionMenu, type ActionMenuItem } from './kit/components/ActionMenu';
export { DataTable, type DataTableFilter } from './kit/components/DataTable';
export { DetailGrid, DetailItem } from './kit/components/DetailItem';
export { EmptyState } from './kit/components/EmptyState';
export { ExportMenu, type ExportOption } from './kit/components/ExportMenu';
export {
  CheckboxField,
  FormGrid,
  MultiSelectField,
  SelectField,
  type SelectOption,
  TextareaField,
  TextField,
} from './kit/components/FormFields';
export { FormActions, FormSection } from './kit/components/FormSection';
export { type Kpi, KpiGrid } from './kit/components/KpiGrid';
export { PageHeader } from './kit/components/PageHeader';
export { PortfolioDonutChart, type PortfolioSlice } from './kit/components/PortfolioDonutChart';
export { SectionCard } from './kit/components/SectionCard';
export { StatusBadge } from './kit/components/StatusBadge';
export {
  daysUntil,
  formatCount,
  formatDate,
  formatDateTime,
  initials,
  labelize,
  rate,
  statusVariant,
  titleCase,
} from './kit/lib/format';
export { filterLink } from './kit/lib/filterLink';
export { useNow } from './kit/lib/useNow';
export { usePagedRows } from './kit/lib/usePagedRows';
