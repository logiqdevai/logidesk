import { useMutation } from "@tanstack/react-query";
import i18n from "@/i18n";
import { toast } from "@/hooks/use-toast";
import * as service from "../services/contact.services";

export function useSendContactMessage() {
  return useMutation({
    mutationFn: service.sendContactMessage,
    onError: (error: Error) => toast({ variant: "destructive", title: i18n.t("contact:errors.send"), description: error.message }),
  });
}
