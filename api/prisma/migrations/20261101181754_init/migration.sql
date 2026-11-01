-- AlterEnum
ALTER TYPE "InvitationType" ADD VALUE 'PLATFORM';

-- AlterTable
ALTER TABLE "invitations" ADD COLUMN     "account_role" "AuthRole",
ALTER COLUMN "organization_id" DROP NOT NULL;
