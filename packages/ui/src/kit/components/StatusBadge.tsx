import { Badge } from '@rfdtech/components';

import { statusVariant, titleCase } from '../lib/format';

interface StatusBadgeProps {
  status: string;
}

/**
 * Renders a status string with a tone inferred from its meaning.
 *
 * Use this only where the set of statuses isn't a closed union. Typed statuses
 * have their own badge (`PartnershipStatusBadge`, `RelationshipBadge` and
 * friends), which maps every member explicitly and so can't silently fall back
 * to a neutral grey when a new status is added.
 */
export function StatusBadge({ status }: StatusBadgeProps) {
  return <Badge variant={statusVariant(status)}>{titleCase(status)}</Badge>;
}
