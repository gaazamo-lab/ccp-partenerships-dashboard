import { Badge } from '@rfdtech/components';

import { ROUTES } from '@/constants/routes';
import { SegmentForm } from '@/features/segments/components/SegmentForm';
import { PageHeader } from '@/features/shared';

export function Component() {
  return (
    <section className="flex flex-col gap-body">
      <PageHeader
        title="Create audience segment"
        // description="Define a live audience that downstream systems resolve by reference."
        backTo={{ to: ROUTES.SEGMENTS, label: 'Back to segments' }}
        meta={<Badge variant="outline">System S081</Badge>}
      />
      <SegmentForm />
    </section>
  );
}
