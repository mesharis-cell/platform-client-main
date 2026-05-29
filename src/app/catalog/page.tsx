"use client";

import { ClientNav } from "@/components/client-nav";
import { CatalogBrowser } from "@/components/catalog/catalog-browser";

export default function CatalogPage() {
    return (
        <ClientNav>
            <CatalogBrowser />
        </ClientNav>
    );
}
