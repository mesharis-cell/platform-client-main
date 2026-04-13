import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
    title: {
        default: "Documentation",
        template: "%s · Documentation",
    },
    description:
        "Tutorials and guides for the Kadence client portal. Learn how to log in, browse the catalog, submit orders, review quotes, and track your events.",
    robots: {
        index: true,
        follow: true,
    },
};

export default function DocsLayout({ children }: { children: ReactNode }) {
    return children;
}
