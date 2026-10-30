import { useEffect, useState, type FC } from "react";
import { Link } from "react-router-dom";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { PasswordInput } from "@/components/ui/password-input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, FileIcon, SegmentedProgress, TableSkeleton } from "@/components/ui/page-elements";
import { AssignmentStatusBadge, RequirementStatusBadge } from "@/components/ui/status-badge";
import { usePortalDocuments, usePortalForms, usePortalMe, useUpdatePortalAccount, useUpdatePortalInformation } from "@/features/portal/hooks/use-portal";
import { useChangePassword, useMe, useUpdateProfile } from "@/features/auth/hooks/use-auth";
import { Routes } from "@/routes/routes";
import { formatBytes, formatDate } from "@/lib/format";
import { DownloadButton } from "@/pages/shared/components/document-preview";

export const PortalFormsPage: FC = () => {
  const forms = usePortalForms();
  return (
    <>
      <h1 className="mb-6">My forms</h1>
      {forms.isPending ? (
        <Skeleton className="h-40 rounded-xl" />
      ) : !forms.data?.length ? (
        <div className="card">
          <EmptyState title="No forms yet" description="Forms your provider shares with you appear here." />
        </div>
      ) : (
        <div className="card">
          {forms.data.map((f) => (
            <Link key={f.id} to={Routes.portal.form(f.id)} className="list-row hover:bg-[#f8f5ee]" style={{ color: "inherit" }}>
              <div className="grow min-w-0">
                <div className="cell-main">{f.title}</div>
                <div className="cell-sub">
                  Received {formatDate(f.assigned_at)}
                  {f.deadline ? ` · due ${formatDate(f.deadline)}` : ""} · {f.requirements_completed} of {f.requirements_total} documents complete
                </div>
                <SegmentedProgress className="mt-2 max-w-sm" total={f.requirements_total || 1} ok={f.requirements_completed} bad={f.requirements_expired} />
              </div>
              <AssignmentStatusBadge status={f.status} />
              <Button size="sm">Open</Button>
            </Link>
          ))}
        </div>
      )}
    </>
  );
};

