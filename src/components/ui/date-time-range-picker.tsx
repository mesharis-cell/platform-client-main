"use client";

/**
 * DateTimeRangePicker — single popover that captures a same-day start/end
 * time range. Adapted from shadcn-date-time-picker, extended to a range.
 *
 * Intentional constraints:
 * - start + end live on a SINGLE date (no multi-day windows)
 * - bounded hour/minute columns (scrolls have top + bottom; no wheel loop)
 * - 12h format with AM/PM
 * - minutes in 5-min steps
 * - empty state = no time selected; trigger shows placeholder + soft
 *   primary-color ring (visible but not alarming)
 *
 * Callers own the date + start + end as three separate string fields:
 *   date           "YYYY-MM-DD" or ""
 *   start / end    "HH:MM" (24h internal) or ""
 *
 * The component composes the trigger label from these. Nothing gets stored
 * in component state — fully controlled.
 */

import * as React from "react";
import { format, parse } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";

type TimeParts = {
    hour12: number; // 1..12
    ampm: "AM" | "PM";
};

function parseHHMM(value: string): TimeParts | null {
    if (!value || !/^\d{2}:\d{2}$/.test(value)) return null;
    const [h] = value.split(":").map((x) => parseInt(x, 10));
    if (Number.isNaN(h)) return null;
    const ampm: "AM" | "PM" = h >= 12 ? "PM" : "AM";
    const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return { hour12, ampm };
}

function partsToHHMM(parts: TimeParts): string {
    let h24 = parts.hour12 % 12;
    if (parts.ampm === "PM") h24 += 12;
    // Minutes always zero — picker is hourly-only by product choice.
    return `${String(h24).padStart(2, "0")}:00`;
}

function formatTimeLabel(value: string): string {
    const parts = parseHHMM(value);
    if (!parts) return "";
    return `${parts.hour12}:00 ${parts.ampm}`;
}

function formatDateLabel(date: string): string {
    if (!date) return "";
    try {
        const d = parse(date, "yyyy-MM-dd", new Date());
        return format(d, "d MMM yyyy");
    } catch {
        return date;
    }
}

interface DateTimeRangePickerProps {
    date: string;
    start: string;
    end: string;
    onDateChange: (date: string) => void;
    onStartChange: (time: string) => void;
    onEndChange: (time: string) => void;
    placeholder?: string;
    /** Earliest date the user can pick (inclusive). "YYYY-MM-DD". */
    minDate?: string;
}

const HOURS_12 = Array.from({ length: 12 }, (_, i) => i + 1);
const AMPM: Array<"AM" | "PM"> = ["AM", "PM"];

function TimeColumnGroup({
    label,
    value,
    onChange,
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
}) {
    const parts = parseHHMM(value);

    const setPart = (next: Partial<TimeParts>) => {
        const merged: TimeParts = {
            hour12: parts?.hour12 ?? 12,
            ampm: parts?.ampm ?? "AM",
            ...next,
        };
        onChange(partsToHHMM(merged));
    };

    // Uniform button cell so hour and AM/PM columns align vertically.
    const cellCls = "h-7 w-full px-0 text-[11px] font-mono rounded-sm";

    return (
        <div className="flex flex-col min-w-0">
            <p className="px-2 pt-1.5 pb-1 text-[9px] font-mono uppercase tracking-[0.15em] text-muted-foreground">
                {label}
            </p>
            <div className="flex flex-row divide-x divide-border h-[180px]">
                <ScrollArea className="w-10">
                    <div className="flex flex-col px-1 pb-1 gap-[2px]">
                        {HOURS_12.map((h) => (
                            <Button
                                key={h}
                                size="sm"
                                variant={parts?.hour12 === h ? "default" : "ghost"}
                                className={cellCls}
                                onClick={() => setPart({ hour12: h })}
                            >
                                {h}
                            </Button>
                        ))}
                    </div>
                </ScrollArea>
                <div className="flex flex-col px-1 pb-1 pt-0 gap-[2px] w-10">
                    {AMPM.map((ap) => (
                        <Button
                            key={ap}
                            size="sm"
                            variant={parts?.ampm === ap ? "default" : "ghost"}
                            className={cellCls}
                            onClick={() => setPart({ ampm: ap })}
                        >
                            {ap}
                        </Button>
                    ))}
                </div>
            </div>
        </div>
    );
}

