import { useContext } from 'react';

import { MicrositesContext } from './MicrositesContext';

export function useMicrosites() {
  const context = useContext(MicrositesContext);
  if (!context) throw new Error('useMicrosites must be used within MicrositesProvider.');
  return context;
}
