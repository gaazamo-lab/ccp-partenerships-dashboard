import { useEffect, useState } from 'react';

import { Badge, Button, Card, CardHeader, CardTitle, Notice } from '@rfdtech/components';
import type { BadgeVariant } from '@rfdtech/components';
import { RefreshCw } from 'lucide-react';

import type { PartnershipIntegrationHealth } from '@partner-crm/types';

import { integrationHealthRepository } from '@/features/partnerships/data/repository';

const variants: Record<PartnershipIntegrationHealth['state'], BadgeVariant> = {
  CONTRACT_READY: 'success',
  REFERENCE_ONLY: 'primary',
  MOCKED: 'warning',
  PENDING: 'outline',
};

function errorMessage(cause: unknown) {
  return cause instanceof Error && cause.message
    ? cause.message
    : 'The integration readiness service could not be reached.';
}

export function IntegrationReadinessCard() {
  const [integrations, setIntegrations] = useState<PartnershipIntegrationHealth[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = () => {
    setLoading(true);
    setError(null);
    void integrationHealthRepository
      .listIntegrationHealth()
      .then((response) => setIntegrations(response.data))
      .catch((cause: unknown) => setError(errorMessage(cause)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    let active = true;
    void integrationHealthRepository
      .listIntegrationHealth()
      .then((response) => {
        if (active) setIntegrations(response.data);
      })
      .catch((cause: unknown) => {
        if (active) setError(errorMessage(cause));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <Card bordered>
      <CardHeader>
        <div>
          <CardTitle>System integration readiness</CardTitle>
          {/* <p className="mt-1 text-sm text-foreground-muted">
            Frontend contracts and remaining backend adapters
          </p> */}
        </div>
      </CardHeader>
      {error ? (
        <Notice variant="error" title="Integration readiness could not be loaded" leftBorder>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>{error}</span>
            <Button variant="outline" size="sm" disabled={loading} onClick={reload}>
              <RefreshCw size={14} aria-hidden /> Try again
            </Button>
          </div>
        </Notice>
      ) : null}
      <div className="divide-y divide-border-subtle">
        {loading && integrations.length === 0 ? (
          <p className="py-4 text-sm text-foreground-muted">Loading integration readiness…</p>
        ) : null}
        {!loading && !error && integrations.length === 0 ? (
          <p className="py-4 text-sm text-foreground-muted">
            No integration readiness records are available.
          </p>
        ) : null}
        {integrations.map((item) => (
          <div
            key={item.system}
            className="grid gap-2 py-4 sm:grid-cols-[5rem_minmax(10rem,0.6fr)_minmax(15rem,1fr)_8rem] sm:items-center"
          >
            <span className="font-mono text-sm font-bold text-primary">{item.system}</span>
            <span className="text-sm font-semibold text-foreground">{item.name}</span>
            <span className="text-sm text-foreground-muted">{item.detail}</span>
            <Badge variant={variants[item.state]}>{item.state.replaceAll('_', ' ')}</Badge>
          </div>
        ))}
      </div>
    </Card>
  );
}
