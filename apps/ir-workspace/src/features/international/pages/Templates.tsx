import { useMemo, useState } from 'react';

import { Badge, Button } from '@rfdtech/components';
import { FilePlus2, FileText, History } from 'lucide-react';

import type { IrLanguage, IrLetterTemplate } from '@partner-crm/types';
import { EmptyState, PageHeader, SectionCard, formatDate } from '@partner-crm/ui';

import { LoadNotice } from '../components/LoadNotice';
import { TemplateFormModal } from '../components/TemplateFormModal';
import { letterDirection } from '../domain';
import { LANGUAGE_LABEL } from '../labels';
import { DENIED_REASON, canIr } from '../permissions';
import { useIr } from '../state/useIr';

const LANGUAGES: IrLanguage[] = ['EN', 'FR', 'AR'];

interface TemplateFamily {
  key: string;
  active: IrLetterTemplate | undefined;
  versions: IrLetterTemplate[];
}

function families(templates: IrLetterTemplate[], language: IrLanguage): TemplateFamily[] {
  const map = new Map<string, IrLetterTemplate[]>();
  for (const template of templates.filter((item) => item.language === language)) {
    const key = template.name.trim().toLowerCase();
    map.set(key, [...(map.get(key) ?? []), template]);
  }
  return [...map.entries()].map(([key, versions]) => {
    const sorted = [...versions].sort((left, right) => right.version - left.version);
    return { key, versions: sorted, active: sorted.find((item) => item.active) };
  });
}

export function Component() {
  const { templates, role } = useIr();
  const [editing, setEditing] = useState<IrLetterTemplate | 'new' | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const canManage = canIr(role, 'template.manage');
  const grouped = useMemo(
    () => LANGUAGES.map((language) => ({ language, families: families(templates, language) })),
    [templates],
  );

  return (
    <section className="flex flex-col gap-body">
      <PageHeader
        title="Letter templates"
        // description="Approved English, French and Arabic templates. Each change is a new version; letters keep the version they were drafted from."
        meta={<Badge variant="outline">System S083</Badge>}
        actions={
          <Button
            disabled={!canManage}
            title={canManage ? undefined : DENIED_REASON['template.manage']}
            onClick={() => setEditing('new')}
          >
            <FilePlus2 size={17} aria-hidden /> New template
          </Button>
        }
      />
      <LoadNotice />

      {grouped.map(({ language, families: list }) => (
        <SectionCard
          key={language}
          title={LANGUAGE_LABEL[language]}
          // description={`${list.length} template${list.length === 1 ? '' : 's'}${language === 'AR' ? ' · rendered right-to-left' : ''}`}
        >
          {list.length === 0 ? (
            <EmptyState
              message={`No ${LANGUAGE_LABEL[language]} templates`}
              hint="Create one so officers can draft letters in this language."
              icon={<FileText size={22} aria-hidden />}
            />
          ) : (
            <ul className="space-y-3">
              {list.map((family) => {
                const current = family.active ?? family.versions[0]!;
                const open = expanded === `${language}-${family.key}`;
                return (
                  <li key={family.key} className="rounded-xl border border-border p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                      <div className="min-w-0 flex-1">
                        <p className="flex flex-wrap items-center gap-2 font-semibold text-foreground">
                          {current.name}
                          <Badge variant={family.active ? 'success' : 'outline'}>
                            v{current.version} {family.active ? 'active' : 'inactive'}
                          </Badge>
                        </p>
                        <p className="mt-1 text-xs text-foreground-muted">Updated {formatDate(current.updatedAt)}</p>
                        <p dir={letterDirection(language)} className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm text-foreground-muted">
                          {current.body}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setExpanded(open ? null : `${language}-${family.key}`)}
                        >
                          <History size={15} aria-hidden /> {family.versions.length} version
                          {family.versions.length === 1 ? '' : 's'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={!canManage || !family.active}
                          onClick={() => family.active && setEditing(family.active)}
                        >
                          Save new version
                        </Button>
                      </div>
                    </div>
                    {open ? (
                      <ol className="mt-4 space-y-2 border-t border-border pt-3">
                        {family.versions.map((version) => (
                          <li key={version.id} className="rounded-lg bg-surface-subtle p-3">
                            <p className="text-xs font-semibold text-foreground">
                              Version {version.version} · {version.active ? 'active' : 'superseded'} ·{' '}
                              {formatDate(version.updatedAt)}
                            </p>
                            <p dir={letterDirection(language)} className="mt-1 text-sm text-foreground">
                              {version.subject}
                            </p>
                          </li>
                        ))}
                      </ol>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </SectionCard>
      ))}

      {editing ? (
        <TemplateFormModal
          template={editing === 'new' ? undefined : editing}
          onOpenChange={(value) => !value && setEditing(null)}
        />
      ) : null}
    </section>
  );
}
