import Image from "next/image";
import { cn } from "@/lib/utils";

export interface ScreenshotAnnotation {
    /**
     * Coordinates in the PNG's native pixel space (the Playwright capture
     * dimensions, typically 1280x800). The SVG overlay uses the same
     * coordinate system via viewBox so annotations scale with the rendered
     * image width.
     */
    at: { x: number; y: number };
    /** Short label rendered in the circle — typically a step number. */
    label: string;
    /** Optional caption rendered adjacent to the circle. */
    text?: string;
    /**
     * Where the caption sits relative to the circle. Defaults to "right".
     */
    side?: "right" | "left" | "above" | "below";
    /** Marker color. Defaults to primary. */
    color?: "primary" | "warning" | "success" | "destructive";
}

interface ScreenshotProps {
    /** Path relative to `/public/docs/screenshots/`. */
    src: string;
    /** Accessible description of what the screenshot shows. Required. */
    alt: string;
    /** Optional caption rendered beneath the image. */
    caption?: string;
    /** Intrinsic width and height of the PNG — required for layout stability. */
    width: number;
    height: number;
    /** Numbered callouts rendered as an SVG overlay on top of the image. */
    annotations?: ScreenshotAnnotation[];
    className?: string;
}

const COLOR_VAR: Record<NonNullable<ScreenshotAnnotation["color"]>, string> = {
    primary: "hsl(var(--primary))",
    warning: "#f59e0b",
    success: "#10b981",
    destructive: "hsl(var(--destructive))",
};

/**
 * A screenshot figure with optional numbered annotation overlay.
 *
 * Authors write annotations in the MDX prop (not baked into the PNG) so
 * they can edit, localise, and reshoot independently. Annotation
 * coordinates are in the PNG's native pixel space; the SVG overlay shares
 * that coordinate system through `viewBox`, so everything scales when the
 * image is rendered at a smaller width.
 */
export function Screenshot({
    src,
    alt,
    caption,
    width,
    height,
    annotations,
    className,
}: ScreenshotProps) {
    const resolvedSrc = src.startsWith("/") ? src : `/docs/screenshots/${src}`;
    const hasAnnotations = (annotations?.length ?? 0) > 0;

    return (
        <figure className={cn("my-6 space-y-2", className)}>
            <div className="relative rounded-lg border border-border overflow-hidden bg-muted/30">
                <Image
                    src={resolvedSrc}
                    alt={alt}
                    width={width}
                    height={height}
                    className="w-full h-auto"
                    sizes="(min-width: 1024px) 768px, 100vw"
                />
                {hasAnnotations ? (
                    <svg
                        className="pointer-events-none absolute inset-0 h-full w-full"
                        viewBox={`0 0 ${width} ${height}`}
                        preserveAspectRatio="xMidYMid meet"
                        aria-hidden="true"
                    >
                        {annotations!.map((annotation, index) => (
                            <AnnotationMarker
                                key={index}
                                annotation={annotation}
                                imageWidth={width}
                            />
                        ))}
                    </svg>
                ) : null}
            </div>
            {caption ? (
                <figcaption className="text-xs text-muted-foreground leading-relaxed">
                    {caption}
                </figcaption>
            ) : null}
            {hasAnnotations ? (
                <ol className="mt-2 space-y-1 text-xs text-muted-foreground list-none pl-0">
                    {annotations!.map((annotation, index) =>
                        annotation.text ? (
                            <li key={index} className="flex gap-2">
                                <span
                                    className="shrink-0 font-mono font-semibold"
                                    style={{
                                        color: COLOR_VAR[annotation.color ?? "primary"],
                                    }}
                                >
                                    {annotation.label}.
                                </span>
                                <span>{annotation.text}</span>
                            </li>
                        ) : null
                    )}
                </ol>
            ) : null}
        </figure>
    );
}

function AnnotationMarker({
    annotation,
    imageWidth,
}: {
    annotation: ScreenshotAnnotation;
    imageWidth: number;
}) {
    const color = COLOR_VAR[annotation.color ?? "primary"];
    // Circle radius scales with the image so markers read at any rendered
    // width. 1.4% of the PNG's pixel width feels right at the 1280px
    // capture baseline.
    const radius = Math.max(14, Math.round(imageWidth * 0.014));

    return (
        <g>
            <circle
                cx={annotation.at.x}
                cy={annotation.at.y}
                r={radius + 4}
                fill={color}
                fillOpacity={0.2}
            />
            <circle
                cx={annotation.at.x}
                cy={annotation.at.y}
                r={radius}
                fill={color}
                stroke="white"
                strokeWidth={3}
            />
            <text
                x={annotation.at.x}
                y={annotation.at.y}
                textAnchor="middle"
                dominantBaseline="central"
                fontFamily="ui-monospace, Menlo, monospace"
                fontSize={radius * 1.05}
                fontWeight={700}
                fill="white"
            >
                {annotation.label}
            </text>
        </g>
    );
}
