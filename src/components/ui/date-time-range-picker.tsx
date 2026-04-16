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
    minute: number; // 0..55 in 5-min steps
    ampm: "AM" | "PM";
};

function parseHHMM(value: string): TimeParts | null {
    if (!value || !/^\d{2}:\d{2}$/.test(value)) return null;
    const [h, m] = value.split(":").map((x) => parseInt(x, 10));
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    const ampm: "AM" | "PM" = h >= 12 ? "PM" : "AM";
    const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    // Snap to 5-min grid for display
    const minute = Math.round(m / 5) * 5;
    return { hour12, minute: minute === 60 ? 0 : minute, ampm };
}

function partsToHHMM(parts: TimeParts): string {
    let h24 = parts.hour12 % 12;
    if (parts.ampm === "PM") h24 += 12;
    return `${String(h24).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")}`;
}

function formatTimeLabel(value: string): string {
    const parts = parseHHMM(value);
    if (!parts) return "";
    return `${parts.hour12}:${String(parts.minute).padStart(2, "0")} ${parts.ampm}`;
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
    date: string; // YYYY-MM-DD or ""
    start: string; // HH:MM (24h) or ""
    end: string; // HH:MM (24h) or ""
    onDateChange: (date: string) => void;
    onStartChange: (time: string) => void;
    onEndChange: (time: string) => void;
    placeholder?: string;
    /**
     * Earliest date the user can pick (inclusive). ISO string "YYYY-MM-DD".
     */
    minDate?: string;
}

const HOURS_12 = Array.from({ length: 12 }, (_, i) => i + 1); // 1..12
const MINUTES_5 = Array.from({ length: 12 }, (_, i) => i * 5); // 0,5,10...55
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
            minute: parts?.minute ?? 0,
            ampm: parts?.ampm ?? "AM",
            ...next,
        };
        onChange(partsToHHMM(merged));
    };

    const isActive = (candidate: TimeParts): boolean => {
        if (!parts) return false;
        return (
            parts.hour12 === candidate.hour12 &&
            parts.minute === candidate.minute &&
            parts.ampm === candidate.ampm
        );
    };

    return (
        <div className="flex flex-col">
            <p className="px-3 pt-3 pb-1 text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground">
                {label}
            </p>
            <div className="grid grid-cols-3 divide-x divide-border h-[240px]">
                <ScrollArea className="h-full">
                    <div className="flex flex-col p-1 gap-0.5">
                        {HOURS_12.map((h) => (
                            <Button
                                key={h}
                                size="sm"
                                variant={
                                    parts?.hour12 === h ? "default" : "ghost"
                                }
                                className="h-8 w-full text-xs"
                                onClick={() => setPart({ hour12: h })}
                            >
                                {h}
                            </Button>
                        ))}
                    </div>
                </ScrollArea>
                <ScrollArea className="h-full">
                    <div className="flex flex-col p-1 gap-0.5">
                        {MINUTES_5.map((m) => (
                            <Button
                                key={m}
                                size="sm"
                                variant={parts?.minute === m ? "default" : "ghost"}
                                className="h-8 w-full text-xs"
                                onClick={() => setPart({ minute: m })}
                            >
                                {String(m).padStart(2, "0")}
                            </Button>
                        ))}
                    </div>
                </ScrollArea>
                <div className="flex flex-col p-1 gap-0.5">
                    {AMPM.map((ap) => (
                        <Button
                            key={ap}
                            size="sm"
                            variant={parts?.ampm === ap ? "default" : "ghost"}
                            className="h-8 w-full text-xs"
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

    const hasAny = Boolean(date || start || end);
    const hasAll = Boolean(date && start && end);

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
                className="w-auto p-0 overflow-hidden"
                align="start"
            >
                <div className="flex flex-col sm:flex-row">
                    <div className="p-2">
                        <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={(d) => {
                                if (d) {
                                    onDateChange(format(d, "yyyy-MM-dd"));
                                }
                            }}
                            disabled={
                                minDateObj
                                    ? { before: minDateObj }
                                    : undefined
                            }
                            initialFocus
                        />
                    </div>
                    <div className="flex flex-row sm:flex-col border-t sm:border-t-0 sm:border-l border-border">
                        <TimeColumnGroup
                            label="From"
                            value={start}
                            onChange={onStartChange}
                        />
                        <div className="border-t border-border" />
                        <TimeColumnGroup
                            label="To"
                            value={end}
                            onChange={onEndChange}
                        />
                    </div>
                </div>
                <div className="flex justify-between border-t border-border p-2 bg-muted/30">
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-xs"
                        onClick={() => {
                            onDateChange("");
                            onStartChange("");
                            onEndChange("");
                        }}
                    >
                        Clear
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        className="text-xs"
                        onClick={() => setOpen(false)}
                    >
                        Done
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    );
}
