import { useRef, useState, type FC } from "react";
import { Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { formatBytes } from "@/lib/format";

interface DropzoneProps {
  files: File[];
  onChange: (files: File[]) => void;
  accept?: string;
  maxFiles?: number;
  hint?: string;
  disabled?: boolean;
  compact?: boolean;
}

/** Drag-and-drop file picker (keyboard accessible). Validation happens on the server too. */
export const Dropzone: FC<DropzoneProps> = ({ files, onChange, accept, maxFiles = 1, hint, disabled, compact }) => {
  const { t } = useTranslation("ui");
  const input = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  const add = (list: FileList | null) => {
    if (!list) return;
    const next = maxFiles === 1 ? [list[0]] : [...files, ...Array.from(list)].slice(0, maxFiles);
    onChange(next.filter(Boolean));
  };

  return (
    <div className="flex flex-col gap-2">
      <div
        role="button"
        tabIndex={0}
        aria-disabled={disabled}
        className={cn("dropzone", drag && "drag", compact && "!p-4", disabled && "pointer-events-none opacity-60")}
        onClick={() => input.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          add(e.dataTransfer.files);
        }}
      >
        <Upload className="mx-auto mb-2 h-5 w-5" />
        <div>
          <strong>{maxFiles === 1 ? t("dropzone.dropOne") : t("dropzone.dropMany")}</strong> {t("dropzone.orBrowse")}
        </div>
        {hint && <div className="caption mt-2">{hint}</div>}
        <input
          ref={input}
          type="file"
          className="sr-only"
          accept={accept}
          multiple={maxFiles > 1}
          onChange={(e) => {
            add(e.target.files);
            e.target.value = "";
          }}
        />
      </div>
      {files.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`} className="file-chip justify-between">
              <span className="truncate">{f.name}</span>
              <span className="flex items-center gap-2">
                <span className="caption">{formatBytes(f.size)}</span>
                <button type="button" aria-label={t("dropzone.remove", { name: f.name })} className="text-muted-foreground hover:text-foreground" onClick={() => onChange(files.filter((_, j) => j !== i))}>
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

/** Maps format groups to the browser file-picker `accept` attribute. */
export function acceptFor(formats: string[]): string {
  const map: Record<string, string> = {
    PDF: ".pdf,application/pdf",
    IMAGE: ".jpg,.jpeg,.png,image/jpeg,image/png",
    WORD: ".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    EXCEL: ".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  };
  return formats.map((f) => map[f]).filter(Boolean).join(",");
}
