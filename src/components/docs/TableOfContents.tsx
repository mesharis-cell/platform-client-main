interface TocHeading {
    depth: 2 | 3;
    text: string;
    id: string;
}

interface TableOfContentsProps {
    headings: TocHeading[];
}

/**
 * Right-rail TOC built from the article's H2/H3 headings.
 * v1 is a static list — scroll-sync highlight can be added when we feel the
 * lack of it. For now, anchor-link navigation covers the value.
 */
export function TableOfContents({ headings }: TableOfContentsProps) {
    if (headings.length === 0) return null;

    return (
        <nav aria-label="On this page" className="space-y-2">
            <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground font-semibold">
                On this page
            </p>
            <ul className="space-y-1 text-sm" role="list">
                {headings.map((heading) => (
                    <li key={heading.id} className={heading.depth === 3 ? "pl-3" : ""}>
                        <a
                            href={`#${heading.id}`}
                            className="block text-foreground/70 hover:text-foreground transition-colors leading-snug"
                        >
                            {heading.text}
                        </a>
                    </li>
                ))}
            </ul>
        </nav>
    );
}

/**
 * Extract H2/H3 headings from a raw MDX body. Slugifies heading text for
 * anchor ids; mirrors what `rehype-slug` would generate.
 */
export const extractHeadings = (body: string): TocHeading[] => {
    const headings: TocHeading[] = [];
    const lines = body.split("\n");
    let inCodeBlock = false;
    for (const rawLine of lines) {
        const line = rawLine.trimEnd();
        if (line.startsWith("```")) {
            inCodeBlock = !inCodeBlock;
            continue;
        }
        if (inCodeBlock) continue;
        const match = /^(#{2,3})\s+(.+?)\s*$/.exec(line);
        if (!match) continue;
        const depth = match[1].length as 2 | 3;
        const text = match[2].replace(/`/g, "").trim();
        const id = text
            .toLowerCase()
            .replace(/[^\w\s-]/g, "")
            .trim()
            .replace(/\s+/g, "-");
        headings.push({ depth, text, id });
    }
    return headings;
};
