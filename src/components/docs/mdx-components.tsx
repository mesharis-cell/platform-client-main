import type { MDXComponents } from "mdx/types";
import { Callout } from "./Callout";
import { PortalLink } from "./PortalLink";
import { Screenshot } from "./Screenshot";
import { FeatureFlagNote } from "./FeatureFlagNote";
import { StepList, Step } from "./StepList";

/**
 * The set of React components injected into every MDX article under
 * `/content/docs/**\/*.mdx`. Authors reference them like any JSX inside
 * MDX:
 *   <Callout kind="tip" title="Pro tip">...</Callout>
 *   <PortalLink to="/my-orders" label="My Orders" />
 *   <StepList>
 *     <Step n={1} title="Log in">...</Step>
 *   </StepList>
 *
 * Also overrides bare markdown elements (h1–h4, a, code, table) so prose
 * shares a consistent typographic rhythm without requiring a plugin.
 */
export const docsMdxComponents: MDXComponents = {
    Callout,
    PortalLink,
    Screenshot,
    FeatureFlagNote,
    StepList,
    Step,

    h1: ({ children, ...props }) => (
        <h1 className="scroll-m-24 text-3xl font-bold tracking-tight mt-0 mb-6" {...props}>
            {children}
        </h1>
    ),
    h2: ({ children, ...props }) => (
        <h2
            className="scroll-m-24 text-2xl font-semibold tracking-tight mt-10 mb-4 pb-2 border-b border-border"
            {...props}
        >
            {children}
        </h2>
    ),
    h3: ({ children, ...props }) => (
        <h3 className="scroll-m-24 text-lg font-semibold tracking-tight mt-6 mb-2" {...props}>
            {children}
        </h3>
    ),
    h4: ({ children, ...props }) => (
        <h4 className="scroll-m-24 text-base font-semibold mt-4 mb-2" {...props}>
            {children}
        </h4>
    ),
    p: ({ children, ...props }) => (
        <p className="leading-7 text-foreground/90 my-4" {...props}>
            {children}
        </p>
    ),
    ul: ({ children, ...props }) => (
        <ul className="my-4 ml-6 list-disc space-y-1 text-foreground/90 [&>li>p]:my-1" {...props}>
            {children}
        </ul>
    ),
    ol: ({ children, ...props }) => (
        <ol className="my-4 ml-6 list-decimal space-y-1 text-foreground/90 [&>li>p]:my-1" {...props}>
            {children}
        </ol>
    ),
    li: ({ children, ...props }) => <li {...props}>{children}</li>,
    a: ({ children, href, ...props }) => (
        <a
            href={href}
            className="text-primary underline underline-offset-4 hover:text-primary/80"
            {...props}
        >
            {children}
        </a>
    ),
    code: ({ children, ...props }) => (
        <code
            className="font-mono text-[0.85em] rounded bg-muted px-1.5 py-0.5 text-foreground"
            {...props}
        >
            {children}
        </code>
    ),
    pre: ({ children, ...props }) => (
        <pre
            className="my-4 overflow-x-auto rounded-lg border border-border bg-muted/50 p-4 text-sm leading-relaxed"
            {...props}
        >
            {children}
        </pre>
    ),
    blockquote: ({ children, ...props }) => (
        <blockquote
            className="my-4 border-l-4 border-muted-foreground/30 pl-4 italic text-muted-foreground"
            {...props}
        >
            {children}
        </blockquote>
    ),
    hr: (props) => <hr className="my-8 border-border" {...props} />,
    table: ({ children, ...props }) => (
        <div className="my-6 w-full overflow-x-auto">
            <table className="w-full border-collapse text-sm" {...props}>
                {children}
            </table>
        </div>
    ),
    th: ({ children, ...props }) => (
        <th
            className="border-b border-border px-3 py-2 text-left font-semibold"
            {...props}
        >
            {children}
        </th>
    ),
    td: ({ children, ...props }) => (
        <td className="border-b border-border/60 px-3 py-2 align-top" {...props}>
            {children}
        </td>
    ),
};
