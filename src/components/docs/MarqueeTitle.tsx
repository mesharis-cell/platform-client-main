"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { cn } from "@/lib/utils";

interface MarqueeTitleProps {
    text: string;
    /** Max pixels/second of scroll speed when overflowing. Default 80. */
    pixelsPerSecond?: number;
    className?: string;
}

/**
 * Truncated label that slides its text horizontally on hover so a
 * reader can see a title that's too long to fit. Measures overflow on
 * mount and on parent resize; if the title fits, it behaves like a
 * plain span with no animation.
 *
 * Intended for nav links with tight horizontal budgets.
 */
export function MarqueeTitle({
    text,
    pixelsPerSecond = 80,
    className,
}: MarqueeTitleProps) {
    const outerRef = useRef<HTMLSpanElement>(null);
    const innerRef = useRef<HTMLSpanElement>(null);
    const [shift, setShift] = useState(0);

    useEffect(() => {
        const outer = outerRef.current;
        const inner = innerRef.current;
        if (!outer || !inner) return;

        const measure = () => {
            const overflow = Math.max(0, inner.scrollWidth - outer.clientWidth);
            setShift(overflow);
        };
        measure();

        const ro = new ResizeObserver(measure);
        ro.observe(outer);
        return () => ro.disconnect();
    }, [text]);

    const duration = shift > 0 ? Math.max(shift / pixelsPerSecond, 0.5) : 0;
    const innerStyle: CSSProperties = {
        "--marquee-shift": `-${shift}px`,
        transitionDuration: `${duration}s`,
    } as CSSProperties;

    return (
        <span
            ref={outerRef}
            className={cn(
                "relative block min-w-0 overflow-hidden whitespace-nowrap",
                className
            )}
        >
            <span
                ref={innerRef}
                style={innerStyle}
                className={cn(
                    "inline-block will-change-transform transition-transform ease-linear",
                    shift > 0 &&
                        "group-hover/nav-link:[transform:translateX(var(--marquee-shift))]"
                )}
            >
                {text}
            </span>
        </span>
    );
}
