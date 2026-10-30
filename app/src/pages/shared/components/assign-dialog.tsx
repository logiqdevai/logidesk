import { useEffect, useState, type FC } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { FilterSelect } from "@/components/ui/filter-select";
import { useClients, useCreateAssignment, useForms } from "@/features/workspace/hooks/use-workspace-data";
import type { ReminderScheduleInput } from "@/features/forms/interfaces/forms.interfaces";
import { ScheduleEditor } from "./schedule-editor";
import { Routes } from "@/routes/routes";
import { pluralize } from "@/lib/format";

interface AssignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId?: string;
  clientName?: string;
  formId?: string;
}

/** Assign one or more published forms to a client (deadline + optional reminder override). */
export const AssignDialog: FC<AssignDialogProps> = ({ open, onOpenChange, clientId: fixedClient, clientName, formId }) => {
  const navigate = useNavigate();
  const [clientId, setClientId] = useState(fixedClient ?? "");
  const [selected, setSelected] = useState<string[]>(formId ? [formId] : []);
  const [deadline, setDeadline] = useState("");
  const [message, setMessage] = useState("");
  const [notify, setNotify] = useState(true);
  const [override, setOverride] = useState(false);
  const [schedule, setSchedule] = useState<ReminderScheduleInput>({ enabled: true, start_days_before: 7, interval_count: 3, interval_unit: "DAYS", send_time: "09:00" });
  const forms = useForms({ status: "PUBLISHED", limit: 200 });
  const clients = useClients({ limit: 200, status: "ACTIVE" });
  const assign = useCreateAssignment();

  useEffect(() => {
    if (open) {
      setClientId(fixedClient ?? "");
      setSelected(formId ? [formId] : []);
      setDeadline("");
      setMessage("");
      setNotify(true);
      setOverride(false);
    }
  }, [open, fixedClient, formId]);

  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const today = new Date().toISOString().slice(0, 10);

  const submit = () =>
    assign.mutate(
      { client_id: clientId, form_ids: selected, deadline: deadline || null, message: message || undefined, notify_client: notify, reminder: override ? schedule : undefined },
      {
        onSuccess: (rows) => {
          onOpenChange(false);
          if (!fixedClient) navigate(Routes.clients.tab(clientId, "forms"));
          else if (rows.length === 1) navigate(Routes.assignments.detail(rows[0].id));
        },
      },
    );

  return (
    <Dialog open={open} onOpenChange={(o) => !assign.isPending && onOpenChange(o)}>
      <DialogContent className="max-h-[92vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="display text-[26px] font-medium">Assign a form{clientName ? ` to ${clientName}` : ""}</DialogTitle>
          <DialogDescription>The client receives a notification and the forms appear in their portal.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          {!fixedClient && (
            <div className="field">
              <Label>Client</Label>
              {clients.isPending ? (
                <Skeleton className="h-10" />
              ) : (
                <FilterSelect
                  label="Client"
                  size="default"
                  className="w-full"
                  value={clientId}
                  placeholder="Select a client"
                  onChange={setClientId}
                  options={(clients.data?.data ?? []).map((c) => ({ id: c.id, label: `${c.first_name} ${c.last_name}${c.company ? ` · ${c.company}` : ""}` }))}
                />
              )}
            </div>
          )}
          <div className="field">
            <Label>Forms</Label>
            <div className="card max-h-60 overflow-y-auto">
              {forms.isPending ? (
                <Skeleton className="m-3 h-10" />
              ) : !forms.data?.data.length ? (
                <p className="muted p-4">No published forms yet. Publish a form in Forms &amp; Templates first.</p>
              ) : (
                forms.data.data.map((f) => (
                  <label key={f.id} className="list-row cursor-pointer !py-2.5">
                    <Checkbox checked={selected.includes(f.id)} onCheckedChange={() => toggle(f.id)} aria-label={f.name} />
                    <span className="grow">
                      <span className="cell-main block">{f.name}</span>
                      <span className="cell-sub">
                        {pluralize(f.document_count, "document")} · {pluralize(f.field_count - f.document_count, "question")}
                        {f.is_template ? " · Template" : ""}
                      </span>
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>
          <div className="form-grid">
            <div className="field">
              <Label htmlFor="assign-deadline">
                Submission deadline <span className="soft">(optional)</span>
              </Label>
              <Input id="assign-deadline" type="date" min={today} value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </div>
          </div>
          <div className="field">
            <Label htmlFor="assign-msg">
              Message to the client <span className="soft">(optional)</span>
            </Label>
            <Textarea id="assign-msg" rows={2} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Please upload these before our meeting next week." />
          </div>
          <label className="flex items-center justify-between gap-3">
            <span>
              <span className="label block">Notify the client now</span>
              <span className="caption">Sends the assignment email (and portal activation link if needed).</span>
            </span>
            <Switch checked={notify} onCheckedChange={setNotify} />
          </label>
          <label className="flex items-center justify-between gap-3">
            <span>
              <span className="label block">Custom reminder schedule</span>
              <span className="caption">Override the form and organization defaults for this assignment.</span>
            </span>
            <Switch checked={override} onCheckedChange={setOverride} />
          </label>
          {override && <ScheduleEditor value={schedule} onChange={setSchedule} />}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={assign.isPending}>
            Cancel
          </Button>
          <Button onClick={submit} loading={assign.isPending} disabled={!clientId || !selected.length}>
            Assign {selected.length > 1 ? `${selected.length} forms` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
