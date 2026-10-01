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
  useToast,
} from '@rfdtech/components';

import type { KolContentType } from '@partner-crm/types';

import { type ContentFieldErrors, hasErrors, validateContentInput } from '@/features/kol/domain';
import { CONTENT_TYPE_OPTIONS } from '@/features/kol/kolForm';
import { useKol } from '@/features/kol/state/useKol';
import { FormGrid, SelectField, TextField } from '@/features/shared';

interface ContentFormModalProps {
  kolId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ContentFormModal({ kolId, open, onOpenChange }: ContentFormModalProps) {
  const { createContent } = useKol();
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [contentType, setContentType] = useState<KolContentType>('OP_ED');
  const [dueDate, setDueDate] = useState('');
  const [errors, setErrors] = useState<ContentFieldErrors>({});
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const input = { title, contentType, dueDate: dueDate || null };
    const found = validateContentInput(input);
    setErrors(found);
    if (hasErrors(found)) return;
    setSaving(true);
    const saved = await createContent(kolId, input);
    setSaving(false);
    if (!saved) return;
    toast({
      title: 'Content commissioned',
      description: `${saved.title} is waiting for the author’s draft.`,
      variant: 'success',
    });
    onOpenChange(false);
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent size="md">
        <form onSubmit={(event) => void submit(event)} noValidate>
          <ModalHeader>
            <ModalTitle>Commission content</ModalTitle>
            <ModalDescription>
              Start a collaboration: draft submission, CLET review, then publication on S076.
            </ModalDescription>
          </ModalHeader>
          <ModalBody>
            <FormGrid columns={1}>
              <TextField
                label="Working title"
                required
                value={title}
                onChange={(value) => {
                  setTitle(value);
                  setErrors((current) => ({ ...current, title: undefined }));
                }}
                error={errors.title}
                placeholder="e.g. Why legal aid needs a dedicated levy"
              />
              <SelectField
                label="Content type"
                required
                value={contentType}
                onChange={(value) => setContentType(value as KolContentType)}
                options={CONTENT_TYPE_OPTIONS}
                error={errors.contentType}
              />
              <TextField
                label="Draft due"
                type="date"
                value={dueDate}
                onChange={setDueDate}
                error={errors.dueDate}
              />
            </FormGrid>
          </ModalBody>
          <ModalFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving} disabled={saving}>
              Commission
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}
