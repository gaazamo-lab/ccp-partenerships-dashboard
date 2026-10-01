import { PIPELINE_STAGES, STAKEHOLDER_CATEGORIES } from '@/features/stakeholders/constants';
import type { PipelineStage, Stakeholder, StakeholderCategory } from '@/features/stakeholders/types';

export interface PipelineRow {
  category: StakeholderCategory;
  counts: Record<PipelineStage, number>;
  total: number;
}

export interface PipelineMatrix {
  rows: PipelineRow[];
  totals: Record<PipelineStage, number>;
  total: number;
}

function emptyCounts(): Record<PipelineStage, number> {
  return Object.fromEntries(PIPELINE_STAGES.map((stage) => [stage, 0])) as Record<
    PipelineStage,
    number
  >;
}

/**
 * Stakeholders by pipeline stage and category. Categories with no stakeholders
 * are dropped so the table only shows what is on the register.
 */
export function pipelineMatrix(stakeholders: Stakeholder[]): PipelineMatrix {
  const totals = emptyCounts();
  const rows = STAKEHOLDER_CATEGORIES.map((category) => {
    const counts = emptyCounts();
    let total = 0;
    for (const stakeholder of stakeholders) {
      if (stakeholder.category !== category) continue;
      const stage = stakeholder.pipelineStage ?? 'Prospect';
      counts[stage] += 1;
      totals[stage] += 1;
      total += 1;
    }
    return { category, counts, total };
  }).filter((row) => row.total > 0);

  return { rows, totals, total: rows.reduce((sum, row) => sum + row.total, 0) };
}
