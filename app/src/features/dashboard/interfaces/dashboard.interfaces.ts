export interface ActivityItem {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  description: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  actor_type: "USER" | "CLIENT_USER" | "SYSTEM";
  actor_name: string;
  client: { id: string; name: string; company: string | null } | null;
  assignment_id: string | null;
  document_id: string | null;
}

export interface DashboardOverview {
  stats: {
    total_clients: number;
    assigned_forms: number;
    awaiting_submission: number;
    awaiting_review: number;
    approved: number;
    rejected: number;
    expired: number;
    expiring_soon: number;
    overdue_submissions: number;
    inbox_needs_review: number;
  };
  progress: {
    requested: number;
    completed: number;
    missing: number;
    rejected: number;
    awaiting_review: number;
    expired: number;
    percent: number;
  };
  attention: Array<{
    client_id: string;
    name: string;
    company: string | null;
    email: string | null;
    missing: number;
    expired: number;
    expiring: number;
    overdue_forms: number;
    progress_percent: number;
  }>;
  recent_activity: ActivityItem[];
}
