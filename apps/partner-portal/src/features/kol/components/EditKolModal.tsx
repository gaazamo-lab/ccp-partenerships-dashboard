import { type FormEvent, useMemo, useState } from 'react';

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

import type { KolInput, KolProfile } from '@partner-crm/types';

import { type KolFieldErrors, hasErrors, validateKolInput } from '@/features/kol/domain';
import { toKolInput } from '@/features/kol/kolForm';
import { useKol } from '@/features/kol/state/useKol';
import { useCrm } from '@/features/stakeholders/state/CrmContext';

import {
  ExpertiseFields,
  IdentityFields,
  LinkFields,
  RelationshipFields,
} from './KolProfileFields';

interface EditKolModalProps {
  profile: KolProfile;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function Heading({ children }: { children: string }) {
  return <h3 className="text-sm font-semibold text-foreground">{children}</h3>;
}

export function EditKolModal({ profile, open, onOpenChange }: EditKolModalProps) {
  const { profiles, updateProfile } = useKol();
  const { stakeholders } = useCrm();
  const { toast } = useToast();
  const [value, setValue] = useState<KolInput>(() => toKolInput(profile));
  const [errors, setErrors] = useState<KolFieldErrors>({});
  const [saving, setSaving] = useState(false);

  const stakeholderOptions = useMemo(
    () => stakeholders.map((item) => ({ value: item.id, label: item.name })),
    [stakeholders],
  );

  const onChange = (patch: Partial<KolInput>) => {
    setValue((current) => ({ ...current, ...patch }));
    setErrors((current) => {
      const next = { ...current };
      for (const key of Object.keys(patch) as Array<keyof KolInput>) delete next[key];
      if ('riskLevel' in patch) delete next.riskNotes;
      return next;
    });
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const found = validateKolInput(value, {
      profiles,
      excludeId: profile.id,
      stakeholderExists: (id) => stakeholders.some((item) => item.id === id),
    });
    setErrors(found);
    if (hasErrors(found)) return;
    setSaving(true);
    const saved = await updateProfile(profile.id, value);
    setSaving(false);
    if (!saved) return;
    toast({
      title: 'KOL profile updated',
      description: `${saved.fullName}’s profile has been saved.`,
      variant: 'success',
    });
    onOpenChange(false);
  };

  const props = { value, onChange, errors, disabled: saving };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent size="xl">
        <form onSubmit={(event) => void submit(event)} noValidate>
          <ModalHeader>
            <ModalTitle>Edit KOL profile</ModalTitle>
            <ModalDescription>
              Update profile details, expertise tags, availability and risk notes.
            </ModalDescription>
          </ModalHeader>
          <ModalBody className="max-h-[65vh] space-y-6 overflow-y-auto">
            <Heading>Identity and role</Heading>
            <IdentityFields {...props} />
            <Heading>CRM linkage</Heading>
            <LinkFields {...props} stakeholderOptions={stakeholderOptions} />
            <Heading>Expertise and influence</Heading>
            <ExpertiseFields {...props} />
            <Heading>Relationship and risk</Heading>
            <RelationshipFields {...props} />
          </ModalBody>
          <ModalFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving} disabled={saving}>
              Save profile
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}
