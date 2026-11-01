import { useEffect, useRef, useState, type FC, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { Command as CommandPrimitive } from "cmdk";
import { Command, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { FileText, Loader2, Search, SquarePen, UserRound, Users, ClipboardList } from "lucide-react";
import { Routes } from "@/routes/routes";
import { useDebounced } from "@/hooks/use-debounced";
import { useGlobalSearch } from "@/features/workspace/hooks/use-workspace-data";

const Group: FC<{ heading: string; children: ReactNode }> = ({ heading, children }) => (
  <CommandGroup heading={heading}>
    {children}
  </CommandGroup>
);

const Item: FC<{ value: string; icon: ReactNode; title: string; subtitle?: string | null; onSelect: () => void }> = ({ value, icon, title, subtitle, onSelect }) => (
  <CommandItem value={value} onSelect={onSelect} className="cursor-pointer gap-3 py-2">
    <span className="text-muted-foreground">{icon}</span>
    <span className="min-w-0 grow">
      <span className="block truncate font-medium">{title}</span>
      {subtitle && <span className="block truncate text-xs text-muted-foreground">{subtitle}</span>}
    </span>
  </CommandItem>
);

/** App bar search: clients, forms, assigned forms, documents and team members — by text or full UUID. */
export const GlobalSearch: FC = () => {
  const { t } = useTranslation("layout");
  const navigate = useNavigate();
  const location = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const query = useDebounced(value.trim(), 250);
  const { data, isFetching } = useGlobalSearch(query);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname, location.search]);

  // Cmd/Ctrl+K focuses the search.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const go = (to: string) => {
    setOpen(false);
    setValue("");
    inputRef.current?.blur();
    navigate(to);
  };

  const hasResults = !!data && data.query === query && [data.clients, data.forms, data.assignments, data.documents, data.members].some((g) => g.length > 0);
  const typed = value.trim();
  const showPanel = open && typed.length > 0;

  return (
    <Command
      ref={rootRef}
      shouldFilter={false}
      loop
      className="search !h-auto !overflow-visible !bg-transparent"
      role="search"
      onBlur={(e) => {
        if (!rootRef.current?.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <label className="sr-only" htmlFor="global-search">
        {t("business.searchLabel")}
      </label>
      <Search className="icon" />
      <CommandPrimitive.Input
        ref={inputRef}
        id="global-search"
        autoComplete="off"
        className="input flex h-9 w-full rounded-md border bg-[var(--g-surface-soft)] pl-9 pr-3 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
        placeholder={t("business.searchPlaceholder")}
        value={value}
        onValueChange={(v) => {
          setValue(v);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setOpen(false);
            inputRef.current?.blur();
          }
        }}
      />
      {showPanel && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md">
          <CommandList className="max-h-[420px] py-1">
            {typed.length < 2 ? (
              <div className="px-3 py-3 text-sm text-muted-foreground">{t("business.search.hint")}</div>
            ) : !hasResults ? (
              <div className="flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground">
                {isFetching || typed !== query ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("business.search.searching")}
                  </>
                ) : (
                  t("business.search.noResults", { query: typed })
                )}
              </div>
            ) : (
              <>
                {data!.by_id && <div className="px-3 py-1.5 text-xs text-muted-foreground">{t("business.search.idMatch")}</div>}
                {data!.clients.length > 0 && (
                  <Group heading={t("business.search.clients")}>
                    {data!.clients.map((c) => (
                      <Item key={c.id} value={`client-${c.id}`} icon={<Users className="h-4 w-4" />} title={c.name} subtitle={[c.company, c.email].filter(Boolean).join(" · ")} onSelect={() => go(Routes.clients.detail(c.id))} />
                    ))}
                  </Group>
                )}
                {data!.forms.length > 0 && (
                  <Group heading={t("business.search.forms")}>
                    {data!.forms.map((f) => (
                      <Item key={f.id} value={`form-${f.id}`} icon={<SquarePen className="h-4 w-4" />} title={f.name} subtitle={f.is_template ? t("business.search.template") : null} onSelect={() => go(Routes.forms.edit(f.id))} />
                    ))}
                  </Group>
                )}
                {data!.assignments.length > 0 && (
                  <Group heading={t("business.search.assignments")}>
                    {data!.assignments.map((a) => (
                      <Item key={a.id} value={`assignment-${a.id}`} icon={<ClipboardList className="h-4 w-4" />} title={a.form_name} subtitle={a.client.name} onSelect={() => go(Routes.assignments.detail(a.id))} />
                    ))}
                  </Group>
                )}
                {data!.documents.length > 0 && (
                  <Group heading={t("business.search.documents")}>
                    {data!.documents.map((d) => (
                      <Item
                        key={d.id}
                        value={`document-${d.id}`}
                        icon={<FileText className="h-4 w-4" />}
                        title={d.title}
                        subtitle={[d.client?.name, d.filename].filter(Boolean).join(" · ")}
                        onSelect={() => go(d.assignment_id ? Routes.assignments.detail(d.assignment_id) : d.client ? Routes.clients.detail(d.client.id) : Routes.documents)}
                      />
                    ))}
                  </Group>
                )}
                {data!.members.length > 0 && (
                  <Group heading={t("business.search.members")}>
                    {data!.members.map((m) => (
                      <Item key={m.member_id} value={`member-${m.member_id}`} icon={<UserRound className="h-4 w-4" />} title={m.name} subtitle={m.email} onSelect={() => go(Routes.team)} />
                    ))}
                  </Group>
                )}
              </>
            )}
          </CommandList>
        </div>
      )}
    </Command>
  );
};
