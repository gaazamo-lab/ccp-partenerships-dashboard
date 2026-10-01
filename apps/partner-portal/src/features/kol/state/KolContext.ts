import { createContext } from 'react';

import type {
  KolContent,
  KolContentInput,
  KolContentStageInput,
  KolEngagement,
  KolEngagementInput,
  KolEngagementStageInput,
  KolInput,
  KolMediaMention,
  KolMediaMentionInput,
  KolParticipationInput,
  KolProfile,
} from '@partner-crm/types';

/**
 * Every action resolves to the saved record, or `null` when the repository
 * rejected it — the provider has already shown the failure toast, so callers
 * only need to keep the form open.
 */
export interface KolContextValue {
  profiles: KolProfile[];
  engagements: KolEngagement[];
  content: KolContent[];
  mentions: KolMediaMention[];
  loading: boolean;
  error: string | null;
  reload(): Promise<void>;
  createProfile(input: KolInput): Promise<KolProfile | null>;
  updateProfile(id: string, input: KolInput): Promise<KolProfile | null>;
  createEngagement(kolId: string, input: KolEngagementInput): Promise<KolEngagement | null>;
  moveEngagement(id: string, input: KolEngagementStageInput): Promise<KolEngagement | null>;
  recordParticipation(id: string, input: KolParticipationInput): Promise<KolEngagement | null>;
  createContent(kolId: string, input: KolContentInput): Promise<KolContent | null>;
  moveContent(id: string, input: KolContentStageInput): Promise<KolContent | null>;
  addMention(kolId: string, input: KolMediaMentionInput): Promise<KolMediaMention | null>;
}

export const KolContext = createContext<KolContextValue | null>(null);
