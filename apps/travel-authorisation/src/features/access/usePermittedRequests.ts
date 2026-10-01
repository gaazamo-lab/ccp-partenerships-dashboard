import { useAuth } from '@partner-crm/auth';

import { env } from '@/config/env';
import { useRequests } from '@/features/requests/requests-context';

import { useOperationalRole } from './role-context';

export function usePermittedRequests() {
  const { user } = useAuth();
  const { role } = useOperationalRole();
  const { requests } = useRequests();
  // The API already scopes the register to what this account may see.
  if (env.dataMode === 'api') return requests;
  if (role === 'DTI Administrator' || role === 'IR Officer' || role === 'Auditor') return requests;
  if (role === 'Traveller') {
    return requests.filter(
      (request) => request.traveller === user?.name || request.requester === user?.name,
    );
  }
  return requests.filter((request) =>
    request.approvals.some((approval) => approval.assignee === user?.name),
  );
}
