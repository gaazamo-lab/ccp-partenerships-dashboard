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
  exportToCsv,
} from '@rfdtech/components';
import { Download } from 'lucide-react';

import type { StakeholderImportResult } from '@/features/stakeholders/types';

/**
 * What an import committed and, row by row, what it held back. Duplicates and
 * A-02 boundary rejections are listed with the spreadsheet row so the user can
 * fix the file and re-import only what was skipped.
 */
export function ImportReviewModal({
  open,
  onOpenChange,
  result,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: StakeholderImportResult;
}) {
  const skipped = result.skipped;
  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent size="xl">
        <ModalHeader>
          <ModalTitle>Import review</ModalTitle>
          <ModalDescription>
            {result.created} stakeholder{result.created === 1 ? '' : 's'} created ·{' '}
            {skipped.length} row{skipped.length === 1 ? '' : 's'} skipped
            {result.duplicates > 0 ? ` (${result.duplicates} duplicate${result.duplicates === 1 ? '' : 's'})` : ''}
          </ModalDescription>
        </ModalHeader>
        <ModalBody className="space-y-4">
          {skipped.length === 0 ? (
            <Notice variant="success" title="Every row was imported" leftBorder>
              Duplicate and boundary checks found nothing to hold back.
            </Notice>
          ) : (
            <>
              <Notice variant="warning" title="Nothing below was committed" leftBorder>
                Correct these rows in your file and import them again, or open the matching
                stakeholder to update it instead.
              </Notice>
              <div className="max-h-96 overflow-auto rounded-xl border border-border">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-surface-subtle text-xs uppercase tracking-wide text-foreground-muted">
                    <tr>
                      <th scope="col" className="px-3 py-2 font-semibold">
                        Row
                      </th>
                      <th scope="col" className="px-3 py-2 font-semibold">
                        Organisation
                      </th>
                      <th scope="col" className="px-3 py-2 font-semibold">
                        Reason
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {skipped.map((row) => (
                      <tr key={`${row.row}-${row.name}`}>
                        <td className="px-3 py-2 tabular-nums text-foreground-muted">{row.row}</td>
                        <td className="px-3 py-2 font-medium text-foreground">{row.name}</td>
                        <td className="px-3 py-2 text-foreground-muted">{row.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </ModalBody>
        <ModalFooter>
          {skipped.length > 0 ? (
            <Button
              variant="ghost"
              onClick={() =>
                exportToCsv(
                  skipped,
                  [
                    { header: 'Row', accessor: (row) => row.row },
                    { header: 'Organisation', accessor: (row) => row.name },
                    { header: 'Reason', accessor: (row) => row.reason },
                  ],
                  's081-import-skipped-rows.csv',
                )
              }
            >
              <Download size={16} aria-hidden /> Download skipped rows
            </Button>
          ) : null}
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
