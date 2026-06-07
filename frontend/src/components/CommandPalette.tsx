import { format, subYears } from "date-fns";
import {
  ArrowLeftRight,
  CalendarRange,
  LayoutGrid,
  Link2,
  PieChart,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { PRESETS, RANGE_PRESETS } from "@/lib/presets";
import type { AppState } from "@/hooks/useUrlState";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  state: AppState;
  setState: (next: AppState) => void;
  onShare: () => void;
}

/**
 * ⌘K command palette — the keyboard-first way to drive the app: switch modes,
 * apply a ticker preset, set a date range, or copy the share link. Each command
 * runs its action and closes the palette.
 */
export function CommandPalette({
  open,
  onOpenChange,
  state,
  setState,
  onShare,
}: CommandPaletteProps) {
  const run = (action: () => void) => {
    action();
    onOpenChange(false);
  };

  const setRange = (years: number) =>
    setState({
      ...state,
      start: format(subYears(new Date(), years), "yyyy-MM-dd"),
      end: format(new Date(), "yyyy-MM-dd"),
    });

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Type a command or search…" />
      <CommandList>
        <CommandEmpty>No matching commands.</CommandEmpty>

        <CommandGroup heading="Mode">
          {state.mode === "portfolio" ? (
            <CommandItem
              onSelect={() => run(() => setState({ ...state, mode: "compare" }))}>
              <LayoutGrid />
              Switch to Compare
            </CommandItem>
          ) : (
            <CommandItem
              onSelect={() =>
                run(() => setState({ ...state, mode: "portfolio" }))
              }>
              <PieChart />
              Switch to Portfolio
            </CommandItem>
          )}
        </CommandGroup>

        <CommandGroup heading="Compare presets">
          {PRESETS.map((preset) => (
            <CommandItem
              key={preset.label}
              value={`preset ${preset.label} ${preset.tickers.join(" ")}`}
              onSelect={() =>
                run(() =>
                  setState({
                    ...state,
                    mode: "compare",
                    tickers: preset.tickers,
                  }),
                )
              }>
              <ArrowLeftRight />
              {preset.label}
              <span className="ml-auto text-xs text-muted-foreground">
                {preset.tickers.length} tickers
              </span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandGroup heading="Date range">
          {RANGE_PRESETS.map((range) => (
            <CommandItem
              key={range.years}
              value={`range ${range.label}`}
              onSelect={() => run(() => setRange(range.years))}>
              <CalendarRange />
              {range.label}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandGroup heading="Actions">
          <CommandItem onSelect={() => run(onShare)}>
            <Link2 />
            Copy share link
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
