import { createContext } from 'react';

import type {
  ArchiveMicrositeInput,
  CreateMicrositeInput,
  Microsite,
  MicrositeAccessInput,
  MicrositeReview,
  MicrositeReviewInput,
  MicrositeTemplate,
  UpdateMicrositeInput,
} from '@partner-crm/types';

export interface MicrositesContextValue {
  sites: Microsite[];
  templates: MicrositeTemplate[];
  /** Review history per microsite ID, newest first; filled on demand. */
  reviews: Record<string, MicrositeReview[]>;
  loading: boolean;
  error: string | null;
  /** The signed-in user's display name, as recorded on reviews. */
  actor: string;
  reload: () => Promise<void>;
  loadReviews: (id: string) => Promise<void>;
  hasStoredCode: (site: Microsite) => boolean;
  /* Actions resolve with the server's record, or reject after a failure toast. */
  create: (input: CreateMicrositeInput) => Promise<Microsite>;
  update: (id: string, input: UpdateMicrositeInput) => Promise<Microsite>;
  setAccess: (id: string, input: MicrositeAccessInput) => Promise<Microsite>;
  review: (id: string, input: MicrositeReviewInput) => Promise<Microsite>;
  publish: (id: string) => Promise<Microsite>;
  unpublish: (id: string) => Promise<Microsite>;
  archive: (id: string, input: ArchiveMicrositeInput) => Promise<Microsite>;
}

export const MicrositesContext = createContext<MicrositesContextValue | null>(null);
