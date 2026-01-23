/**
 * INTEGRATION EXAMPLE
 * How to wire AddWithRebrandButton into asset catalog/detail pages
 *
 * This file shows the pattern - integrate into actual catalog pages
 */

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AddWithRebrandButton } from "@/components/rebrand/AddWithRebrandButton";
import { toast } from "sonner";

// Example usage in asset catalog or detail page
export function AssetCatalogIntegrationExample() {
    // Your existing state
    const [cart, setCart] = useState<any[]>([]);
    const [quantity, setQuantity] = useState(1);

    // Example asset data
    const asset = {
        id: "asset-123",
        name: "Chivas Throne Chair",
        volumePerUnit: 2.5,
    };

    // Example company brands (fetch from API)
    const companyBrands = [
        { id: "brand-1", name: "Red Bull" },
        { id: "brand-2", name: "Jameson" },
        { id: "brand-3", name: "Absolut" },
    ];

    // Regular add to cart
    const handleAddToCart = () => {
        const newItem = {
            assetId: asset.id,
            assetName: asset.name,
            quantity,
            volumePerUnit: asset.volumePerUnit,
            isReskinRequest: false,
        };
        setCart([...cart, newItem]);
        toast.success("Added to cart");
    };

    // Add to cart WITH rebrand
    const handleAddWithRebrand = (rebrandData: any) => {
        const newItem = {
            assetId: asset.id,
            assetName: asset.name,
            quantity,
            volumePerUnit: asset.volumePerUnit,
            ...rebrandData, // Includes isReskinRequest, target brand, notes
        };
        setCart([...cart, newItem]);
        // Toast handled by AddWithRebrandButton component
    };

    return (
        <div className="space-y-4">
            {/* Asset display */}
            <div className="border border-border rounded-lg p-4">
                <h3 className="font-semibold">{asset.name}</h3>
                <p className="text-sm text-muted-foreground">Volume: {asset.volumePerUnit} m³</p>

                {/* Quantity selector */}
                <div className="flex items-center gap-2 my-4">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    >
                        −
                    </Button>
                    <span className="w-12 text-center">{quantity}</span>
                    <Button variant="outline" size="sm" onClick={() => setQuantity(quantity + 1)}>
                        +
                    </Button>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2">
                    <Button onClick={handleAddToCart}>Add to Cart</Button>

                    <AddWithRebrandButton
                        asset={asset}
                        companyBrands={companyBrands}
                        onAddToCart={handleAddWithRebrand}
                    />
                </div>
            </div>
        </div>
    );
}

/**
 * TO INTEGRATE:
 * 1. Import AddWithRebrandButton component
 * 2. Fetch company brands for the user's company
 * 3. Add button alongside "Add to Cart"
 * 4. Pass rebrand data to your cart state/context
 * 5. Include rebrand data when submitting order
 */
