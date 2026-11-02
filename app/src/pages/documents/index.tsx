import { useState, type FC } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-elements";
import { RoleGate } from "@/components/access/role-gate";
import { PlatformAdminAccess } from "@/config/constants/access/workspace-access";
import { Routes } from "@/routes/routes";
import { useWorkspace } from "@/features/auth/hooks/use-auth";
import { Permissions } from "@/features/auth/interfaces/auth.interfaces";
import { DocumentsTable } from "@/pages/shared/components/documents-table";
import { UploadDialog } from "@/pages/shared/components/upload-dialog";

const DocumentsPage: FC = () => {
  const { t } = useTranslation("documents");
  const [params, setParams] = useSearchParams();
  const { can, isOwnerOrAdmin } = useWorkspace();
  const [uploadOpen, setUploadOpen] = useState(params.get("upload") === "1");
  const closeUpload = (o: boolean) => {
    setUploadOpen(o);
    if (!o && params.get("upload")) {
      params.delete("upload");
      setParams(params, { replace: true });
    }
  };
  return (
    <RoleGate {...PlatformAdminAccess} fallback={<Navigate to={Routes.dashboard} replace />}>
      <PageHeader
        title={t("page.title")}
        description={isOwnerOrAdmin ? t("page.descriptionAdmin") : t("page.descriptionEmployee")}
        actions={
          can(Permissions.DOCUMENTS_UPLOAD) && (
            <Button onClick={() => setUploadOpen(true)}>
              <Upload />
              {t("page.upload")}
            </Button>
          )
        }
      />
      <DocumentsTable initialStatus={params.get("status") ?? undefined} />
      <UploadDialog open={uploadOpen} onOpenChange={closeUpload} />
    </RoleGate>
  );
};

export default DocumentsPage;
