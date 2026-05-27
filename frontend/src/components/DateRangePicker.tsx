import { Stack } from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs, { Dayjs } from "dayjs";

interface DateRangePickerProps {
  start: Dayjs | null;
  end: Dayjs | null;
  onChange: (start: Dayjs | null, end: Dayjs | null) => void;
}

/**
 * Two MUI X DatePickers wired as a range. Uses dayjs values internally
 * and exposes them to the parent; ISO-string conversion happens at the
 * API client boundary.
 *
 * Constraints:
 *   - end cannot be before start (enforced by picker minDate prop)
 *   - neither can be in the future (yfinance has no data there)
 */
export function DateRangePicker({
  start,
  end,
  onChange,
}: DateRangePickerProps) {
  const today = dayjs();

  return (
    <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
      <DatePicker
        label="Start date"
        value={start}
        onChange={(value) => onChange(value, end)}
        maxDate={end ?? today}
        slotProps={{ textField: { size: "small", fullWidth: true } }}
      />
      <DatePicker
        label="End date"
        value={end}
        onChange={(value) => onChange(start, value)}
        // Spread minDate only when a start exists; passing an explicit
        // `undefined` isn't allowed under exactOptionalPropertyTypes.
        {...(start ? { minDate: start } : {})}
        maxDate={today}
        slotProps={{ textField: { size: "small", fullWidth: true } }}
      />
    </Stack>
  );
}
