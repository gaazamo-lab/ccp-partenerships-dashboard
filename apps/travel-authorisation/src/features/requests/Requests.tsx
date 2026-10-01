import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';

import { Badge, Button } from '@rfdtech/components';
import { FilePlus2, Search } from 'lucide-react';

import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { ROUTES, requestRoute } from '@/constants/routes';
import { useOperationalRole } from '@/features/access/role-context';
import { usePermittedRequests } from '@/features/access/usePermittedRequests';
import { formatTimestamp } from '@/features/requests/format';
import { useRequests } from '@/features/requests/requests-context';

export function Component() {
  const requests = usePermittedRequests();
  const { loading } = useRequests();
  const { canCreate } = useOperationalRole();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [direction, setDirection] = useState('All');
  const [status, setStatus] = useState('All');
  const [owner, setOwner] = useState('All');
  const filtered = useMemo(
    () =>
      requests.filter((request) => {
        const matchesSearch =
          `${request.reference} ${request.traveller} ${request.destination} ${request.purpose}`
            .toLowerCase()
            .includes(search.toLowerCase());
        return (
          matchesSearch &&
          (direction === 'All' || request.direction === direction) &&
          (status === 'All' || request.status === status) &&
          (owner === 'All' || request.owner === owner)
        );
      }),
    [requests, search, direction, status, owner],
  );
  return (
    <section className="flex flex-col gap-body">
      <PageHeader
        title="Requests"
        // description="Visa support and official travel records, with ownership and next actions."
        meta={
          <Badge variant="outline">
            {loading && requests.length === 0 ? 'Loading…' : `${requests.length} records`}
          </Badge>
        }
        actions={
          <Button disabled={!canCreate} onClick={() => navigate(ROUTES.NEW_REQUEST)}>
            <FilePlus2 size={17} />
            New request
          </Button>
        }
      />
      <div className="rounded-xl border border-border-subtle bg-surface shadow-sm">
        <div className="flex flex-col gap-3 border-b border-border-subtle p-4 lg:flex-row lg:items-center">
          <label className="relative flex-1">
            <Search
              size={17}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted"
            />
            <input
              className="w-full rounded-[0.65rem] border border-border px-3.2 py-2.8 text-sm text-foreground placeholder:text-text-muted hover:border-[#b8c3cc] hover:bg-white focus:border-[#2f8fbd] focus:bg-white focus:shadow-[0_0_0_3px_rgba(7,108,163,0.12)] focus:outline-none transition-colors duration-150 pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search ID, traveller, destination or purpose"
              aria-label="Search requests"
            />
          </label>
          <select
            className="w-full rounded-[0.65rem] border border-border px-3.2 py-2.8 text-sm text-foreground placeholder:text-text-muted hover:border-[#b8c3cc] hover:bg-white focus:border-[#2f8fbd] focus:bg-white focus:shadow-[0_0_0_3px_rgba(7,108,163,0.12)] focus:outline-none transition-colors duration-150 lg:w-44"
            value={direction}
            onChange={(e) => setDirection(e.target.value)}
            aria-label="Filter by direction"
          >
            <option>All</option>
            <option>Inbound</option>
            <option>Outbound</option>
          </select>
          <select
            className="w-full rounded-[0.65rem] border border-border px-3.2 py-2.8 text-sm text-foreground placeholder:text-text-muted hover:border-[#b8c3cc] hover:bg-white focus:border-[#2f8fbd] focus:bg-white focus:shadow-[0_0_0_3px_rgba(7,108,163,0.12)] focus:outline-none transition-colors duration-150 lg:w-52"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            aria-label="Filter by status"
          >
            <option>All</option>
            {Array.from(new Set(requests.map((item) => item.status))).map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          <select
            className="w-full rounded-[0.65rem] border border-border px-3.2 py-2.8 text-sm text-foreground placeholder:text-text-muted hover:border-[#b8c3cc] hover:bg-white focus:border-[#2f8fbd] focus:bg-white focus:shadow-[0_0_0_3px_rgba(7,108,163,0.12)] focus:outline-none transition-colors duration-150 lg:w-52"
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
            aria-label="Filter by owner"
          >
            <option>All</option>
            {Array.from(new Set(requests.map((item) => item.owner))).map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead className="bg-surface-subtle text-xs uppercase tracking-wide text-foreground-muted">
              <tr>
                <th className="px-5 py-3">Request</th>
                <th className="px-5 py-3">Traveller</th>
                <th className="px-5 py-3">Journey</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Next action</th>
                <th className="px-5 py-3">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {filtered.map((request) => (
                <tr
                  key={request.id}
                  onClick={() => navigate(requestRoute(request.id))}
                  className="cursor-pointer hover:bg-surface-subtle"
                >
                  <td className="px-5 py-4">
                    <p className="font-semibold text-primary">{request.reference}</p>
                    <p className="mt-1 text-xs text-foreground-muted">{request.category}</p>
                  </td>
                  <td className="px-5 py-4 font-medium">{request.traveller}</td>
                  <td className="px-5 py-4">
                    <p>{request.destination}</p>
                    <p className="mt-1 text-xs text-foreground-muted">
                      {request.direction} · {request.startDate}
                    </p>
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge status={request.status} />
                  </td>
                  <td className="px-5 py-4 text-foreground-muted">{request.nextAction}</td>
                  <td className="px-5 py-4 text-foreground-muted">
                    {formatTimestamp(request.updatedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <p className="font-semibold">No requests match</p>
            <p className="mt-1 text-sm text-foreground-muted">
              Clear or adjust the search and filters.
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
