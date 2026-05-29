"use client";

import { ClientNav } from "@/components/client-nav";
import { CatalogBrowser } from "@/components/catalog/catalog-browser";

export default function CatalogPage() {
    return (
        <ClientNav>
            <CatalogBrowser
                breadcrumbs={[{ label: "Home", href: "/client-dashboard" }, { label: "Catalog" }]}
            />
        </ClientNav>
    );
}
