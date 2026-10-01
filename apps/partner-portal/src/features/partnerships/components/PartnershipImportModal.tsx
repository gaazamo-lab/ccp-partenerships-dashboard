import { type ChangeEvent, type FormEvent, useState } from 'react';

import {
  Button,
  Field,
  FieldControl,
  FieldDescription,
  FieldError,
  FieldLabel,
  Input,
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
import * as XLSX from 'xlsx';

import { useAuth } from '@partner-crm/auth';
import type { ImportPartnershipInput } from '@partner-crm/types';

import { downloadMigrationTemplate } from '@/features/partnerships/dataPortability';
import {
  type PartnershipImportSourceRow,
  validatePartnershipImportRows,
} from '@/features/partnerships/migration';
import { usePartnerships } from '@/features/partnerships/state/usePartnerships';
import { useCrm } from '@/features/stakeholders/state/CrmContext';

export function PartnershipImportModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { importAgreements } = usePartnerships();
  const { stakeholders } = useCrm();
  const { user } = useAuth();
  const { toast } = useToast();
  const [rows, setRows] = useState<ImportPartnershipInput[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [fileName, setFileName] = useState('');

  const parseFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0] ?? ''];
    const sourceRows = firstSheet
      ? XLSX.utils.sheet_to_json<PartnershipImportSourceRow>(firstSheet, { defval: '' })
      : [];
    const result = validatePartnershipImportRows(sourceRows, stakeholders);
    setRows(result.rows);
    setErrors(result.errors);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (errors.length || !rows.length) return;
    const result = importAgreements(rows, user?.name ?? 'Authenticated user');
    toast({
      title: `${result.imported} agreement${result.imported === 1 ? '' : 's'} imported`,
      description: result.skipped
        ? `${result.skipped} duplicate row(s) were skipped.`
        : 'All validated records were migrated.',
      variant: result.imported ? 'success' : 'warning',
    });
    onOpenChange(false);
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent size="lg">
        <form onSubmit={submit}>
          <ModalHeader>
            <ModalTitle>Import legacy agreements</ModalTitle>
            <ModalDescription>
              Validate CSV or Excel data before migrating it into S082.
            </ModalDescription>
          </ModalHeader>
          <ModalBody className="space-y-4">
            <Notice variant="info" title="Controlled migration" leftBorder>
              Stakeholders must already exist in S081. Duplicate references and duplicate
              stakeholder/title pairs are skipped during import.
            </Notice>
            <Button type="button" variant="outline" onClick={downloadMigrationTemplate}>
              Download Excel template
            </Button>
            <Field invalid={Boolean(errors.length)}>
              <FieldLabel htmlFor="partnership-import">Migration file</FieldLabel>
              <FieldControl>
                <Input
                  id="partnership-import"
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={(event) => void parseFile(event)}
                />
              </FieldControl>
              <FieldDescription>{fileName || 'Accepted formats: CSV, XLSX, XLS.'}</FieldDescription>
              {errors.length ? (
                <FieldError>
                  <ul className="space-y-1">
                    {errors.slice(0, 5).map((message) => (
                      <li key={message}>{message}</li>
                    ))}
                    {errors.length > 5 ? <li>and {errors.length - 5} more.</li> : null}
                  </ul>
                </FieldError>
              ) : null}
            </Field>
            {rows.length && !errors.length ? (
              <Notice variant="success" title="File validated" leftBorder>
                {rows.length} agreement row(s) are ready to import.
              </Notice>
            ) : null}
          </ModalBody>
          <ModalFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!rows.length || Boolean(errors.length)}>
              Import {rows.length || ''} records
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}
