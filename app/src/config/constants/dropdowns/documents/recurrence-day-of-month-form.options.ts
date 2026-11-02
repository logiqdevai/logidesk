import i18n from "@/i18n";

/** Day of the month: "1"–"31" plus "last" (the last day, whatever the month length). */
export const RecurrenceDayOfMonthFormOptions: { id: string; label: string }[] = [
  ...Array.from({ length: 31 }, (_, i) => ({ id: String(i + 1), label: String(i + 1) })),
  {
    id: "last",
    get label() {
      return i18n.t("recurrence:lastDay");
    },
  },
];