export const PortalDocumentsPage: FC = () => {
  const docs = usePortalDocuments();
  return (
    <>
      <h1 className="mb-6">My documents</h1>
      <section className="card">
        {docs.isPending ? (
          <TableSkeleton rows={5} />
        ) : !docs.data?.length ? (
          <EmptyState icon={<FileText className="h-5 w-5" />} title="No documents yet" description="Documents you upload — or that we upload for you — appear here." />
        ) : (
          <div className="table-wrap">
            <Table className="table">
              <TableHeader>
                <TableRow>
                  <TableHead>Document</TableHead>
                  <TableHead>Form</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead className="actions" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {docs.data.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <FileIcon format={d.file_format} />
                        <div className="min-w-0">
                          <div className="cell-main truncate">{d.title}</div>
                          <div className="cell-sub truncate">
                            {d.original_filename} · {formatBytes(d.size_bytes)}
                          </div>
                          {d.rejection_reason && d.is_current && <div className="text-[12.5px] text-[var(--g-error-ink)]">{d.rejection_reason}</div>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{d.assignment_id ? <Link to={Routes.portal.form(d.assignment_id)}>{d.form_name}</Link> : "—"}</TableCell>
                    <TableCell>{d.status ? <RequirementStatusBadge status={d.status} /> : "—"}</TableCell>
                    <TableCell className="whitespace-nowrap">{formatDate(d.expiration_date)}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {formatDate(d.uploaded_at)}
                      <div className="cell-sub">{d.uploaded_by_type === "client" ? "by you" : d.uploaded_by_type === "employee" ? "by your provider" : "via the public form"}</div>
                    </TableCell>
                    <TableCell className="actions">
                      <DownloadButton documentId={d.id} portal />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </>
  );
};

export const PortalInformationPage: FC = () => {
  const me = usePortalMe();
  const update = useUpdatePortalInformation();
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  useEffect(() => {
    if (me.data) {
      setPhone(me.data.client.phone ?? "");
      setAddress(me.data.client.address ?? "");
    }
  }, [me.data]);
  if (!me.data) return <Skeleton className="h-80 rounded-xl" />;
  const c = me.data.client;
  const org = me.data.organization;
  return (
    <>
      <h1 className="mb-6">My information</h1>
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_320px]">
        <section className="card pad flex flex-col gap-4">
          <dl className="kv">
            <dt>Name</dt>
            <dd>
              {c.first_name} {c.last_name}
            </dd>
            <dt>Company</dt>
            <dd>{c.company ?? "—"}</dd>
            <dt>Email</dt>
            <dd>{c.email ?? "—"}</dd>
            <dt>Tax ID</dt>
            <dd>{c.tax_id ?? "—"}</dd>
          </dl>
          <div className="divider !my-0" />
          <div className="form-grid">
            <div className="field">
              <Label htmlFor="pi-phone">Phone</Label>
              <Input id="pi-phone" placeholder="e.g. +30 210 555 0142" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="field full">
              <Label htmlFor="pi-address">Address</Label>
              <Input id="pi-address" placeholder="Street, number, city, postal code" value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
          </div>
          <div>
            <Button loading={update.isPending} onClick={() => update.mutate({ phone: phone || null, address: address || null })}>
              Save
            </Button>
          </div>
          <p className="caption">To change your name, company, email or tax ID, contact {org.name}.</p>
        </section>
        <aside className="card pad">
          <h3>{org.name}</h3>
          <dl className="kv mt-3 !grid-cols-1">
            {org.contact_email && <dd>{org.contact_email}</dd>}
            {org.contact_phone && <dd>{org.contact_phone}</dd>}
            {!org.contact_email && !org.contact_phone && <dd className="muted">No contact details provided.</dd>}
          </dl>
        </aside>
      </div>
    </>
  );
};

export const PortalAccountPage: FC = () => {
  const me = usePortalMe();
  const account = useMe();
  const prefs = useUpdatePortalAccount();
  const profile = useUpdateProfile();
  const password = useChangePassword();
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  useEffect(() => {
    if (account.data) {
      setFirst(account.data.user.first_name ?? "");
      setLast(account.data.user.last_name ?? "");
    }
  }, [account.data]);
  if (!me.data) return <Skeleton className="h-80 rounded-xl" />;
  const a = me.data.account;
  return (
    <>
      <h1 className="mb-6">Account settings</h1>
      <div className="grid gap-4 lg:grid-cols-2 [&>section:first-child]:lg:col-span-2">
        <section className="card pad flex flex-col gap-4">
          <h3>Email notifications</h3>
          <label className="flex items-center justify-between gap-4">
            <span>
              <span className="label block">Reminders about missing or expiring documents</span>
              <span className="caption">Sent to {a.email}</span>
            </span>
            <Switch checked={a.notify_reminders} onCheckedChange={(v) => prefs.mutate({ notify_reminders: v })} aria-label="Reminder emails" />
          </label>
          <label className="flex items-center justify-between gap-4">
            <span className="label">Updates when a document is approved or rejected</span>
            <Switch checked={a.notify_review_updates} onCheckedChange={(v) => prefs.mutate({ notify_review_updates: v })} aria-label="Review update emails" />
          </label>
        </section>
        <section className="card pad flex flex-col gap-4">
          <h3>Your name</h3>
          <div className="form-grid">
            <div className="field">
              <Label htmlFor="pa-first">First name</Label>
              <Input id="pa-first" placeholder="First name" value={first} onChange={(e) => setFirst(e.target.value)} />
            </div>
            <div className="field">
              <Label htmlFor="pa-last">Last name</Label>
              <Input id="pa-last" placeholder="Last name" value={last} onChange={(e) => setLast(e.target.value)} />
            </div>
          </div>
          <div>
            <Button variant="outline" loading={profile.isPending} disabled={!first.trim() || !last.trim()} onClick={() => profile.mutate({ first_name: first.trim(), last_name: last.trim() })}>
              Save
            </Button>
          </div>
        </section>
        <section className="card pad flex flex-col gap-4">
          <h3>Password</h3>
          <div className="form-grid">
            <div className="field">
              <Label htmlFor="pa-cur">Current password</Label>
              <PasswordInput id="pa-cur" placeholder="Enter your current password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
            </div>
            <div className="field">
              <Label htmlFor="pa-new">New password</Label>
              <PasswordInput id="pa-new" placeholder="At least 8 characters" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
            </div>
          </div>
          <div>
            <Button
              variant="outline"
              loading={password.isPending}
              disabled={!current || next.length < 8}
              onClick={() =>
                password.mutate(
                  { current_password: current, new_password: next },
                  {
                    onSuccess: () => {
                      setCurrent("");
                      setNext("");
                    },
                  },
                )
              }
            >
              Change password
            </Button>
          </div>
        </section>
      </div>
    </>
  );
};
