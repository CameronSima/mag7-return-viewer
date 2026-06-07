import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { cn } from "@/lib/utils";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

/**
 * Calendar built on react-day-picker (v10). Styled with Tailwind tokens to match
 * the rest of the UI; the base rdp stylesheet is intentionally not imported so
 * these classes are the single source of truth.
 */
export function Calendar({ className, classNames, ...props }: CalendarProps) {
  return (
    <DayPicker
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col gap-4",
        month: "flex flex-col gap-4",
        month_caption: "flex items-center justify-center h-9 relative",
        caption_label: "text-sm font-medium",
        nav: "flex items-center justify-between absolute inset-x-0 top-0 h-9 px-1",
        button_previous:
          "inline-flex items-center justify-center size-7 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground",
        button_next:
          "inline-flex items-center justify-center size-7 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground",
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday: "text-muted-foreground w-9 text-[0.7rem] font-normal",
        week: "flex w-full mt-1",
        day: "size-9 p-0 text-center text-sm",
        day_button:
          "inline-flex size-9 items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground aria-selected:opacity-100 transition-colors",
        selected:
          "[&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:hover:bg-primary/90",
        today: "[&>button]:border [&>button]:border-primary/50",
        outside: "text-muted-foreground/40",
        disabled: "text-muted-foreground/30 [&>button]:pointer-events-none",
        range_start:
          "[&>button]:bg-primary [&>button]:text-primary-foreground rounded-l-md bg-accent",
        range_end:
          "[&>button]:bg-primary [&>button]:text-primary-foreground rounded-r-md bg-accent",
        range_middle: "bg-accent [&>button]:rounded-none",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) =>
          orientation === "left" ? (
            <ChevronLeft className="size-4" />
          ) : (
            <ChevronRight className="size-4" />
          ),
      }}
      {...props}
    />
  );
}
