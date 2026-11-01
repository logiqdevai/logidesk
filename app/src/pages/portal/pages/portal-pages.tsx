import { useEffect, useState, type FC } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { PasswordInput } from "@/components/ui/password-input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, FileIcon, SegmentedProgress, TableSkeleton } from "@/components/ui/page-elements";
import { AssignmentStatusBadge, RequirementStatusBadge } from "@/components/ui/status-badge";
import { usePortalDocuments, usePortalForms, usePortalMe } from "@/features/portal/hooks/use-portal";
import { useChangePassword, useMe, useUpdateProfile } from "@/features/auth/hooks/use-auth";
import { Routes } from "@/routes/routes";
import { formatBytes, formatDate, formatDeadline } from "@/lib/format";
import { DownloadButton } from "@/pages/shared/components/document-preview";

export const PortalFormsPage: FC = () => {
  const { t } = useTranslation("portal");
  const forms = usePortalForms();
  return (
    <>
      <h1 className="mb-6">{t("forms.title")}</h1>
      {forms.isPending ? (
        <Skeleton className="h-40 rounded-xl" />
      ) : !forms.data?.length ? (
        <div className="card">
          <EmptyState title={t("forms.emptyTitle")} description={t("forms.emptyDescription")} />
        </div>
      ) : (
        <div className="card">
          {forms.data.map((f) => (
            <Link key={f.id} to={Routes.portal.form(f.id)} className="list-row hover:bg-[#f8f5ee]" style={{ color: "inherit" }}>
              <div className="grow min-w-0">
                <div className="cell-main">{f.title}</div>
                <div className="cell-sub">
                  {t("forms.received", { date: formatDate(f.assigned_at) })}
                  {f.deadline ? t("forms.dueOn", { date: formatDeadline(f.deadline) }) : ""} · {t("forms.documentsComplete", { done: f.requirements_completed, total: f.requirements_total })}
                </div>
                <SegmentedProgress className="mt-2 max-w-sm" total={f.requirements_total || 1} ok={f.requirements_completed} bad={f.requirements_expired} />
              </div>
              <AssignmentStatusBadge status={f.status} />
              <Button size="sm">{t("forms.open")}</Button>
            </Link>
          ))}
        </div>
      )}
    </>
  );
};

export const PortalDocumentsPage: FC = () => {
  const { t } = useTranslation("portal");
  const docs = usePortalDocuments();
  return (
    <>
      <h1 className="mb-6">{t("documents.title")}</h1>
      <section className="card">
        {docs.isPending ? (
          <TableSkeleton rows={5} />
        ) : !docs.data?.length ? (
          <EmptyState icon={<FileText className="h-5 w-5" />} title={t("documents.emptyTitle")} description={t("documents.emptyDescription")} />
        ) : (
          <div className="table-wrap">
            <Table className="table">
              <TableHeader>
                <TableRow>
                  <TableHead>{t("documents.columns.document")}</TableHead>
                  <TableHead>{t("documents.columns.form")}</TableHead>
                  <TableHead>{t("documents.columns.status")}</TableHead>
                  <TableHead>{t("documents.columns.expires")}</TableHead>
                  <TableHead>{t("documents.columns.uploaded")}</TableHead>
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
                      <div className="cell-sub">{d.uploaded_by_type === "client" ? t("documents.byYou") : d.uploaded_by_type === "employee" ? t("documents.byProvider") : t("documents.viaPublicForm")}</div>
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

export const PortalAccountPage: FC = () => {
  const { t } = useTranslation("portal");
  const me = usePortalMe();
  const account = useMe();
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
  const u = account.data?.user;
  return (
    <>
      <h1 className="mb-6">{t("account.title")}</h1>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card pad flex flex-col gap-4">
          <h3>{t("account.yourName")}</h3>
          <dl className="kv">
            <dt>{t("information.email")}</dt>
            <dd>{u?.email ?? a.email}</dd>
            <dt>{t("information.phone")}</dt>
            <dd>{u?.phone ?? "—"}</dd>
          </dl>
          <div className="form-grid">
            <div className="field">
              <Label htmlFor="pa-first">{t("account.firstName")}</Label>
              <Input id="pa-first" placeholder={t("account.firstName")} value={first} onChange={(e) => setFirst(e.target.value)} />
            </div>
            <div className="field">
              <Label htmlFor="pa-last">{t("account.lastName")}</Label>
              <Input id="pa-last" placeholder={t("account.lastName")} value={last} onChange={(e) => setLast(e.target.value)} />
            </div>
          </div>
          <div>
            <Button variant="outline" loading={profile.isPending} disabled={!first.trim() || !last.trim()} onClick={() => profile.mutate({ first_name: first.trim(), last_name: last.trim() })}>
              {t("account.save")}
            </Button>
          </div>
        </section>
        <section className="card pad flex flex-col gap-4">
          <h3>{t("account.password")}</h3>
          <div className="flex flex-col gap-4">
            <div className="field">
              <Label htmlFor="pa-cur">{t("account.currentPassword")}</Label>
              <PasswordInput id="pa-cur" placeholder={t("account.currentPasswordPlaceholder")} autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
            </div>
            <div className="field">
              <Label htmlFor="pa-new">{t("account.newPassword")}</Label>
              <PasswordInput id="pa-new" placeholder={t("account.newPasswordPlaceholder")} autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
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
              {t("account.changePassword")}
            </Button>
          </div>
        </section>
        <section className="card pad flex flex-col gap-4 lg:col-span-2">
          <h3>{t("account.emailNotifications")}</h3>
          <p className="caption">{t("account.sentTo", { email: a.email })}</p>
          <ul className="muted list-disc space-y-1 pl-5">
            <li>{t("account.remindersLabel")}</li>
            <li>{t("account.reviewUpdatesLabel")}</li>
          </ul>
        </section>
      </div>
    </>
  );
};
