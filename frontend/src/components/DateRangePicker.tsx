import { useState } from "react";
import { format, parseISO } from "date-fns";
import type { Matcher } from "react-day-picker";
import { Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DateRangePickerProps {
  start: string | null; // ISO date, e.g. "2020-01-01"
  end: string | null;
  onChange: (start: string | null, end: string | null) => void;
}

const toISO = (d: Date) => format(d, "yyyy-MM-dd");
const fromISO = (s: string | null) => (s ? parseISO(s) : undefined);
const label = (s: string | null) =>
  s ? format(parseISO(s), "MMM d, yyyy") : "Pick a date";

/**
 * A start/end date range as two popover calendars. Constraints are enforced via
 * react-day-picker's `disabled` matchers: end can't precede start, neither can
 * be in the future (yfinance has no data there). Values cross the boundary as
 * ISO date strings.
 */
export function DateRangePicker({
  start,
  end,
  onChange,
}: DateRangePickerProps) {
  const today = new Date();
  const startDate = fromISO(start);
  const endDate = fromISO(end);

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <DateField
        ariaLabel="Start date"
        value={start}
        text={label(start)}
        selected={startDate}
        disabled={{ after: endDate ?? today }}
        onSelect={(d) => onChange(d ? toISO(d) : null, end)}
      />
      <DateField
        ariaLabel="End date"
        value={end}
        text={label(end)}
        selected={endDate}
        disabled={
          startDate ? { before: startDate, after: today } : { after: today }
        }
        onSelect={(d) => onChange(start, d ? toISO(d) : null)}
      />
    </div>
  );
}

interface DateFieldProps {
  ariaLabel: string;
  value: string | null;
  text: string;
  selected: Date | undefined;
  disabled: Matcher;
  onSelect: (date: Date | undefined) => void;
}

function DateField({
  ariaLabel,
  value,
  text,
  selected,
  disabled,
  onSelect,
}: DateFieldProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          aria-label={ariaLabel}
          className="w-full justify-start font-normal sm:w-[180px]">
          <CalendarIcon className="text-muted-foreground" />
          <span className={value ? "" : "text-muted-foreground"}>{text}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={selected}
          // Spread conditionally: under exactOptionalPropertyTypes an explicit
          // `undefined` isn't assignable to defaultMonth (typed as Date).
          {...(selected ? { defaultMonth: selected } : {})}
          disabled={disabled}
          onSelect={(date) => {
            onSelect(date);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
