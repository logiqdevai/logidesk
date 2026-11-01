import { Injectable } from '@nestjs/common';
import { AssignmentStatus, FormResponseStatus, Prisma } from 'generated/prisma';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { DEFAULT_TIME_ZONE, dateOnly, localDateString } from '@/shared/utils/dates/dates.utils';
import { allFields, FormDefinition, isEmptyValue, isFieldVisible, VALUE_FIELD_TYPES } from '@/modules/forms/utils/form-definition.utils';
import { deriveAssignmentState, deriveRequirementStatus } from '../utils/status.utils';

type Db = PrismaService | Prisma.TransactionClient;

/** Recomputes cached requirement statuses and assignment progress from document state. */
@Injectable()
export class ProgressService {
  constructor(private readonly prisma: PrismaService) {}

  async today(organizationId: string, db: Db = this.prisma): Promise<Date> {
    const org = await db.organization.findUnique({ where: { id: organizationId }, select: { time_zone: true } });
    return dateOnly(localDateString(org?.time_zone ?? DEFAULT_TIME_ZONE));
  }

  /** Required, currently visible, non-file questions and how many of them are answered. */
  static requiredFieldProgress(definition: FormDefinition | null | undefined, answers: Record<string, unknown>) {
    const def = definition ?? { sections: [] };
    const required = allFields(def).filter(
      (f) => f.required && VALUE_FIELD_TYPES.includes(f.type) && isFieldVisible(f, answers, def),
    );
    return { total: required.length, answered: required.filter((f) => !isEmptyValue(answers[f.id])).length };
  }

  async recalcAssignment(assignmentId: string, db: Db = this.prisma) {
    const assignment = await db.formAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        requirements: {
          include: {
            document_requirement: { select: { is_required: true } },
            current_document: {
              select: { review_status: true, expiration_date: true, deleted_at: true, metadata: true },
            },
          },
        },
        response: { select: { status: true, last_saved_at: true, answers: { select: { field_key: true, value: true } } } },
        form_version: { select: { definition: true } },
      },
    });
    if (!assignment) return null;
    const today = await this.today(assignment.organization_id, db);

    const requirements = [];
    for (const ar of assignment.requirements) {
      const doc = ar.current_document;
      const status = deriveRequirementStatus(
        {
          not_required_at: ar.not_required_at,
          document: doc
            ? {
                review_status: doc.review_status,
                expiration_date: doc.expiration_date,
                deleted_at: doc.deleted_at,
                processed: (doc.metadata as any)?.processed === true,
              }
            : null,
        },
        today,
      );
      if (status !== ar.status) {
        await db.assignmentRequirement.update({ where: { id: ar.id }, data: { status } });
      }
      requirements.push({ status, is_required: ar.document_requirement.is_required });
    }

    const definition = assignment.form_version.definition as unknown as FormDefinition;
    const needsResponse = allFields(definition ?? { sections: [] }).some(
      (f) => f.required && VALUE_FIELD_TYPES.includes(f.type),
    );
    const answerMap = Object.fromEntries((assignment.response?.answers ?? []).map((a) => [a.field_key, a.value]));
    const fields = ProgressService.requiredFieldProgress(definition, answerMap);
    const state = deriveAssignmentState(
      {
        cancelled: !!assignment.cancelled_at,
        deadline: assignment.deadline,
        requirements,
        response: {
          submitted: assignment.response?.status === FormResponseStatus.SUBMITTED,
          started: !!assignment.response?.last_saved_at,
        },
        needsResponse,
        fields,
      },
      today,
      new Date(),
    );

    const { complete, ...data } = state;
    await db.formAssignment.update({
      where: { id: assignment.id },
      data: {
        ...data,
        completed_at:
          state.status === AssignmentStatus.COMPLETE ? (assignment.completed_at ?? new Date()) : null,
      },
    });
    return { ...state, previous_status: assignment.status, complete };
  }
}
