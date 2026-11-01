import { HelpTip } from "@/components/ui/help-tip";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { instantToZoned } from "@/lib/format";
import { useEffect, useState, type FC } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import ConfirmationDialog from "@/components/ui/confirmation-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { useClients, useCreateAssignments, useForms, useOrgTimeZone } from "@/features/workspace/hooks/use-workspace-data";
import type { ReminderScheduleInput } from "@/features/forms/interfaces/forms.interfaces";
import { ScheduleEditor, useScheduleSeed } from "./schedule-editor";
import { Routes } from "@/routes/routes";

interface AssignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId?: string;
  clientName?: string;
  formId?: string;
}

/** Assign one or more published forms to a client (deadline + optional reminder override). */
export const AssignDialog: FC<AssignDialogProps> = ({ open, onOpenChange, clientId: fixedClient, clientName, formId }) => {
  const { t } = useTranslation("documents");
  const navigate = useNavigate();
  const [clientIds, setClientIds] = useState<string[]>(fixedClient ? [fixedClient] : []);
  const [clientSearch, setClientSearch] = useState("");
  const [selected, setSelected] = useState<string[]>(formId ? [formId] : []);
  const [deadline, setDeadline] = useState("");
  const [message, setMessage] = useState("");
  const [notify, setNotify] = useState(true);
  const [override, setOverride] = useState(false);
  const seedSchedule = useScheduleSeed({ overdueOff: true });
  const [schedule, setSchedule] = useState<ReminderScheduleInput>({});
  const [confirmClose, setConfirmClose] = useState(false);
  const forms = useForms({ status: "PUBLISHED", limit: 200 });
  const clients = useClients({ limit: 200, status: "ACTIVE" });
  const assign = useCreateAssignments();

  useEffect(() => {
    if (open) {
      setClientIds(fixedClient ? [fixedClient] : []);
      setClientSearch("");
      setSelected(formId ? [formId] : []);
      setDeadline("");
      setMessage("");
      setNotify(true);
      setOverride(false);
    }
  }, [open, fixedClient, formId]);

  const toggleClient = (id: string) => setClientIds((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const search = clientSearch.trim().toLowerCase();
  const visibleClients = (clients.data?.data ?? []).filter((c) => !search || `${c.first_name} ${c.last_name} ${c.company ?? ""} ${c.email ?? ""}`.toLowerCase().includes(search));
  const allVisibleSelected = visibleClients.length > 0 && visibleClients.every((c) => clientIds.includes(c.id));
  const toggleAllVisible = () =>
    setClientIds((s) => (allVisibleSelected ? s.filter((id) => !visibleClients.some((c) => c.id === id)) : [...new Set([...s, ...visibleClients.map((c) => c.id)])]));
  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const timeZone = useOrgTimeZone();
  const today = instantToZoned(new Date(), timeZone).date;

  const submit = () =>
    assign.mutate(
      { client_ids: clientIds, form_ids: selected, deadline: deadline || null, message: message || undefined, notify_client: notify, reminder: override ? schedule : undefined },
      {
        onSuccess: (rows) => {
          onOpenChange(false);
          if (!fixedClient) {
            if (clientIds.length === 1) navigate(Routes.clients.tab(clientIds[0], "forms"));
          } else if (rows.assignments.length === 1) navigate(Routes.assignments.detail(rows.assignments[0].id));
        },
      },
    );

  const requestClose = () => setConfirmClose(true);

  return (
    <>
    <ConfirmationDialog
      isOpen={confirmClose}
      onClose={() => setConfirmClose(false)}
      onConfirm={() => {
        setConfirmClose(false);
        onOpenChange(false);
      }}
      title={t("assign.closeConfirmTitle")}
      description={t("assign.closeConfirmDescription")}
      confirmText={t("assign.closeConfirm")}
      cancelText={t("assign.keepEditing")}
      variant="destructive"
    />
    <Dialog open={open} onOpenChange={(o) => !o && !assign.isPending && requestClose()}>
      <DialogContent className="max-h-[92vh] max-w-xl overflow-y-auto" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="display text-[26px] font-medium">{clientName ? t("assign.titleTo", { name: clientName }) : t("assign.title")}</DialogTitle>
          <DialogDescription>{t("assign.description")}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          {!fixedClient && (
            <div className="field">
              <div className="flex items-center justify-between gap-2">
                <Label>{t("assign.clients")}</Label>
                <span className="caption">{t("assign.clientsSelected", { count: clientIds.length })}</span>
              </div>
              {clients.isPending ? (
                <Skeleton className="h-10" />
              ) : (
                <div className="card">
                  <div className="flex items-center gap-2 border-b p-2">
                    <Input value={clientSearch} onChange={(e) => setClientSearch(e.target.value)} placeholder={t("assign.searchClients")} aria-label={t("assign.searchClients")} />
                    <Button type="button" variant="outline" size="sm" onClick={toggleAllVisible} disabled={!visibleClients.length}>
                      {allVisibleSelected ? t("assign.clearAll") : t("assign.selectAll")}
                    </Button>
                  </div>
                  <div className="max-h-52 overflow-y-auto">
                    {!visibleClients.length ? (
                      <p className="muted p-4">{t("assign.noClients")}</p>
                    ) : (
                      visibleClients.map((c) => (
                        <label key={c.id} className="list-row cursor-pointer !py-2.5">
                          <Checkbox checked={clientIds.includes(c.id)} onCheckedChange={() => toggleClient(c.id)} aria-label={`${c.first_name} ${c.last_name}`} />
                          <span className="grow">
                            <span className="cell-main block">
                              {c.first_name} {c.last_name}
                            </span>
                            {(c.company || c.email) && <span className="cell-sub">{[c.company, c.email].filter(Boolean).join(" · ")}</span>}
                          </span>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          <div className="field">
            <Label>{t("assign.forms")}</Label>
            <div className="card max-h-60 overflow-y-auto">
              {forms.isPending ? (
                <Skeleton className="m-3 h-10" />
              ) : !forms.data?.data.length ? (
                <p className="muted p-4">{t("assign.noPublishedForms")}</p>
              ) : (
                forms.data.data.map((f) => (
                  <label key={f.id} className="list-row cursor-pointer !py-2.5">
                    <Checkbox checked={selected.includes(f.id)} onCheckedChange={() => toggle(f.id)} aria-label={f.name} />
                    <span className="grow">
                      <span className="cell-main block">{f.name}</span>
                      <span className="cell-sub">
                        {t("count.document", { count: f.document_count })} · {t("count.question", { count: f.field_count - f.document_count })}
                        {f.is_template ? ` · ${t("assign.template")}` : ""}
                      </span>
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>
          <div className="form-grid">
            <div className="field">
              <div className="flex items-center gap-1.5">
                <Label htmlFor="assign-deadline">
                  {t("assign.deadline")} <span className="soft">({t("assign.optional")})</span>
                </Label>
                <HelpTip topic="deadline" />
              </div>
              <DateTimePicker id="assign-deadline" min={today} timeZone={timeZone} value={deadline} onChange={setDeadline} />
            </div>
          </div>
          <div className="field">
            <Label htmlFor="assign-msg">
              {t("assign.message")} <span className="soft">({t("assign.optional")})</span>
            </Label>
            <Textarea id="assign-msg" rows={2} value={message} onChange={(e) => setMessage(e.target.value)} placeholder={t("assign.messagePlaceholder")} />
          </div>
          <label className="flex items-center justify-between gap-3">
            <span>
              <span className="label block">{t("assign.notifyNow")}</span>
              <span className="caption">{t("assign.notifyHelp")}</span>
            </span>
            <Switch checked={notify} onCheckedChange={setNotify} />
          </label>
          <label className="flex items-center justify-between gap-3">
            <span>
              <span className="label block">{t("assign.customReminder")}</span>
              <span className="caption">{t("assign.customReminderHelp")}</span>
            </span>
            <Switch checked={override} onCheckedChange={(v) => (v && setSchedule(seedSchedule()), setOverride(v))} />
          </label>
          {override && <ScheduleEditor value={schedule} onChange={setSchedule} noDeadline={!deadline} />}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={requestClose} disabled={assign.isPending}>
            {t("common.cancel")}
          </Button>
          <Button onClick={submit} loading={assign.isPending} disabled={!clientIds.length || !selected.length}>
            {clientIds.length > 1 ? t("assign.submitClients", { count: clientIds.length }) : selected.length > 1 ? t("assign.submitMany", { count: selected.length }) : t("assign.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
};
