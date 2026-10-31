import { useState, type FC } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Archive, ArchiveRestore, Copy, FileStack, Inbox, MoreHorizontal, Pencil, Plus, Search, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import ConfirmationDialog from "@/components/ui/confirmation-dialog";
import { CardsSkeleton, EmptyState, PageHeader } from "@/components/ui/page-elements";
import { FormStatusBadge, StatusBadge } from "@/components/ui/status-badge";
import { useArchiveForm, useDuplicateForm, useForms } from "@/features/workspace/hooks/use-workspace-data";
import { useWorkspace } from "@/features/auth/hooks/use-auth";
import { Permissions } from "@/features/auth/interfaces/auth.interfaces";
import type { FormListItem } from "@/features/forms/interfaces/forms.interfaces";
import { Routes } from "@/routes/routes";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format";
import { useDebounced } from "@/hooks/use-debounced";
import { AssignDialog } from "@/pages/shared/components/assign-dialog";

const TABS = [
  { id: "forms", labelKey: "list.tabs.forms" },
  { id: "templates", labelKey: "list.tabs.templates" },
  { id: "archived", labelKey: "list.tabs.archived" },
] as const;

const FormsPage: FC = () => {
  const { t } = useTranslation("forms");
  const navigate = useNavigate();
  const { can } = useWorkspace();
  const [tab, setTab] = useState("forms");
  const [search, setSearch] = useState("");
  const debounced = useDebounced(search);
  const [assignForm, setAssignForm] = useState<string | null>(null);
  const [archiving, setArchiving] = useState<FormListItem | null>(null);
  const duplicate = useDuplicateForm();
  const archive = useArchiveForm();
  const forms = useForms({
    search: debounced,
    limit: 100,
    status: tab === "archived" ? "ARCHIVED" : "all",
    template: tab === "templates" ? "true" : tab === "forms" ? "false" : "all",
  });
  const manage = can(Permissions.FORMS_MANAGE);

  const startFromTemplate = (f: FormListItem) => duplicate.mutate({ id: f.id, name: f.name }, { onSuccess: (copy) => navigate(Routes.forms.edit(copy.id)) });

  return (
    <>
      <PageHeader
        title={t("list.title")}
        description={t("list.description")}
        actions={
          manage && (
            <Button onClick={() => navigate(Routes.forms.new)}>
              <Plus />
              {t("list.create")}
            </Button>
          )
        }
      />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="pills" role="tablist">
          {TABS.map((tabItem) => (
            <button key={tabItem.id} role="tab" aria-selected={tab === tabItem.id} className={cn("pill-tab", tab === tabItem.id && "active")} onClick={() => setTab(tabItem.id)}>
              {t(tabItem.labelKey)}
            </button>
          ))}
        </div>
        <span className="grow" />
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input aria-label={t("list.search")} className="h-9 pl-9" placeholder={t("list.search")} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {forms.isPending ? (
        <CardsSkeleton count={3} />
      ) : forms.isError ? (
        <div className="callout bad">{forms.error.message}</div>
      ) : !forms.data.data.length ? (
        <div className="card">
          <EmptyState
            icon={<FileStack className="h-5 w-5" />}
            title={tab === "templates" ? t("list.empty.templates") : tab === "archived" ? t("list.empty.archived") : debounced ? t("list.empty.noMatch") : t("list.empty.none")}
            description={tab === "forms" && !debounced ? t("list.empty.hint") : undefined}
            action={
              manage && tab === "forms" && !debounced ? (
                <>
                  <Button variant="outline" onClick={() => setTab("templates")}>
                    {t("list.browseTemplates")}
                  </Button>
                  <Button onClick={() => navigate(Routes.forms.new)}>
                    <Plus />
                    {t("list.create")}
                  </Button>
                </>
              ) : undefined
            }
          />
        </div>
      ) : (
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(300px,1fr))]">
          {forms.data.data.map((f) => (
            <article key={f.id} className="card flex flex-col">
              <div className="flex grow flex-col gap-2 p-5">
                <div className="flex items-start justify-between gap-2">
                  <Link to={manage ? Routes.forms.edit(f.id) : Routes.forms.submissions(f.id)} className="text-[16px] font-medium text-[var(--g-ink)] hover:underline">
                    {f.name}
                  </Link>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="ghost" className="-mr-2 -mt-1 h-8 w-8" aria-label={t("list.actionsFor", { name: f.name })}>
                        <MoreHorizontal />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {manage && (
                        <DropdownMenuItem onSelect={() => navigate(Routes.forms.edit(f.id))}>
                          <Pencil className="h-4 w-4" />
                          {t("list.edit")}
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onSelect={() => navigate(Routes.forms.submissions(f.id))}>
                        <Inbox className="h-4 w-4" />
                        {t("list.submissions")}
                      </DropdownMenuItem>
                      {manage && (
                        <>
                          <DropdownMenuItem onSelect={() => duplicate.mutate({ id: f.id })}>
                            <Copy className="h-4 w-4" />
                            {t("list.duplicate")}
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => duplicate.mutate({ id: f.id, name: t("list.templateName", { name: f.name }), is_template: true })}>
                            <FileStack className="h-4 w-4" />
                            {t("list.saveAsTemplate")}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onSelect={() => (f.status === "ARCHIVED" ? archive.mutate({ id: f.id, archived: false }) : setArchiving(f))}>
                            {f.status === "ARCHIVED" ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                            {f.status === "ARCHIVED" ? t("list.restore") : t("list.archive")}
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <p className="muted line-clamp-2 min-h-[2.6em]">{f.description || t("list.noDescription")}</p>
                <div className="flex flex-wrap gap-1.5">
                  <FormStatusBadge status={f.status} />
                  {f.is_template && <StatusBadge tone="coral">{t("list.badgeTemplate")}</StatusBadge>}
                  {f.is_public && <StatusBadge tone="invited">{t("list.badgePublic")}</StatusBadge>}
                </div>
                <p className="caption mt-auto pt-2">
                  {t("count.question", { count: f.field_count - f.document_count })} · {t("count.document", { count: f.document_count })} ·{" "}
                  <Link to={Routes.forms.submissions(f.id)} className="hover:underline">
                    {t("list.assigned", { count: f.assignment_count })}
                  </Link>{" "}
                  · {t("list.updated", { date: formatDate(f.updated_at) })}
                </p>
              </div>
              <div className="flex gap-2 border-t border-[var(--g-hairline-soft)] p-3">
                {f.is_template && manage ? (
                  <Button size="sm" className="grow" loading={duplicate.isPending && duplicate.variables?.id === f.id} onClick={() => startFromTemplate(f)}>
                    {t("list.useTemplate")}
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" className="grow" disabled={f.status !== "PUBLISHED"} onClick={() => setAssignForm(f.id)}>
                    <Send />
                    {t("list.assign")}
                  </Button>
                )}
                <Button size="sm" variant="ghost" asChild>
                  <Link to={Routes.forms.submissions(f.id)}>{t("list.submissions")}</Link>
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
      <AssignDialog open={!!assignForm} onOpenChange={(o) => !o && setAssignForm(null)} formId={assignForm ?? undefined} />
      <ConfirmationDialog
        isOpen={!!archiving}
        onClose={() => setArchiving(null)}
        title={t("list.archiveTitle", { name: archiving?.name ?? "" })}
        description={t("list.archiveDescription")}
        confirmText={t("list.archive")}
        isLoading={archive.isPending}
        onConfirm={() => archiving && archive.mutate({ id: archiving.id, archived: true }, { onSuccess: () => setArchiving(null) })}
      />
    </>
  );
};

export default FormsPage;
