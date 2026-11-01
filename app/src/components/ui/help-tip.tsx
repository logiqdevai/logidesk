import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { IconHelpCircle } from "@tabler/icons-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/** Small "?" shown under an input; the hover/focus tooltip explains what it means, with an example. Texts live in ui:help.<topic>. */
export const HelpTip: FC<{ topic: string; className?: string }> = ({ topic, className }) => {
  const { t } = useTranslation("ui");
  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button type="button" aria-label={t(`help.${topic}.what`)} className={cn("mt-1 inline-flex w-fit items-center gap-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded", className)}>
            <IconHelpCircle className="h-4 w-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="start" className="max-w-xs space-y-1 px-3 py-2 text-[12.5px] leading-snug">
          <p>{t(`help.${topic}.what`)}</p>
          <p className="opacity-80">{t(`help.${topic}.example`)}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
