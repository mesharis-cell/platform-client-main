"use client";

import { ClientNav } from "@/components/client-nav";
import { CatalogBrowser } from "@/components/catalog/catalog-browser";
import { CompanyAssetCard } from "@/components/catalog/company-asset-card";
import { CompanyGate } from "../company-gate";

export default function CompanyAssetsPage() {
    return (
        <CompanyGate requiredPermission="company:edit_assets">
            <ClientNav>
                {/* Same search/filters/grid as the public catalog (shared
                    CatalogBrowser); cards link to the asset editor instead of
                    add-to-cart, and the default tab is Assets. */}
                <CatalogBrowser
                    title="Company Assets"
                    description="Browse your company's assets and edit their presentation details."
                    badgeLabel="Assets"
                    showCounts={false}
                    defaultViewType="asset"
                    renderCard={(item) => <CompanyAssetCard item={item} />}
                />
            </ClientNav>
        </CompanyGate>
    );
}
