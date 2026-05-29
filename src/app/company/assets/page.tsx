"use client";

import { Boxes } from "lucide-react";
import { ClientNav } from "@/components/client-nav";
import { ClientHeader } from "@/components/client-header";
import { CatalogBrowser } from "@/components/catalog/catalog-browser";
import { CompanyAssetCard } from "@/components/catalog/company-asset-card";
import { CompanyGate } from "../company-gate";

export default function CompanyAssetsPage() {
    return (
        <CompanyGate requiredPermission="company:edit_assets">
            <ClientNav>
                {/* Same compact header as every other company page; the shared
                    CatalogBrowser supplies the identical catalog search/filters/grid
                    below (headerless), with cards linking to the asset editor. */}
                <ClientHeader
                    icon={Boxes}
                    title="Company Assets"
                    description="Browse your company's assets and edit their presentation details."
                    breadcrumbs={[{ label: "Company", href: "/company" }, { label: "Assets" }]}
                />
                <CatalogBrowser
                    showHeader={false}
                    defaultViewType="asset"
                    renderCard={(item) => <CompanyAssetCard item={item} />}
                />
            </ClientNav>
        </CompanyGate>
    );
}
