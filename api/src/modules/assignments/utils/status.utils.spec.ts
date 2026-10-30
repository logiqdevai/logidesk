import { AssignmentStatus, RequirementStatus, ReviewStatus } from 'generated/prisma';
import { deriveAssignmentState, deriveRequirementStatus } from './status.utils';

const today = new Date('2026-10-30T00:00:00Z');
const doc = (over: Partial<{ review_status: ReviewStatus; expiration_date: Date | null; processed: boolean }> = {}) => ({
  review_status: ReviewStatus.PENDING,
  expiration_date: null,
  deleted_at: null,
  processed: true,
  ...over,
});

describe('deriveRequirementStatus', () => {
  it('is MISSING without a document', () => {
    expect(deriveRequirementStatus({ not_required_at: null, document: null }, today)).toBe(RequirementStatus.MISSING);
  });
  it('is NOT_REQUIRED when waived, regardless of documents', () => {
    expect(deriveRequirementStatus({ not_required_at: new Date(), document: doc() }, today)).toBe(RequirementStatus.NOT_REQUIRED);
  });
  it('is SUBMITTED until processing finished, then UNDER_REVIEW', () => {
    expect(deriveRequirementStatus({ not_required_at: null, document: doc({ processed: false }) }, today)).toBe(RequirementStatus.SUBMITTED);
    expect(deriveRequirementStatus({ not_required_at: null, document: doc() }, today)).toBe(RequirementStatus.UNDER_REVIEW);
  });
  it('derives EXPIRED from dates without overwriting the review state', () => {
    const expired = doc({ review_status: ReviewStatus.APPROVED, expiration_date: new Date('2026-10-29T00:00:00Z') });
    expect(deriveRequirementStatus({ not_required_at: null, document: expired }, today)).toBe(RequirementStatus.EXPIRED);
    expect(expired.review_status).toBe(ReviewStatus.APPROVED);
  });
  it('stays APPROVED on the expiration day itself', () => {
    const d = doc({ review_status: ReviewStatus.APPROVED, expiration_date: today });
    expect(deriveRequirementStatus({ not_required_at: null, document: d }, today)).toBe(RequirementStatus.APPROVED);
  });
  it('REJECTED wins over expiration', () => {
    const d = doc({ review_status: ReviewStatus.REJECTED, expiration_date: new Date('2020-01-01') });
    expect(deriveRequirementStatus({ not_required_at: null, document: d }, today)).toBe(RequirementStatus.REJECTED);
  });
});

describe('deriveAssignmentState', () => {
  const base = { cancelled: false, deadline: null, response: { submitted: false, started: false }, needsResponse: false };

  it('reports 3 approved, 1 missing, 1 expired as two requirements needing attention', () => {
    const s = deriveAssignmentState(
      {
        ...base,
        requirements: [
          ...Array(3).fill({ status: RequirementStatus.APPROVED, is_required: true }),
          { status: RequirementStatus.MISSING, is_required: true },
          { status: RequirementStatus.EXPIRED, is_required: true },
        ],
      },
      today,
    );
    expect(s.requirements_total).toBe(5);
    expect(s.requirements_completed).toBe(3);
    expect(s.requirements_missing + s.requirements_expired).toBe(2);
    expect(s.progress_percent).toBe(60);
    expect(s.status).toBe(AssignmentStatus.IN_PROGRESS);
  });

  it('is COMPLETE when every required document is approved', () => {
    const s = deriveAssignmentState({ ...base, requirements: [{ status: RequirementStatus.APPROVED, is_required: true }, { status: RequirementStatus.MISSING, is_required: false }] }, today);
    expect(s.status).toBe(AssignmentStatus.COMPLETE);
  });

  it('needs the answers submitted when the form has required questions', () => {
    const reqs = [{ status: RequirementStatus.APPROVED, is_required: true }];
    expect(deriveAssignmentState({ ...base, needsResponse: true, requirements: reqs }, today).status).not.toBe(AssignmentStatus.COMPLETE);
    expect(deriveAssignmentState({ ...base, needsResponse: true, response: { submitted: true, started: true }, requirements: reqs }, today).status).toBe(AssignmentStatus.COMPLETE);
  });

  it('is OVERDUE after the deadline and UNDER_REVIEW when only reviews are pending', () => {
    const missing = [{ status: RequirementStatus.MISSING, is_required: true }];
    expect(deriveAssignmentState({ ...base, deadline: new Date('2026-10-01'), requirements: missing }, today).status).toBe(AssignmentStatus.OVERDUE);
    const review = [{ status: RequirementStatus.UNDER_REVIEW, is_required: true }];
    expect(deriveAssignmentState({ ...base, requirements: review }, today).status).toBe(AssignmentStatus.UNDER_REVIEW);
  });

  it('ignores NOT_REQUIRED requirements and honours cancellation', () => {
    const s = deriveAssignmentState({ ...base, requirements: [{ status: RequirementStatus.NOT_REQUIRED, is_required: true }, { status: RequirementStatus.APPROVED, is_required: true }] }, today);
    expect(s.requirements_total).toBe(1);
    expect(s.status).toBe(AssignmentStatus.COMPLETE);
    expect(deriveAssignmentState({ ...base, cancelled: true, requirements: [] }, today).status).toBe(AssignmentStatus.CANCELLED);
  });
});
