import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ban, CalendarDays, CheckCircle2, LogIn, Mail, Phone } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { useParams } from "react-router-dom";
import { customersAdminApi } from "@/shared/api/content";
import { errorMessage } from "@/shared/api/errors";
import { queryKeys } from "@/shared/api/query";
import { formatDate } from "@/shared/lib/format";
import { blockSchema } from "@/shared/schemas/content";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  ErrorState,
  FormField,
  Modal,
  PageHeader,
  Skeleton,
  Textarea,
} from "@/shared/ui";
import type { AdminCustomerDetailResponse } from "@/shared/types/api.generated";
import { useCan, useCurrentOrganization } from "../../../access/access-context";
import { StatTile } from "../../../components/AdminBits";

function BlockModal({
  customer,
  onClose,
  onSaved,
}: {
  customer: AdminCustomerDetailResponse;
  onClose: () => void;
  onSaved: (next: AdminCustomerDetailResponse) => void;
}) {
  const organization = useCurrentOrganization();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<{ reason: string }>({
    resolver: zodResolver(blockSchema),
    defaultValues: { reason: "" },
  });
  const submit = handleSubmit(async ({ reason }) => {
    try {
      const next = await customersAdminApi.update(organization.id, customer.id, {
        status: "blocked",
        blockedReason: reason.trim(),
      });
      toast.success(`${customer.name} is blocked`);
      onSaved(next);
      onClose();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  });
  return (
    <Modal
      open
      onOpenChange={(open) => !open && onClose()}
      title={`Block ${customer.name}?`}
      description="They are signed out and can't sign in until you unblock them. Their history stays."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" type="submit" form="block-form" loading={isSubmitting}>
            Block customer
          </Button>
        </>
      }
    >
      <form id="block-form" noValidate onSubmit={submit}>
        <FormField
          label="Reason"
          required
          error={errors.reason?.message}
          hint="Only staff see this."
        >
          {(field) => (
            <Textarea
              {...field}
              rows={3}
              {...register("reason")}
              placeholder="e.g. Repeated fake bookings"
            />
          )}
        </FormField>
      </form>
    </Modal>
  );
}

