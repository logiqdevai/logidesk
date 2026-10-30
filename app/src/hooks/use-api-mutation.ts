import { useMutation, useQueryClient, type QueryKey } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";

interface Options<TData, TVars> {
  success?: string | ((data: TData, vars: TVars) => string | null);
  successDescription?: string | ((data: TData, vars: TVars) => string | undefined);
  error: string;
  /** Base query keys to invalidate after success. */
  invalidate?: QueryKey[];
  onSuccess?: (data: TData, vars: TVars) => void;
}

/** Mutation with the mandatory toast feedback and base-key invalidation. */
export function useApiMutation<TData, TVars = void>(fn: (vars: TVars) => Promise<TData>, options: Options<TData, TVars>) {
  const queryClient = useQueryClient();
  return useMutation<TData, Error, TVars>({
    mutationFn: fn,
    onSuccess: (data, vars) => {
      for (const key of options.invalidate ?? []) queryClient.invalidateQueries({ queryKey: key });
      const title = typeof options.success === "function" ? options.success(data, vars) : options.success;
      const description = typeof options.successDescription === "function" ? options.successDescription(data, vars) : options.successDescription;
      if (title) toast({ title, description });
      options.onSuccess?.(data, vars);
    },
    onError: (error) => toast({ variant: "destructive", title: options.error, description: error.message }),
  });
}

/** Query keys shared across features (base keys are invalidated after writes). */
export const QueryKeys = {
  dashboard: ["dashboard"],
  clients: ["clients"],
  assignments: ["assignments"],
  forms: ["forms"],
  documents: ["documents"],
  inbox: ["inbox"],
  inboxCounts: ["inbox-counts"],
  fileSpace: ["file-space"],
  notifications: ["notifications"],
  notificationSettings: ["notification-settings"],
  templates: ["notification-templates"],
  team: ["team"],
  organization: ["organization"],
  activity: ["activity"],
  portal: ["portal"],
} as const;

/** Everything that depends on document/assignment state. */
export const DOCUMENT_STATE_KEYS = [
  QueryKeys.dashboard,
  QueryKeys.clients,
  QueryKeys.assignments,
  QueryKeys.documents,
  QueryKeys.inbox,
  QueryKeys.inboxCounts,
  QueryKeys.fileSpace,
  QueryKeys.forms,
  QueryKeys.activity,
];
