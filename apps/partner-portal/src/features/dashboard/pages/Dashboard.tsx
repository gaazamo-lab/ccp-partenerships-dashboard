import {
  Card,
  CardHeader,
  CardTitle,
  Notice,
  SectionDescription,
  SectionHeader,
  SectionTitle,
} from '@rfdtech/components';

import { useAuth } from '@partner-crm/auth';

export function Component() {
  const { user } = useAuth();

  return (
    <section className="flex flex-col gap-body">
      <SectionHeader>
        <SectionTitle>Overview</SectionTitle>
        <SectionDescription>
          Welcome, {user?.name ?? 'partner user'}. The CRM foundation is ready for domain modules.
        </SectionDescription>
      </SectionHeader>

      <Notice variant="success" title="Workspace foundation is ready" leftBorder>
        Monorepo boundaries, first-party authentication, routing, shared providers, and the RFD
        application shell are connected.
      </Notice>

      <Card>
        <CardHeader>
          <CardTitle>Architecture baseline</CardTitle>
        </CardHeader>
        <ul className="grid gap-3 text-sm text-foreground-muted sm:grid-cols-2">
          <li>Feature modules remain app-local until another app needs them.</li>
          <li>Shared contracts and infrastructure live in versioned workspace packages.</li>
          <li>Production sessions use secure, HTTP-only cookies.</li>
          <li>All future interface work starts with RFD components and tokens.</li>
        </ul>
      </Card>
    </section>
  );
}
