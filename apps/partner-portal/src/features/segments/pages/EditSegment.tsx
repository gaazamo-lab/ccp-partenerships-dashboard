import { useParams } from 'react-router';

import { Card, Notice } from '@rfdtech/components';
import { UsersRound } from 'lucide-react';

import { ROUTES } from '@/constants/routes';
import { SegmentForm } from '@/features/segments/components/SegmentForm';
import { EmptyState, PageHeader } from '@/features/shared';
import { useCrm } from '@/features/stakeholders/state/CrmContext';

export function Component() {
  const { segmentId } = useParams();
  const { segments, loading } = useCrm();
  const segment = segments.find((item) => item.id === segmentId);
  const backTo = { to: ROUTES.SEGMENTS, label: 'Back to segments' };

  if (!segment) {
    return (
      <section className="flex flex-col gap-body">
        <PageHeader title="Edit audience segment" backTo={backTo} />
        {loading ? (
          <Card bordered>
            <EmptyState
              message="Loading segment"
              hint="The form appears as soon as the S081 register responds."
              icon={<UsersRound size={22} aria-hidden />}
            />
          </Card>
        ) : (
          <Notice variant="error" title="Segment not found" leftBorder>
            It may have been deleted. Go back to the segment list to pick another.
          </Notice>
        )}
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-body">
      <PageHeader
        title={`Edit ${segment.name}`}
        // description="Change who this live audience includes. Downstream systems pick up the new rules the next time they resolve it."
        backTo={backTo}
        // meta={<Badge variant="outline">System</Badge>}
      />
      {/* Keyed so the form re-initialises if the route moves to another segment. */}
      <SegmentForm key={segment.id} segment={segment} />
    </section>
  );
}
