import { useEffect, useState, type FC } from "react";
import { useTranslation } from "react-i18next";
import readExcelFile from "read-excel-file/browser";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

type Cell = string | number | boolean | Date | null;
interface SheetView {
  sheet: string;
  data: Cell[][];
}

const MAX_ROWS = 500;
const MAX_COLS = 50;

const formatCell = (value: Cell): string => {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toLocaleDateString();
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  return String(value);
};

/** Read-only spreadsheet viewer: fetches the signed URL, parses the .xlsx in the browser and renders each sheet as a table. */
export const ExcelPreview: FC<{ url: string; height: number }> = ({ url, height }) => {
  const { t } = useTranslation("documents");
  const [sheets, setSheets] = useState<SheetView[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [active, setActive] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setSheets(null);
    setFailed(false);
    setActive(0);
    (async () => {
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(String(response.status));
        const parsed = (await readExcelFile(await response.blob())) as SheetView[];
        if (!cancelled) setSheets(parsed);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [url]);

  if (failed) {
    return <p className="py-10 text-center text-[var(--g-on-dark-soft)]">{t("preview.spreadsheetFailed")}</p>;
  }
  if (!sheets) return <Skeleton className="w-full rounded-md" style={{ height }} />;
  if (!sheets.length) return <p className="py-10 text-center text-[var(--g-on-dark-soft)]">{t("preview.spreadsheetEmpty")}</p>;

  const current = sheets[Math.min(active, sheets.length - 1)];
  const rows = current.data.slice(0, MAX_ROWS);
  const columns = Math.min(MAX_COLS, rows.reduce((max, r) => Math.max(max, r.length), 0));
  const truncated = current.data.length > MAX_ROWS;

  return (
    <div className="overflow-hidden rounded-md bg-white text-[13px] text-foreground">
      {sheets.length > 1 && (
        <div className="flex gap-1 overflow-x-auto border-b bg-muted/40 p-1.5">
          {sheets.map((s, i) => (
            <Button key={`${s.sheet}-${i}`} size="sm" variant={i === active ? "default" : "ghost"} onClick={() => setActive(i)} className="h-7 shrink-0">
              {s.sheet}
            </Button>
          ))}
        </div>
      )}
      <div className="overflow-auto" style={{ maxHeight: height }}>
        <table className="w-max min-w-full border-collapse">
          <tbody>
            {rows.map((row, r) => (
              <tr key={r} className={r === 0 ? "sticky top-0 bg-muted font-medium" : "odd:bg-muted/20"}>
                <td className="sticky left-0 w-10 border-b border-r bg-muted px-2 py-1 text-right text-xs text-muted-foreground">{r + 1}</td>
                {Array.from({ length: columns }, (_, c) => (
                  <td key={c} className="max-w-[320px] truncate border-b border-r px-2 py-1 align-top">
                    {formatCell(row[c] ?? null)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {truncated && <p className="border-t px-3 py-1.5 text-xs text-muted-foreground">{t("preview.spreadsheetTruncated", { count: MAX_ROWS })}</p>}
    </div>
  );
};
