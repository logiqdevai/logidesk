import i18n from "@/i18n";
import { ClientImportFields, type ClientImportField } from "@/features/clients/interfaces/clients.interfaces";

/** Value of the "don't import this column" choice (Radix Select forbids an empty value). */
export const IMPORT_SKIP_COLUMN = "__skip__";

/** `label` resolves lazily so it follows the active language at render time. */
export const ClientImportFieldOptions: { id: ClientImportField; label: string }[] = ClientImportFields.map((id) => ({
  id,
  get label() {
    return i18n.t(`import.fields.${id}`, { ns: "clients" });
  },
}));
