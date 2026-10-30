import { useState, type FC } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FilterSelect } from "@/components/ui/filter-select";
import { RejectReasonOptions } from "@/config/constants/dropdowns/documents/reject-reason.options";

interface RejectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentName: string;
  pending?: boolean;
  onConfirm: (reason: string) => void;
}

/** Reject with a reason (shown to the client, who is asked to upload a new copy). */
export const RejectDialog: FC<RejectDialogProps> = ({ open, onOpenChange, documentName, pending, onConfirm }) => {
  const [reason, setReason] = useState(RejectReasonOptions[0].id);
  const [message, setMessage] = useState("");
  const text = [reason === "other" ? "" : reason, message.trim()].filter(Boolean).join(". ");
  return (
    <Dialog open={open} onOpenChange={(o) => !pending && onOpenChange(o)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="display text-[26px] font-medium">Reject document</DialogTitle>
          <DialogDescription>The client is notified about “{documentName}” and asked to upload a new copy.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="field">
            <Label>Reason</Label>
            <FilterSelect label="Reason" size="default" className="w-full" value={reason} onChange={setReason} options={RejectReasonOptions} />
          </div>
          <div className="field">
            <Label htmlFor="reject-msg">
              Message to client <span className="soft">{reason === "other" ? "(required)" : "(optional)"}</span>
            </Label>
            <Textarea id="reject-msg" rows={4} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Please upload a clearer scan of the full page." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button variant="destructive" loading={pending} disabled={text.length < 3} onClick={() => onConfirm(text)}>
            Reject &amp; notify client
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
