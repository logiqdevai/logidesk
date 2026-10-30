import { useState, type FC } from "react";
import { useSearchParams } from "react-router-dom";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-elements";
import { useWorkspace } from "@/features/auth/hooks/use-auth";
import { Permissions } from "@/features/auth/interfaces/auth.interfaces";
import { DocumentsTable } from "@/pages/shared/components/documents-table";
import { UploadDialog } from "@/pages/shared/components/upload-dialog";

const DocumentsPage: FC = () => {
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
    <>
      <PageHeader
        title="Documents"
        description={isOwnerOrAdmin ? "Every requested document across your clients, with its current file and status." : "Documents of the clients you are assigned to."}
        actions={
          can(Permissions.DOCUMENTS_UPLOAD) && (
            <Button onClick={() => setUploadOpen(true)}>
              <Upload />
              Upload a document
            </Button>
          )
        }
      />
      <DocumentsTable initialStatus={params.get("status") ?? undefined} />
      <UploadDialog open={uploadOpen} onOpenChange={closeUpload} />
    </>
  );
};

export default DocumentsPage;
