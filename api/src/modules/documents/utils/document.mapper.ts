import { Prisma } from 'generated/prisma';
import { fullName } from '@/modules/activity/activity.service';

export const DOCUMENT_INCLUDE = {
  uploaded_by_user: { select: { first_name: true, last_name: true, email: true } },
  uploaded_by_client_user: { select: { email: true, client: { select: { first_name: true, last_name: true } } } },
  reviewed_by: { select: { first_name: true, last_name: true, email: true } },
} satisfies Prisma.DocumentInclude;

type DocumentWithPeople = Prisma.DocumentGetPayload<{ include: typeof DOCUMENT_INCLUDE }>;

export function mapDocument(doc: DocumentWithPeople) {
  return {
    id: doc.id,
    title: doc.title,
    original_filename: doc.original_filename,
    mime_type: doc.mime_type,
    file_format: doc.file_format,
    size_bytes: doc.size_bytes,
    source: doc.source,
    client_id: doc.client_id,
    assignment_id: doc.assignment_id,
    assignment_requirement_id: doc.assignment_requirement_id,
    uploaded_at: doc.uploaded_at,
    uploaded_by_name: doc.uploaded_by_user
      ? fullName(doc.uploaded_by_user) || doc.uploaded_by_user.email
      : doc.uploaded_by_client_user
        ? fullName(doc.uploaded_by_client_user.client) || doc.uploaded_by_client_user.email
        : doc.source === 'PUBLIC_PORTAL'
          ? 'Public portal'
          : 'System',
    uploaded_by_type: doc.uploaded_by_user_id ? 'employee' : doc.uploaded_by_client_user_id ? 'client' : 'system',
    expiration_date: doc.expiration_date ? doc.expiration_date.toISOString().slice(0, 10) : null,
    expiration_source: doc.expiration_source,
    review_status: doc.review_status,
    reviewed_by_name: doc.reviewed_by ? fullName(doc.reviewed_by) || doc.reviewed_by.email : null,
    reviewed_at: doc.reviewed_at,
    rejection_reason: doc.rejection_reason,
    superseded_at: doc.superseded_at,
    is_current: !doc.superseded_at && !doc.deleted_at,
    is_verified: doc.is_verified,
    notes: doc.notes,
    processed: (doc.metadata as any)?.processed === true,
    duplicate_of: (doc.metadata as any)?.duplicate_of ?? null,
    deleted_at: doc.deleted_at,
  };
}
