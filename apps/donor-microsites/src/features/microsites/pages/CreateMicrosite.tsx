import { type FormEvent, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';

import { Badge, Button, Notice, useToast } from '@rfdtech/components';
import { Plus } from 'lucide-react';

import { useAuth } from '@partner-crm/auth';
import { FormGrid, PageHeader, SectionCard, TextField, TextareaField } from '@partner-crm/ui';

import { ROUTES, siteRoute } from '@/constants/routes';
import { LoadGate } from '@/features/microsites/components/LoadGate';
import { TemplateCard } from '@/features/microsites/components/TemplateCard';
import { type FieldErrors, SLUG_MAX, slugify, validateCreate } from '@/features/microsites/domain';
import { fieldErrorsOf } from '@/features/microsites/errors';
import { PERMISSION_REASONS, canMicrosite } from '@/features/microsites/permissions';
import { useMicrosites } from '@/features/microsites/state/useMicrosites';

interface Brief {
  title: string;
  slug: string;
  tagline: string;
  owner: string;
}

export function Component() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { toast } = useToast();
  const { user } = useAuth();
  const { templates, sites, create } = useMicrosites();
  const canBuild = canMicrosite(user?.role, 'build');

  const [templateId, setTemplateId] = useState(() => params.get('template') ?? '');
  const [brief, setBrief] = useState<Brief>(() => ({
    title: '',
    slug: '',
    tagline: '',
    owner: user?.name ?? '',
  }));
  const [slugEdited, setSlugEdited] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);

  const template = templates.find((item) => item.id === templateId);

  const setField = (field: keyof Brief, value: string) => {
    setBrief((current) => {
      const next = { ...current, [field]: value };
      // The slug follows the title until someone types their own.
      if (field === 'title' && !slugEdited) next.slug = slugify(value);
      return next;
    });
    setErrors((current) => {
      const next = { ...current };
      delete next[field];
      if (field === 'title' && !slugEdited) delete next.slug;
      return next;
    });
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!template) {
      setErrors({ templateId: 'Choose a template to start from.' });
      return;
    }
    const input = {
      title: brief.title.trim(),
      slug: brief.slug.trim(),
      tagline: brief.tagline.trim(),
      owner: brief.owner.trim(),
      purpose: template.purpose,
      templateId: template.id,
    };
    const problems = validateCreate(input, sites, templates);
    setErrors(problems);
    if (Object.keys(problems).length > 0) return;

    setSaving(true);
    try {
      const site = await create(input);
      toast({
        title: 'Microsite created',
        description: `${site.title} starts as a draft with ${site.blocks.length} blocks from “${template.name}”.`,
        variant: 'success',
      });
      void navigate(siteRoute(site.id));
    } catch (reason) {
      setErrors(fieldErrorsOf(reason));
      setSaving(false);
    }
  };

  return (
    <section className="flex flex-col gap-body">
      <PageHeader
        title="New microsite"
        // description="Pick a template, then write the brief. Content, review and publishing happen in the builder."
        backTo={{ to: ROUTES.SITES, label: 'Back to microsites' }}
        meta={<Badge variant="outline">System S091</Badge>}
      />

      {!canBuild ? (
        <Notice variant="warning" title="Building is restricted" leftBorder>
          {PERMISSION_REASONS.build} You can browse templates, but not create a microsite.
        </Notice>
      ) : null}

      <LoadGate>
        <SectionCard
          title="1. Choose a template" /* description="Each template seeds the blocks that suit its purpose. You can add, remove and reorder them later." */
        >
          {errors.templateId ? (
            <p className="mb-3 text-sm text-error" role="alert">
              {errors.templateId}
            </p>
          ) : null}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {templates.map((item) => (
              <TemplateCard
                key={item.id}
                template={item}
                selected={item.id === templateId}
                onSelect={() => {
                  setTemplateId(item.id);
                  setErrors(({ templateId: _template, ...rest }) => rest);
                }}
              />
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="2. Write the brief"
          // description={
          // template
          // ? `${PURPOSE_LABELS[template.purpose]} · starting from “${template.name}”.`
          // : 'Choose a template above first.'
          // }
        >
          <form onSubmit={(event) => void handleSubmit(event)} noValidate className="space-y-4">
            <FormGrid>
              <TextField
                label="Title"
                required
                value={brief.title}
                onChange={(value) => setField('title', value)}
                placeholder="2027 Annual Report"
                error={errors.title}
                disabled={!canBuild}
              />
              <TextField
                label="Slug"
                required
                value={brief.slug}
                onChange={(value) => {
                  setSlugEdited(true);
                  setField('slug', value);
                }}
                transform={(value) => value.toLowerCase().replace(/\s+/g, '-')}
                maxLength={SLUG_MAX}
                // description={`Public address: /sites/${brief.slug || 'your-slug'}`}
                error={errors.slug}
                disabled={!canBuild}
              />
              <TextField
                label="Owner"
                required
                value={brief.owner}
                onChange={(value) => setField('owner', value)}
                // description="The CCP staff member accountable for this microsite."
                error={errors.owner}
                disabled={!canBuild}
              />
            </FormGrid>
            <TextareaField
              label="Tagline"
              rows={2}
              value={brief.tagline}
              onChange={(value) => setField('tagline', value)}
              placeholder="One line on who this is for and what they will find."
              error={errors.tagline}
              disabled={!canBuild}
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => void navigate(ROUTES.SITES)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!canBuild || saving} loading={saving}>
                <Plus size={16} aria-hidden /> Create draft
              </Button>
            </div>
          </form>
        </SectionCard>
      </LoadGate>
    </section>
  );
}
