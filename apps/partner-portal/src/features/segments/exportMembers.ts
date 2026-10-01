import { exportToCsv } from '@rfdtech/components';

import type { ResolvedMember } from '@/features/segments/resolution';
import type { Segment } from '@/features/stakeholders/types';

export function exportSegmentMembers(segment: Segment, members: ResolvedMember[]) {
  const slug = segment.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  exportToCsv(
    members,
    [
      { header: 'Contact', accessor: (row) => row.contactName },
      { header: 'Role', accessor: (row) => row.role },
      { header: 'Email', accessor: (row) => row.email },
      { header: 'Organisation', accessor: (row) => row.stakeholderName },
      { header: 'Category', accessor: (row) => row.category },
      { header: 'Relationship owner', accessor: (row) => row.owner },
      { header: 'Consent', accessor: (row) => row.consent },
    ],
    `s081-segment-${slug || segment.id}.csv`,
  );
}
