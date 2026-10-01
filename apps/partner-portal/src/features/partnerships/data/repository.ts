import {
  type PartnershipsRepository,
  createHttpPartnershipsRepository,
} from '@partner-crm/api-client';

import { apiClient } from '@/config/api';

/** S082 is backend-owned; the portal never falls back to a local agreement dataset. */
export const partnershipsRepository: PartnershipsRepository =
  createHttpPartnershipsRepository(apiClient);

/** Integration-readiness records are served by the same backend repository. */
export const integrationHealthRepository = createHttpPartnershipsRepository(apiClient);
