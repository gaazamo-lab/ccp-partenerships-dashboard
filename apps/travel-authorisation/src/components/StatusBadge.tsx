import { Badge } from '@rfdtech/components';

import type { RequestStatus } from '@/features/requests/types';

const variant = (status: RequestStatus) => {
  if (['Approved', 'Support issued', 'Travel authorised', 'Completed', 'Closed'].includes(status))
    return 'success' as const;
  if (['Returned', 'Cancelled'].includes(status)) return 'warning' as const;
  if (status === 'Rejected') return 'error' as const;
  if (status === 'Submitted' || status === 'Pending approvals' || status === 'Screening')
    return 'primary' as const;
  return 'outline' as const;
};

export function StatusBadge({ status }: { status: RequestStatus }) {
  return <Badge variant={variant(status)}>{status}</Badge>;
}
