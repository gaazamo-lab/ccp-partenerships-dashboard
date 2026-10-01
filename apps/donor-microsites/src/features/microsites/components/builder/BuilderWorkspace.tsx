import { useMemo, useState } from 'react';

import { Tabs, TabsContent, TabsList, TabsTrigger, useToast } from '@rfdtech/components';

import { useAuth } from '@partner-crm/auth';
import type { Microsite, UpdateMicrositeInput } from '@partner-crm/types';

import { type FieldErrors, editBlocker, toPublicView, validateUpdate } from '@/features/microsites/domain';
import { fieldErrorsOf } from '@/features/microsites/errors';
import { PERMISSION_REASONS, canMicrosite } from '@/features/microsites/permissions';
import { useMicrosites } from '@/features/microsites/state/useMicrosites';

import { AccessTab } from './AccessTab';
import { AnalyticsTab } from './AnalyticsTab';
import { ContentTab } from './ContentTab';
import { PreviewTab } from './PreviewTab';
import { PublishTab } from './PublishTab';
import { ReviewTab } from './ReviewTab';

export type BuilderTab = 'content' | 'preview' | 'access' | 'review' | 'publish' | 'analytics';

function draftOf(site: Microsite): UpdateMicrositeInput {
  return {
    title: site.title,
    slug: site.slug,
    tagline: site.tagline,
    accentColor: site.accentColor,
    blocks: structuredClone(site.blocks),
  };
}

interface BuilderWorkspaceProps {
  site: Microsite;
  tab: BuilderTab;
  onTabChange: (tab: BuilderTab) => void;
}

/**
 * Holds the unsaved draft for one version of a site. The page keys it by
 * `id:version`, so a successful save (which bumps the version) starts a fresh
 * draft from the server's record.
 */
export function BuilderWorkspace({ site, tab, onTabChange }: BuilderWorkspaceProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { sites, reviews, update } = useMicrosites();
  const [draft, setDraft] = useState<UpdateMicrositeInput>(() => draftOf(site));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);

  const can = (permission: Parameters<typeof canMicrosite>[1]) => canMicrosite(user?.role, permission);
  const history = reviews[site.id] ?? [];
  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(draftOf(site)), [draft, site]);

  const contentLocked = !can('build') ? PERMISSION_REASONS.build : editBlocker(site.status);
  const accessLocked = !can('manage_access')
    ? PERMISSION_REASONS.manage_access
    : site.status === 'ARCHIVED'
      ? 'Archived microsites are read-only.'
      : null;

  const preview = useMemo(() => toPublicView({ ...site, ...draft }), [site, draft]);

  const save = async () => {
    const problems = validateUpdate(site.id, draft, sites);
    setErrors(problems);
    if (Object.keys(problems).length > 0) {
      toast({ title: 'Changes not saved', description: 'Fix the highlighted fields and blocks first.', variant: 'error' });
      return;
    }
    setSaving(true);
    try {
      const saved = await update(site.id, draft);
      toast({
        title: 'Changes saved',
        description:
          site.status === 'DRAFT'
            ? `Saved as version ${saved.version}.`
            : `Saved as version ${saved.version}; the microsite is back in draft and needs review again.`,
        variant: 'success',
      });
    } catch (reason) {
      setErrors(fieldErrorsOf(reason));
      setSaving(false);
    }
  };

  return (
    <Tabs value={tab} onValueChange={(value) => onTabChange(value as BuilderTab)} variant="line">
      <TabsList>
        <TabsTrigger value="content">Content{dirty ? ' •' : ''}</TabsTrigger>
        <TabsTrigger value="preview">Preview</TabsTrigger>
        <TabsTrigger value="access">Access</TabsTrigger>
        <TabsTrigger value="review">Review ({history.length})</TabsTrigger>
        <TabsTrigger value="publish">Publish</TabsTrigger>
        <TabsTrigger value="analytics">Analytics</TabsTrigger>
      </TabsList>

      <TabsContent value="content" className="pt-6">
        <ContentTab
          draft={draft}
          onDraftChange={setDraft}
          errors={errors}
          dirty={dirty}
          saving={saving}
          onSave={() => void save()}
          onDiscard={() => {
            setDraft(draftOf(site));
            setErrors({});
          }}
          lockedReason={contentLocked}
          approved={site.status === 'APPROVED'}
        />
      </TabsContent>
      <TabsContent value="preview" className="pt-6">
        <PreviewTab site={preview} dirty={dirty} />
      </TabsContent>
      <TabsContent value="access" className="pt-6">
        <AccessTab site={site} lockedReason={accessLocked} />
      </TabsContent>
      <TabsContent value="review" className="pt-6">
        <ReviewTab site={site} history={history} canSubmit={can('submit')} canReview={can('review')} dirty={dirty} />
      </TabsContent>
      <TabsContent value="publish" className="pt-6">
        <PublishTab site={site} canPublish={can('publish')} canArchive={can('archive')} />
      </TabsContent>
      <TabsContent value="analytics" className="pt-6">
        <AnalyticsTab site={site} canExport={can('export')} />
      </TabsContent>
    </Tabs>
  );
}