function NotesCard({
  customer,
  canManage,
  onSaved,
}: {
  customer: AdminCustomerDetailResponse;
  canManage: boolean;
  onSaved: (next: AdminCustomerDetailResponse) => void;
}) {
  const organization = useCurrentOrganization();
  const [notes, setNotes] = useState(customer.adminNotes ?? "");
  const dirty = notes.trim() !== (customer.adminNotes ?? "");
  const tooLong = notes.length > 2000;
  const save = useMutation({
    mutationFn: () =>
      customersAdminApi.update(organization.id, customer.id, {
        adminNotes: notes.trim() || null,
      }),
    onSuccess: (next) => {
      toast.success("Notes saved");
      onSaved(next);
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
  return (
    <Card>
      <CardHeader
        title="Staff notes"
        description="Preferences, special requests, anything the team should know."
      />
      <CardBody className="space-y-3">
        <FormField
          label="Notes"
          error={tooLong ? "Use at most 2000 characters" : undefined}
        >
          {(field) => (
            <Textarea
              {...field}
              rows={4}
              value={notes}
              disabled={!canManage}
              onChange={(event) => setNotes(event.target.value)}
            />
          )}
        </FormField>
        {canManage && (
          <div className="flex justify-end">
            <Button
              size="sm"
              disabled={!dirty || tooLong}
              loading={save.isPending}
              onClick={() => save.mutate()}
            >
              Save notes
            </Button>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function CustomerView({ customer }: { customer: AdminCustomerDetailResponse }) {
  const organization = useCurrentOrganization();
  const canManage = useCan("customer.manage");
  const queryClient = useQueryClient();
  const [blocking, setBlocking] = useState(false);
  const tz = organization.timezone;
  const setCustomer = (next: AdminCustomerDetailResponse) => {
    queryClient.setQueryData(queryKeys.adminCustomer(organization.id, next.id), next);
    void queryClient.invalidateQueries({
      queryKey: queryKeys.customers(organization.id),
    });
  };
  const unblock = useMutation({
    mutationFn: () =>
      customersAdminApi.update(organization.id, customer.id, { status: "active" }),
    onSuccess: (next) => {
      toast.success(`${customer.name} can sign in again`);
      setCustomer(next);
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
  const blocked = customer.status === "blocked";

  return (
    <>
      <title>{`${customer.name} · Customers · ${organization.name} · Admin`}</title>
      <PageHeader
        title={customer.name}
        description={
          <span className="flex flex-wrap items-center gap-2">
            {customer.hasAccount ? (
              <Badge tone="accent">Account</Badge>
            ) : (
              <Badge tone="neutral">Guest</Badge>
            )}
            {blocked && <Badge tone="danger">Blocked</Badge>}
            <span>
              First seen{" "}
              {formatDate(customer.createdAt, { dateStyle: "medium", timeZone: tz })}
            </span>
          </span>
        }
        breadcrumbs={[
          { label: organization.name, to: `/admin/${organization.id}` },
          { label: "Customers", to: `/admin/${organization.id}/customers` },
          { label: customer.name },
        ]}
        actions={
          canManage &&
          (blocked ? (
            <Button
              variant="secondary"
              icon={CheckCircle2}
              loading={unblock.isPending}
              onClick={() => unblock.mutate()}
            >
              Unblock
            </Button>
          ) : (
            <Button variant="ghost" icon={Ban} onClick={() => setBlocking(true)}>
              Block
            </Button>
          ))
        }
      />

      {blocked && (
        <div
          role="status"
          className="mb-6 rounded-card border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger"
        >
          <p className="font-semibold">Blocked: can't sign in.</p>
          {customer.blockedReason && (
            <p className="mt-0.5">Reason: {customer.blockedReason}</p>
          )}
        </div>
      )}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatTile
          label="Last sign-in"
          icon={LogIn}
          loading={false}
          value={
            customer.lastLoginAt
              ? formatDate(customer.lastLoginAt, { dateStyle: "medium", timeZone: tz })
              : "Never"
          }
        />
        <StatTile
          label="Customer since"
          icon={CalendarDays}
          loading={false}
          value={formatDate(customer.createdAt, { dateStyle: "medium", timeZone: tz })}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-6">
          <NotesCard
            key={customer.adminNotes ?? ""}
            customer={customer}
            canManage={canManage}
            onSaved={setCustomer}
          />
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Contact" />
            <CardBody className="space-y-2 text-sm">
              <a
                href={`tel:${customer.phone}`}
                className="flex items-center gap-2 text-ink hover:text-accent"
              >
                <Phone size={15} aria-hidden="true" /> {customer.phone}
              </a>
              {customer.email && (
                <a
                  href={`mailto:${customer.email}`}
                  className="flex items-center gap-2 break-all text-ink hover:text-accent"
                >
                  <Mail size={15} aria-hidden="true" /> {customer.email}
                </a>
              )}
              {customer.registeredAt && (
                <p className="text-xs text-ink-subtle">
                  Account since{" "}
                  {formatDate(customer.registeredAt, {
                    dateStyle: "medium",
                    timeZone: tz,
                  })}
                </p>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      {blocking && (
        <BlockModal
          customer={customer}
          onClose={() => setBlocking(false)}
          onSaved={setCustomer}
        />
      )}
    </>
  );
}

/** `/admin/:orgId/customers/:customerId`. */
export function CustomerDetailPage() {
  const organization = useCurrentOrganization();
  const id = Number(useParams().customerId);
  const customer = useQuery({
    queryKey: queryKeys.adminCustomer(organization.id, id),
    queryFn: () => customersAdminApi.detail(organization.id, id),
  });
  if (customer.isPending) return <Skeleton className="h-96 w-full" />;
  if (customer.isError) {
    return (
      <Card>
        <ErrorState error={customer.error} onRetry={() => customer.refetch()} />
      </Card>
    );
  }
  return <CustomerView customer={customer.data} />;
}
