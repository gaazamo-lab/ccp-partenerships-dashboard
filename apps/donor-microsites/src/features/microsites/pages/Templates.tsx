import { useNavigate } from 'react-router';

import { Badge, Button, Card } from '@rfdtech/components';
import { LayoutTemplate, Plus } from 'lucide-react';

import { useAuth } from '@partner-crm/auth';
import { EmptyState, PageHeader } from '@partner-crm/ui';

import { ROUTES } from '@/constants/routes';
import { LoadGate } from '@/features/microsites/components/LoadGate';
import { TemplateCard } from '@/features/microsites/components/TemplateCard';
import { PERMISSION_REASONS, canMicrosite } from '@/features/microsites/permissions';
import { useMicrosites } from '@/features/microsites/state/useMicrosites';

export function Component() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { templates, sites } = useMicrosites();
  const canBuild = canMicrosite(user?.role, 'build');

  return (
    <section className="flex flex-col gap-body">
      <PageHeader
        title="Template library"
        // description="Approved starting points, one per microsite purpose. Brand styling is inherited from the S080 DAM."
        meta={<Badge variant="outline">System S091</Badge>}
      />

      <LoadGate>
        {templates.length === 0 ? (
          <Card bordered>
            <EmptyState
              message="No templates are available"
              hint="Templates are managed centrally. Ask a CRM administrator to publish the approved set."
              icon={<LayoutTemplate size={22} aria-hidden />}
            />
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {templates.map((template) => {
              const inUse = sites.filter((site) => site.templateId === template.id).length;
              return (
                <TemplateCard
                  key={template.id}
                  template={template}
                  footer={
                    <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
                      <span className="text-xs text-foreground-muted">
                        Used by {inUse} microsite{inUse === 1 ? '' : 's'}
                      </span>
                      <Button
                        size="sm"
                        disabled={!canBuild}
                        title={canBuild ? undefined : PERMISSION_REASONS.build}
                        onClick={() =>
                          void navigate(`${ROUTES.SITE_CREATE}?template=${encodeURIComponent(template.id)}`)
                        }
                      >
                        <Plus size={15} aria-hidden /> Use template
                      </Button>
                    </div>
                  }
                />
              );
            })}
          </div>
        )}
      </LoadGate>
    </section>
  );
}
