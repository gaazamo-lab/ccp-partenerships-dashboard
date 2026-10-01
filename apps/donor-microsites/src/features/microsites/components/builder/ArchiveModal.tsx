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

import type { Microsite } from '@partner-crm/types';
import { TextField } from '@partner-crm/ui';

import { archiveBlockers } from '@/features/microsites/domain';
import { fieldErrorsOf } from '@/features/microsites/errors';
import { useMicrosites } from '@/features/microsites/state/useMicrosites';

export function ArchiveModal({
  site,
  open,
  onOpenChange,
}: {
  site: Microsite;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { archive } = useMicrosites();
  const { toast } = useToast();
  const [archiveRef, setArchiveRef] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const blockers = archiveBlockers(site.status, archiveRef);
    if (blockers.length > 0) {
      setError(blockers[0] ?? null);
      return;
    }
    setSaving(true);
    try {
      await archive(site.id, { archiveRef: archiveRef.trim() });
      toast({
        title: 'Microsite archived',
        description: `${site.title} is offline and filed under ${archiveRef.trim()}.`,
        variant: 'success',
      });
      onOpenChange(false);
    } catch (reason) {
      setError(fieldErrorsOf(reason).archiveRef ?? null);
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent size="md">
        <form onSubmit={(event) => void handleSubmit(event)} noValidate>
          <ModalHeader>
            <ModalTitle>Archive microsite</ModalTitle>
            <ModalDescription>Archiving takes the site offline for good and records where the S003 copy is kept.</ModalDescription>
          </ModalHeader>
          <ModalBody className="space-y-4">
            {site.status === 'PUBLISHED' ? (
              <Notice variant="warning" title="This microsite is live" leftBorder>
                Visitors will lose access as soon as it is archived. Archived microsites cannot be restored.
              </Notice>
            ) : null}
            <TextField
              label="S003 archive reference"
              required
              autoFocus
              value={archiveRef}
              onChange={(value) => {
                setArchiveRef(value);
                setError(null);
              }}
              placeholder="S003/ARC/2026/0500"
              // description="The records-management reference for the archived copy."
              error={error ?? undefined}
            />
          </ModalBody>
          <ModalFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={saving} loading={saving}>
              Archive microsite
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}
