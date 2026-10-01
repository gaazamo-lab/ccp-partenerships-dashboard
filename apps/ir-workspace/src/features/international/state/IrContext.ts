import { createContext } from 'react';

import type {
  IrCorrespondence,
  IrCorrespondenceInput,
  IrCorrespondenceTransitionInput,
  IrDelegationInput,
  IrEngagement,
  IrEngagementInput,
  IrFollowUpInput,
  IrGift,
  IrGiftInput,
  IrLetterTemplate,
  IrLetterTemplateInput,
  IrProtocolTaskInput,
  IrSupportRequestInput,
  IrSupportStatusInput,
  IrTaskUpdateInput,
  IrTransitionInput,
} from '@partner-crm/types';

/**
 * Every mutation resolves to the saved record, or `null` when the repository
 * rejected it — the provider has already toasted the reason, so callers only
 * decide whether to close their form.
 */
export interface IrContextValue {
  engagements: IrEngagement[];
  correspondence: IrCorrespondence[];
  templates: IrLetterTemplate[];
  gifts: IrGift[];
  loading: boolean;
  error: string | null;
  reload(): void;
  /** Display name recorded against approvals and used for the four-eyes check. */
  actor: string;
  role: string | undefined;

  createEngagement(input: IrEngagementInput): Promise<IrEngagement | null>;
  updateEngagement(id: string, input: IrEngagementInput): Promise<IrEngagement | null>;
  transitionEngagement(id: string, input: IrTransitionInput): Promise<IrEngagement | null>;
  addDelegate(id: string, input: IrDelegationInput): Promise<IrEngagement | null>;
  removeDelegate(id: string, memberId: string): Promise<IrEngagement | null>;
  addProtocolTask(id: string, input: IrProtocolTaskInput): Promise<IrEngagement | null>;
  updateProtocolTask(id: string, taskId: string, input: IrTaskUpdateInput): Promise<IrEngagement | null>;
  addFollowUp(id: string, input: IrFollowUpInput): Promise<IrEngagement | null>;
  updateFollowUp(id: string, followUpId: string, input: IrTaskUpdateInput): Promise<IrEngagement | null>;
  requestSupport(id: string, input: IrSupportRequestInput): Promise<IrEngagement | null>;
  updateSupport(id: string, requestId: string, input: IrSupportStatusInput): Promise<IrEngagement | null>;

  createCorrespondence(input: IrCorrespondenceInput): Promise<IrCorrespondence | null>;
  updateCorrespondence(id: string, input: IrCorrespondenceInput): Promise<IrCorrespondence | null>;
  transitionCorrespondence(
    id: string,
    input: IrCorrespondenceTransitionInput,
  ): Promise<IrCorrespondence | null>;

  createTemplate(input: IrLetterTemplateInput): Promise<IrLetterTemplate | null>;
  updateTemplate(id: string, input: IrLetterTemplateInput): Promise<IrLetterTemplate | null>;

  createGift(input: IrGiftInput): Promise<IrGift | null>;
  retryGiftFlag(id: string): Promise<IrGift | null>;
}

export const IrContext = createContext<IrContextValue | null>(null);
