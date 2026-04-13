import Image from "next/image";
import { cn } from "@/lib/utils";

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
    className?: string;
}

/**
 * A screenshot figure with caption support.
 *
 * v1 is deliberately simple: just an image + caption. The annotation
 * overlay (numbered callouts, arrows) lands in M2 when the Playwright
 * harness starts producing annotation metadata alongside each PNG.
 */
export function Screenshot({ src, alt, caption, width, height, className }: ScreenshotProps) {
    const resolvedSrc = src.startsWith("/") ? src : `/docs/screenshots/${src}`;

    return (
        <figure className={cn("my-6 space-y-2", className)}>
            <div className="rounded-lg border border-border overflow-hidden bg-muted/30">
                <Image
                    src={resolvedSrc}
                    alt={alt}
                    width={width}
                    height={height}
                    className="w-full h-auto"
                    sizes="(min-width: 1024px) 768px, 100vw"
                />
            </div>
            {caption ? (
                <figcaption className="text-xs text-muted-foreground leading-relaxed">
                    {caption}
                </figcaption>
            ) : null}
        </figure>
    );
}
