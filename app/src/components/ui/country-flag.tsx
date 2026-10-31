import flags from "react-phone-number-input/flags";
import type { Country } from "react-phone-number-input";

/** SVG flag (from react-phone-number-input) so flags render on every OS, unlike emoji flags. */
export const CountryFlag = ({ country, title }: { country: Country; title?: string }) => {
  const Flag = flags[country];
  return <span className="flex h-4 w-6 shrink-0 overflow-hidden rounded-sm bg-foreground/20 [&_svg:not([class*='size-'])]:size-full">{Flag && <Flag title={title ?? country} />}</span>;
};
