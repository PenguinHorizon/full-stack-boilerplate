import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Users } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { customersAdminApi, type CustomerListParams } from "@/shared/api/content";
import { queryKeys } from "@/shared/api/query";
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";
import { formatDate } from "@/shared/lib/format";
import {
  Badge,
  Card,
  DataTable,
  EmptyState,
  PageHeader,
  Pagination,
  Select,
  type Column,
  type SortState,
} from "@/shared/ui";
import type { AdminCustomerListItemResponse } from "@/shared/types/api.generated";
import { useCurrentOrganization } from "../../../access/access-context";
import { SearchInput } from "../../../components/AdminBits";

const PAGE_SIZE = 25;

type Filter = "all" | "accounts" | "guests" | "blocked";
const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: "all", label: "Everyone" },
  { value: "accounts", label: "With an account" },
  { value: "guests", label: "Guests" },
  { value: "blocked", label: "Blocked" },
];

function filterParams(filter: Filter): Pick<CustomerListParams, "status" | "hasAccount"> {
  if (filter === "accounts") return { hasAccount: "true" };
  if (filter === "guests") return { hasAccount: "false" };
  if (filter === "blocked") return { status: "blocked" };
  return {};
}

/** Everyone who has contacted you as a guest or signed up on the public website. */
export function CustomersPage() {
  const organization = useCurrentOrganization();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortState>({
    field: "createdAt",
    direction: "desc",
  });
  const q = useDebouncedValue(search.trim(), 300);
  const params: CustomerListParams = {
    q: q || undefined,
    page,
    pageSize: PAGE_SIZE,
    sort: `${sort.field}:${sort.direction}`,
    ...filterParams(filter),
  };
  const list = useQuery({
    queryKey: queryKeys.customerList(organization.id, params),
    queryFn: () => customersAdminApi.list(organization.id, params),
    placeholderData: keepPreviousData,
  });

  const columns: Column<AdminCustomerListItemResponse>[] = [
    {
      key: "name",
      header: "Customer",
      sortField: "name",
      cell: (customer) => (
        <div className="min-w-0">
          <Link
            to={`/admin/${organization.id}/customers/${customer.id}`}
            className="font-semibold text-ink hover:text-accent"
          >
            {customer.name}
          </Link>
          <p className="truncate text-xs text-ink-subtle">
            {customer.phone}
            {customer.email && ` · ${customer.email}`}
          </p>
        </div>
      ),
    },
    {
      key: "type",
      header: "Type",
      hideOnMobile: true,
      cell: (customer) => (
        <div className="flex flex-wrap gap-1">
          {customer.hasAccount ? (
            <Badge tone="accent">Account</Badge>
          ) : (
            <Badge tone="neutral">Guest</Badge>
          )}
          {customer.status === "blocked" && <Badge tone="danger">Blocked</Badge>}
        </div>
      ),
    },
    {
      key: "since",
      header: "Customer since",
      sortField: "createdAt",
      hideOnMobile: true,
      cell: (customer) =>
        formatDate(customer.createdAt, {
          dateStyle: "medium",
          timeZone: organization.timezone,
        }),
    },
    {
      key: "last",
      header: "Last sign-in",
      sortField: "lastLoginAt",
      hideOnMobile: true,
      cell: (customer) =>
        customer.lastLoginAt ? (
          formatDate(customer.lastLoginAt, {
            dateStyle: "medium",
            timeZone: organization.timezone,
          })
        ) : (
          <span className="text-ink-subtle">Never</span>
        ),
    },
  ];

  return (
    <>
      <title>{`Customers · ${organization.name} · Admin`}</title>
      <PageHeader
        title="Customers"
        description="Everyone who has made an account on your website."
        breadcrumbs={[
          { label: organization.name, to: `/admin/${organization.id}` },
          { label: "Customers" },
        ]}
      />
      <Card className="mb-4 flex flex-wrap items-center gap-3 p-3">
        <div className="min-w-0 flex-1">
          <SearchInput
            value={search}
            onChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            label="Search customers"
            placeholder="Name, phone or email"
          />
        </div>
        <div className="w-48">
          <Select
            aria-label="Show"
            value={filter}
            onValueChange={(value) => {
              setFilter(value as Filter);
              setPage(1);
            }}
            options={FILTERS}
          />
        </div>
      </Card>
      <DataTable
        caption="Customers"
        columns={columns}
        rows={list.data?.items}
        rowKey={(customer) => customer.id}
        loading={list.isPending || list.isFetching}
        error={list.error}
        onRetry={() => list.refetch()}
        sort={sort}
        onSortChange={(next) => {
          setSort(next);
          setPage(1);
        }}
        empty={
          <EmptyState
            icon={Users}
            title={q ? `No customers match “${q}”` : "No customers yet"}
            description={
              q ? undefined : "Customers appear here once they sign up on your website."
            }
          />
        }
        footer={
          list.data && (
            <Pagination
              page={page}
              pageSize={PAGE_SIZE}
              total={list.data.meta.total}
              onPageChange={setPage}
            />
          )
        }
      />
    </>
  );
}
