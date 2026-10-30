import { useState, type FC } from "react";
import { Link, useNavigate } from "react-router-dom";
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
import { formatDate, pluralize } from "@/lib/format";
import { useDebounced } from "@/hooks/use-debounced";
import { AssignDialog } from "@/pages/shared/components/assign-dialog";

const TABS = [
  { id: "forms", label: "Forms" },
  { id: "templates", label: "Templates" },
  { id: "archived", label: "Archived" },
];

const FormsPage: FC = () => {
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
        title="Forms & Templates"
        description="Reusable document collection forms. Editing a form never changes what existing clients were asked for."
        actions={
          manage && (
            <Button onClick={() => navigate(Routes.forms.new)}>
              <Plus />
              Create form
            </Button>
          )
        }
      />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="pills" role="tablist">
          {TABS.map((t) => (
            <button key={t.id} role="tab" aria-selected={tab === t.id} className={cn("pill-tab", tab === t.id && "active")} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
        <span className="grow" />
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input aria-label="Search forms" className="h-9 pl-9" placeholder="Search forms" value={search} onChange={(e) => setSearch(e.target.value)} />
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
            title={tab === "templates" ? "No templates" : tab === "archived" ? "No archived forms" : debounced ? "No forms match" : "No forms yet"}
            description={tab === "forms" && !debounced ? "Create a form, or start from one of your templates." : undefined}
            action={
              manage && tab === "forms" && !debounced ? (
                <>
                  <Button variant="outline" onClick={() => setTab("templates")}>
                    Browse templates
                  </Button>
                  <Button onClick={() => navigate(Routes.forms.new)}>
                    <Plus />
                    Create form
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
                      <Button size="icon" variant="ghost" className="-mr-2 -mt-1 h-8 w-8" aria-label={`Actions for ${f.name}`}>
                        <MoreHorizontal />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {manage && (
                        <DropdownMenuItem onSelect={() => navigate(Routes.forms.edit(f.id))}>
                          <Pencil className="h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onSelect={() => navigate(Routes.forms.submissions(f.id))}>
                        <Inbox className="h-4 w-4" />
                        Submissions
                      </DropdownMenuItem>
                      {manage && (
                        <>
                          <DropdownMenuItem onSelect={() => duplicate.mutate({ id: f.id })}>
                            <Copy className="h-4 w-4" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => duplicate.mutate({ id: f.id, name: `${f.name} (template)`, is_template: true })}>
                            <FileStack className="h-4 w-4" />
                            Save as template
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onSelect={() => (f.status === "ARCHIVED" ? archive.mutate({ id: f.id, archived: false }) : setArchiving(f))}>
                            {f.status === "ARCHIVED" ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                            {f.status === "ARCHIVED" ? "Restore" : "Archive"}
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <p className="muted line-clamp-2 min-h-[2.6em]">{f.description || "No description"}</p>
                <div className="flex flex-wrap gap-1.5">
                  <FormStatusBadge status={f.status} />
                  {f.is_template && <StatusBadge tone="coral">Template</StatusBadge>}
                  {f.is_public && <StatusBadge tone="invited">Public</StatusBadge>}
                </div>
                <p className="caption mt-auto pt-2">
                  {pluralize(f.field_count - f.document_count, "question")} · {pluralize(f.document_count, "document")} ·{" "}
                  <Link to={Routes.forms.submissions(f.id)} className="hover:underline">
                    {f.assignment_count} assigned
                  </Link>{" "}
                  · updated {formatDate(f.updated_at)}
                </p>
              </div>
              <div className="flex gap-2 border-t border-[var(--g-hairline-soft)] p-3">
                {f.is_template && manage ? (
                  <Button size="sm" className="grow" loading={duplicate.isPending && duplicate.variables?.id === f.id} onClick={() => startFromTemplate(f)}>
                    Use template
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" className="grow" disabled={f.status !== "PUBLISHED"} onClick={() => setAssignForm(f.id)}>
                    <Send />
                    Assign
                  </Button>
                )}
                <Button size="sm" variant="ghost" asChild>
                  <Link to={Routes.forms.submissions(f.id)}>Submissions</Link>
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
        title={`Archive “${archiving?.name}”?`}
        description="It can no longer be assigned. Existing assignments keep working and stay visible to clients."
        confirmText="Archive"
        isLoading={archive.isPending}
        onConfirm={() => archiving && archive.mutate({ id: archiving.id, archived: true }, { onSuccess: () => setArchiving(null) })}
      />
    </>
  );
};

export default FormsPage;