/**
 * Returns parts + 1 hour, wrapping AM↔PM at the 11/12 boundary.
 *   1 AM → 2 AM, 10 AM → 11 AM, 11 AM → 12 PM, 12 PM → 1 PM,
 *   11 PM → 12 AM, 12 AM → 1 AM
 */
function advanceOneHour(parts: TimeParts): TimeParts {
    if (parts.hour12 === 11) {
        return { hour12: 12, ampm: parts.ampm === "AM" ? "PM" : "AM" };
    }
    if (parts.hour12 === 12) {
        return { hour12: 1, ampm: parts.ampm };
    }
    return { hour12: parts.hour12 + 1, ampm: parts.ampm };
}

export function DateTimeRangePicker({
    date,
    start,
    end,
    onDateChange,
    onStartChange,
    onEndChange,
    placeholder = "Choose window",
    minDate,
}: DateTimeRangePickerProps) {
    const [open, setOpen] = React.useState(false);

    // "To" auto-tracks "From" + 1 hour until the user explicitly clicks a
    // button in the To column. Initialize touched=true if end is already
    // populated on mount (e.g. restored from localStorage) so we don't
    // trample the stored value on the user's next From tweak.
    const [toTouched, setToTouched] = React.useState(() => Boolean(end));

    const handleStartChange = (newStart: string) => {
        onStartChange(newStart);
        if (toTouched) return;
        const parts = parseHHMM(newStart);
        if (!parts) return;
        onEndChange(partsToHHMM(advanceOneHour(parts)));
    };

    const handleEndChange = (newEnd: string) => {
        setToTouched(true);
        onEndChange(newEnd);
    };

    const handleClear = () => {
        onDateChange("");
        onStartChange("");
        onEndChange("");
        setToTouched(false);
    };

    const hasAll = Boolean(date && start && end);
    const hasAny = Boolean(date || start || end);

    const label = hasAll
        ? `${formatDateLabel(date)} · ${formatTimeLabel(start)} – ${formatTimeLabel(end)}`
        : hasAny
        ? `${formatDateLabel(date) || "—"} · ${formatTimeLabel(start) || "—"} – ${
              formatTimeLabel(end) || "—"
          }`
        : placeholder;

    const selectedDate = React.useMemo(() => {
        if (!date) return undefined;
        try {
            return parse(date, "yyyy-MM-dd", new Date());
        } catch {
            return undefined;
        }
    }, [date]);

    const minDateObj = React.useMemo(() => {
        if (!minDate) return undefined;
        try {
            return parse(minDate, "yyyy-MM-dd", new Date());
        } catch {
            return undefined;
        }
    }, [minDate]);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    className={cn(
                        "w-full justify-start text-left font-mono text-sm h-10",
                        !hasAll && "text-muted-foreground",
                        !hasAll && "ring-1 ring-primary/30 ring-offset-0"
                    )}
                >
                    <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                    <span className="truncate">{label}</span>
                </Button>
            </PopoverTrigger>
            <PopoverContent
                className="w-auto p-0"
                align="start"
                sideOffset={6}
            >
                {/* Horizontal layout — calendar on the left, FROM and TO columns
                    side-by-side on the right. Never stacks vertically. */}
                <div className="flex flex-row items-stretch divide-x divide-border">
                    <div className="shrink-0">
                        <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={(d) => {
                                if (d) onDateChange(format(d, "yyyy-MM-dd"));
                            }}
                            disabled={minDateObj ? { before: minDateObj } : undefined}
                            className="p-2 [--cell-size:1.85rem]"
                            initialFocus
                        />
                    </div>
                    <div className="flex flex-row divide-x divide-border shrink-0">
                        <TimeColumnGroup
                            label="From"
                            value={start}
                            onChange={handleStartChange}
                        />
                        <TimeColumnGroup label="To" value={end} onChange={handleEndChange} />
                    </div>
                </div>
                <div className="flex justify-between border-t border-border p-1.5 bg-muted/30">
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={handleClear}
                    >
                        Clear
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setOpen(false)}
                    >
                        Done
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    );
}
