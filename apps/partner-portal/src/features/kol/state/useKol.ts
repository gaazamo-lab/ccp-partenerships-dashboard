import { useContext } from 'react';

import { KolContext } from './KolContext';

export function useKol() {
  const context = useContext(KolContext);
  if (!context) throw new Error('useKol must be used within KolProvider.');
  return context;
}
