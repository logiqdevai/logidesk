import { useEffect, useState, type FC } from "react";
import { Mail } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { RequirementStatusBadge } from "@/components/ui/status-badge";
import { useReminderPreview, useSendReminder } from "@/features/workspace/hooks/use-workspace-data";
import { formatDate } from "@/lib/format";

interface ReminderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string | null;
  assignmentId?: string;
}

/** Manual reminder: recipient, outstanding documents, editable message preview and channel. */
export const ReminderDialog: FC<ReminderDialogProps> = ({ open, onOpenChange, clientId, assignmentId }) => {
  const preview = useReminderPreview(open && clientId ? { client_id: clientId, assignment_id: assignmentId } : null);
  const send = useSendReminder();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  useEffect(() => {
    if (preview.data) {
      setSubject(preview.data.subject);
      setBody(preview.data.body);
    }
  }, [preview.data]);

  const data = preview.data;
  return (
    <Dialog open={open} onOpenChange={(o) => !send.isPending && onOpenChange(o)}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="display text-[26px] font-medium">Send reminder</DialogTitle>
          <DialogDescription>Review the message before it is sent. Delivery happens in the background.</DialogDescription>
        </DialogHeader>
        {preview.isPending ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-12" />
            <Skeleton className="h-24" />
            <Skeleton className="h-40" />
          </div>
        ) : preview.isError ? (
          <p className="callout bad">{preview.error.message}</p>
        ) : data ? (
          <div className="flex flex-col gap-4">
            <dl className="kv">
              <dt>Recipient</dt>
              <dd>
                {data.recipient.name} {data.recipient.email ? <span className="muted">· {data.recipient.email}</span> : <span className="text-destructive">· no email address</span>}
              </dd>
              <dt>Channel</dt>
              <dd className="flex items-center gap-1.5">
                <Mail className="h-4 w-4" /> Email
              </dd>
            </dl>
            <div>
              <span className="label">Outstanding documents</span>
              {data.items.length ? (
                <ul className="card mt-2">
                  {data.items.map((i) => (
                    <li key={i.assignment_requirement_id} className="list-row !py-2.5">
                      <span className="grow">
                        <span className="cell-main block">{i.name}</span>
                        <span className="cell-sub">
                          {i.form_name}
                          {i.deadline ? ` · due ${formatDate(i.deadline)}` : ""}
                          {i.expiration_date ? ` · expired ${formatDate(i.expiration_date)}` : ""}
                        </span>
                      </span>
                      <RequirementStatusBadge status={i.status} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted mt-1">Nothing is outstanding — you can still send a custom message.</p>
              )}
            </div>
            <div className="field">
              <Label htmlFor="rem-subject">Subject</Label>
              <Input id="rem-subject" placeholder="Email subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>
            <div className="field">
              <Label htmlFor="rem-body">Message</Label>
              <Textarea id="rem-body" placeholder="Write your reminder message" rows={9} value={body} onChange={(e) => setBody(e.target.value)} />
            </div>
          </div>
        ) : null}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={send.isPending}>
            Cancel
          </Button>
          <Button
            loading={send.isPending}
            disabled={!data?.recipient.email || !body.trim()}
            onClick={() => clientId && send.mutate({ client_id: clientId, assignment_id: assignmentId, subject, body }, { onSuccess: () => onOpenChange(false) })}
          >
            Send reminder
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
