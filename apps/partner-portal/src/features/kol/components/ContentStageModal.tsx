import { type FormEvent, useState } from 'react';

import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  Notice,
  useToast,
} from '@rfdtech/components';

import type { KolContent, KolContentStage } from '@partner-crm/types';

import {
  type ContentMoveErrors,
  contentActionLabel,
  hasErrors,
  validateContentMove,
} from '@/features/kol/domain';
import { useKol } from '@/features/kol/state/useKol';
import { FormGrid, TextField, TextareaField, labelize } from '@/features/shared';

interface ContentStageModalProps {
  content: KolContent;
  target: KolContentStage;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ContentStageModal({ content, target, open, onOpenChange }: ContentStageModalProps) {
  const { moveContent } = useKol();
  const { toast } = useToast();
  const [draftRef, setDraftRef] = useState(
    target === 'DRAFT_SUBMITTED' && content.stage === 'COMMISSIONED' ? '' : (content.draftRef ?? ''),
  );
  const [reviewNotes, setReviewNotes] = useState('');
  const [publishedUrl, setPublishedUrl] = useState('');
  const [cmsRef, setCmsRef] = useState(content.cmsRef ?? '');
  const [errors, setErrors] = useState<ContentMoveErrors>({});
  const [saving, setSaving] = useState(false);

  const stageBlocker = validateContentMove(content, {
    stage: target,
    draftRef: 'x',
    reviewNotes: 'x',
    publishedUrl: 'https://x.org',
  }).stage;
  const label = contentActionLabel(content.stage, target);
  const withdrawing = target === 'WITHDRAWN';
  const notesVisible = ['CHANGES_REQUESTED', 'APPROVED', 'WITHDRAWN', 'IN_REVIEW'].includes(target);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const input = {
      stage: target,
      draftRef: draftRef.trim() || null,
      reviewNotes: reviewNotes.trim(),
      publishedUrl: publishedUrl.trim() || null,
      cmsRef: cmsRef.trim() || null,
    };
    const found = validateContentMove(content, input);
    setErrors(found);
    if (hasErrors(found)) return;
    setSaving(true);
    const saved = await moveContent(content.id, input);
    setSaving(false);
    if (!saved) return;
    toast({
      title: withdrawing ? 'Content withdrawn' : 'Content updated',
      description: `${saved.title} is now ${labelize(saved.stage)}.`,
      variant: withdrawing ? 'warning' : 'success',
    });
    onOpenChange(false);
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent size="md">
        <form onSubmit={(event) => void submit(event)} noValidate>
          <ModalHeader>
            <ModalTitle>{label}</ModalTitle>
            <ModalDescription>{content.title}</ModalDescription>
          </ModalHeader>
          <ModalBody className="space-y-5">
            {stageBlocker ? (
              <Notice variant="warning" title="This move is not allowed" leftBorder>
                {stageBlocker}
              </Notice>
            ) : null}
            {content.stage === 'CHANGES_REQUESTED' && content.reviewNotes ? (
              <Notice variant="info" title="Changes requested" leftBorder>
                {content.reviewNotes}
              </Notice>
            ) : null}
            <FormGrid columns={1}>
              {target === 'DRAFT_SUBMITTED' ? (
                <TextField
                  label="S003 draft reference"
                  required
                  value={draftRef}
                  onChange={(value) => {
                    setDraftRef(value);
                    setErrors((current) => ({ ...current, draftRef: undefined }));
                  }}
                  error={errors.draftRef}
                  placeholder="e.g. S003-DOC-2026-3381"
                  // description="The document record holding this version of the draft."
                />
              ) : null}
              {target === 'PUBLISHED' ? (
                <>
                  <TextField
                    label="Published URL"
                    type="url"
                    required
                    value={publishedUrl}
                    onChange={(value) => {
                      setPublishedUrl(value);
                      setErrors((current) => ({ ...current, publishedUrl: undefined }));
                    }}
                    error={errors.publishedUrl}
                    placeholder="https://clet.edu.gh/insights/…"
                  />
                  <TextField
                    label="S076 CMS reference"
                    value={cmsRef}
                    onChange={setCmsRef}
                    placeholder="e.g. S076-CMS-8812"
                  />
                </>
              ) : null}
              {notesVisible ? (
                <TextareaField
                  label={target === 'CHANGES_REQUESTED' ? 'Changes needed' : 'Review notes'}
                  required={target === 'CHANGES_REQUESTED'}
                  rows={4}
                  value={reviewNotes}
                  onChange={(value) => {
                    setReviewNotes(value);
                    setErrors((current) => ({ ...current, reviewNotes: undefined }));
                  }}
                  error={errors.reviewNotes}
                  placeholder={
                    withdrawing
                      ? 'Why is this piece being withdrawn?'
                      : 'What the reviewer checked or wants changed.'
                  }
                />
              ) : null}
            </FormGrid>
          </ModalBody>
          <ModalFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Back
            </Button>
            <Button
              type="submit"
              variant={withdrawing ? 'destructive' : 'primary'}
              loading={saving}
              disabled={saving || Boolean(stageBlocker)}
            >
              {label}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}
