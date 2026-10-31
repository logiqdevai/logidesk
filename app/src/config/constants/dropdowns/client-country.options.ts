import type { Country } from "react-phone-number-input";
import i18n from "@/i18n";

const country = (value: Country): { label: string; value: Country } => ({
  value,
  get label() {
    return i18n.t(`countries.${value}`, { ns: "clients" });
  },
});

/** `label` resolves lazily so it follows the active language at render time. */
export const ClientCountryOptions: { label: string; value: Country }[] = [country("GR"), country("US"), country("GB"), country("DE"), country("FR"), country("IT")];

export const getClientCountryLabel = (code?: string | null) => ClientCountryOptions.find((o) => o.value === code)?.label ?? code ?? null;
