import { AssignmentStatus, RequirementStatus, ReviewStatus } from 'generated/prisma';

export interface RequirementStateInput {
  not_required_at: Date | null;
  document: {
    review_status: ReviewStatus;
    expiration_date: Date | null;
    deleted_at: Date | null;
    processed: boolean;
  } | null;
}

/**
 * Effective status of a requirement, derived from its latest relevant submission and that
 * submission's dates and review state. History is never overwritten — this is recomputed.
 */
export function deriveRequirementStatus(input: RequirementStateInput, today: Date): RequirementStatus {
  if (input.not_required_at) return RequirementStatus.NOT_REQUIRED;
  const doc = input.document;
  if (!doc || doc.deleted_at) return RequirementStatus.MISSING;
  if (doc.review_status === ReviewStatus.REJECTED) return RequirementStatus.REJECTED;
  if (doc.expiration_date && doc.expiration_date.getTime() < today.getTime()) return RequirementStatus.EXPIRED;
  if (doc.review_status === ReviewStatus.APPROVED) return RequirementStatus.APPROVED;
  return doc.processed ? RequirementStatus.UNDER_REVIEW : RequirementStatus.SUBMITTED;
}

export interface AssignmentStateInput {
  cancelled: boolean;
  deadline: Date | null;
  requirements: Array<{ status: RequirementStatus; is_required: boolean }>;
  response: { submitted: boolean; started: boolean };
  /** True when the pinned form version has required (non-file) questions. */
  needsResponse: boolean;
}

export function deriveAssignmentState(input: AssignmentStateInput, today: Date) {
  const active = input.requirements.filter((r) => r.status !== RequirementStatus.NOT_REQUIRED);
  const required = active.filter((r) => r.is_required);
  const count = (...statuses: RequirementStatus[]) => active.filter((r) => statuses.includes(r.status)).length;

  const total = active.length;
  const completed = count(RequirementStatus.APPROVED);
  const missing = count(RequirementStatus.MISSING, RequirementStatus.REJECTED);
  const expired = count(RequirementStatus.EXPIRED);
  const progress = total
    ? Math.round((completed / total) * 100)
    : input.response.submitted
      ? 100
      : 0;

  const responseOk = !input.needsResponse || input.response.submitted;
  const requiredApproved = required.every((r) => r.status === RequirementStatus.APPROVED);
  const complete =
    total > 0
      ? (required.length > 0 ? requiredApproved : completed === total || input.response.submitted) && responseOk
      : input.response.submitted;

  let status: AssignmentStatus;
  if (input.cancelled) status = AssignmentStatus.CANCELLED;
  else if (complete) status = AssignmentStatus.COMPLETE;
  else if (input.deadline && input.deadline.getTime() < today.getTime()) status = AssignmentStatus.OVERDUE;
  else if (
    count(RequirementStatus.UNDER_REVIEW, RequirementStatus.SUBMITTED) > 0 &&
    required.every((r) =>
      ([RequirementStatus.APPROVED, RequirementStatus.UNDER_REVIEW, RequirementStatus.SUBMITTED] as RequirementStatus[]).includes(r.status),
    ) &&
    responseOk
  )
    status = AssignmentStatus.UNDER_REVIEW;
  else if (
    input.response.started ||
    active.some((r) => r.status !== RequirementStatus.MISSING)
  )
    status = AssignmentStatus.IN_PROGRESS;
  else status = AssignmentStatus.NOT_STARTED;

  return {
    status,
    requirements_total: total,
    requirements_completed: completed,
    requirements_missing: missing,
    requirements_expired: expired,
    progress_percent: progress,
    complete,
  };
}

/** Requirement statuses that need action from the client (reminders target these). */
export const OPEN_REQUIREMENT_STATUSES: RequirementStatus[] = [
  RequirementStatus.MISSING,
  RequirementStatus.REJECTED,
  RequirementStatus.EXPIRED,
];
