import i18n from "@/i18n";

const TIMEZONE_DATA: [value: string, zone: "wet" | "cet" | "eet", city: string][] = [
    ["Europe/Dublin", "wet", "Dublin"],
    ["Europe/Lisbon", "wet", "Lisbon"],
    ["Europe/Paris", "cet", "Paris"],
    ["Europe/Berlin", "cet", "Berlin"],
    ["Europe/Rome", "cet", "Rome"],
    ["Europe/Madrid", "cet", "Madrid"],
    ["Europe/Amsterdam", "cet", "Amsterdam"],
    ["Europe/Stockholm", "cet", "Stockholm"],
    ["Europe/Vienna", "cet", "Vienna"],
    ["Europe/Prague", "cet", "Prague"],
    ["Europe/Warsaw", "cet", "Warsaw"],
    ["Europe/Brussels", "cet", "Brussels"],
    ["Europe/Zagreb", "cet", "Zagreb"],
    ["Europe/Copenhagen", "cet", "Copenhagen"],
    ["Europe/Budapest", "cet", "Budapest"],
    ["Europe/Luxembourg", "cet", "Luxembourg"],
    ["Europe/Malta", "cet", "Malta"],
    ["Europe/Bratislava", "cet", "Bratislava"],
    ["Europe/Ljubljana", "cet", "Ljubljana"],
    ["Europe/Sofia", "eet", "Sofia"],
    ["Asia/Nicosia", "eet", "Nicosia"],
    ["Europe/Tallinn", "eet", "Tallinn"],
    ["Europe/Helsinki", "eet", "Helsinki"],
    ["Europe/Athens", "eet", "Athens"],
    ["Europe/Riga", "eet", "Riga"],
    ["Europe/Vilnius", "eet", "Vilnius"],
    ["Europe/Bucharest", "eet", "Bucharest"],
];

/** `label` is resolved lazily so it follows the active UI language. */
export const TimezoneOptions = TIMEZONE_DATA.map(([value, zone, city]) => ({
    value,
    get label() {
        return i18n.t(`ui:timezone.${zone}`, { city });
    },
}));
