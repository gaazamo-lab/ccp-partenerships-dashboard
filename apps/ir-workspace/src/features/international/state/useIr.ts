import { useContext } from 'react';

import { IrContext } from './IrContext';

export function useIr() {
  const context = useContext(IrContext);
  if (!context) throw new Error('useIr must be used within IrProvider.');
  return context;
}
