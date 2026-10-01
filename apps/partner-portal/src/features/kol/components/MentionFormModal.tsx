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

import type { KolContent, KolMentionSentiment } from '@partner-crm/types';

import { type MentionFieldErrors, hasErrors, validateMentionInput } from '@/features/kol/domain';
import { SENTIMENT_OPTIONS, fromDateInput } from '@/features/kol/kolForm';
import { useKol } from '@/features/kol/state/useKol';
import { FormGrid, SelectField, TextField } from '@/features/shared';

interface MentionFormModalProps {
  kolId: string;
  /** The KOL's content, offered as the piece this coverage is attributed to. */
  content: KolContent[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MentionFormModal({ kolId, content, open, onOpenChange }: MentionFormModalProps) {
  const { addMention } = useKol();
  const { toast } = useToast();
  const [outlet, setOutlet] = useState('');
  const [headline, setHeadline] = useState('');
  const [url, setUrl] = useState('');
  const [publishedAt, setPublishedAt] = useState('');
  const [reach, setReach] = useState('');
  const [sentiment, setSentiment] = useState<KolMentionSentiment>('NEUTRAL');
  const [contentId, setContentId] = useState('');
  const [errors, setErrors] = useState<MentionFieldErrors>({});
  const [saving, setSaving] = useState(false);

  const clear = (key: keyof MentionFieldErrors) =>
    setErrors((current) => ({ ...current, [key]: undefined }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const input = {
      outlet,
      headline,
      url: url.trim(),
      publishedAt: fromDateInput(publishedAt) ?? '',
      reach: reach.trim() === '' ? Number.NaN : Number(reach),
      sentiment,
      contentId: contentId || null,
    };
    const found = validateMentionInput(input);
    setErrors(found);
    if (hasErrors(found)) return;
    setSaving(true);
    const saved = await addMention(kolId, input);
    setSaving(false);
    if (!saved) return;
    toast({
      title: 'Mention logged',
      description: `${saved.outlet} coverage added to the media reach total.`,
      variant: 'success',
    });
    onOpenChange(false);
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent size="lg">
        <form onSubmit={(event) => void submit(event)} noValidate>
          <ModalHeader>
            <ModalTitle>Log a media mention</ModalTitle>
            <ModalDescription>
              For coverage S085 press monitoring did not pick up — radio, social or regional
              outlets. Logged as a manual mention.
            </ModalDescription>
          </ModalHeader>
          <ModalBody>
            <FormGrid>
              <TextField
                label="Outlet"
                required
                value={outlet}
                onChange={(value) => {
                  setOutlet(value);
                  clear('outlet');
                }}
                error={errors.outlet}
                placeholder="e.g. Asaase Radio"
              />
              <TextField
                label="Published"
                type="date"
                required
                value={publishedAt}
                onChange={(value) => {
                  setPublishedAt(value);
                  clear('publishedAt');
                }}
                error={errors.publishedAt}
              />
              <TextField
                label="Headline"
                required
                className="sm:col-span-2"
                value={headline}
                onChange={(value) => {
                  setHeadline(value);
                  clear('headline');
                }}
                error={errors.headline}
              />
              <TextField
                label="Link"
                type="url"
                className="sm:col-span-2"
                value={url}
                onChange={(value) => {
                  setUrl(value);
                  clear('url');
                }}
                error={errors.url}
                placeholder="https://…"
                // description="Optional for broadcast coverage without a web page."
              />
              <TextField
                label="Estimated reach"
                type="number"
                required
                min={0}
                value={reach}
                onChange={(value) => {
                  setReach(value);
                  clear('reach');
                }}
                error={errors.reach}
                // description="Audience or readership estimate, 0 or more."
              />
              <SelectField
                label="Sentiment"
                required
                value={sentiment}
                onChange={(value) => setSentiment(value as KolMentionSentiment)}
                options={SENTIMENT_OPTIONS}
              />
              <SelectField
                label="Attributed content"
                className="sm:col-span-2"
                value={contentId}
                onChange={setContentId}
                options={content.map((item) => ({ value: item.id, label: item.title }))}
                placeholder="Not linked to a content piece"
                clearable
                disabled={content.length === 0}
              />
            </FormGrid>
          </ModalBody>
          <ModalFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving} disabled={saving}>
              Log mention
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}
