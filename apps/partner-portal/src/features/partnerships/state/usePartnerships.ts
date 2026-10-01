import { useContext } from 'react';

import { PartnershipsContext } from '@/features/partnerships/state/PartnershipsContext';

export function usePartnerships() {
  const context = useContext(PartnershipsContext);
  if (!context) throw new Error('usePartnerships must be used within PartnershipsProvider.');
  return context;
}
