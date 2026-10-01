import { Step, StepLabel, Stepper } from '@rfdtech/components';

import type { KolContentStage } from '@partner-crm/types';

import { CONTENT_FLOW, contentStepValue } from '@/features/kol/domain';
import { titleCase } from '@/features/shared';

/** The collaboration's position on commission → draft → review → approval → publication. */
export function ContentStepper({ stage }: { stage: KolContentStage }) {
  if (stage === 'WITHDRAWN') {
    return (
      <p className="text-sm text-foreground-muted">
        Withdrawn — this collaboration is closed and will not be published.
      </p>
    );
  }
  return (
    <Stepper value={contentStepValue(stage)} aria-label="Content workflow">
      {CONTENT_FLOW.map((step, index) => (
        <Step key={step} value={index + 1}>
          <StepLabel>
            {step === 'IN_REVIEW' && stage === 'CHANGES_REQUESTED'
              ? 'Changes requested'
              : titleCase(step)}
          </StepLabel>
        </Step>
      ))}
    </Stepper>
  );
}
