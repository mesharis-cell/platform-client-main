"use client";

import Image from "next/image";
import Link from "next/link";
import { Boxes, Layers, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CatalogItem } from "@/types/collection";

function hexWithAlpha(hex: string | null | undefined, alphaHex: string) {
    if (!hex) return undefined;
    const normalized = hex.startsWith("#") ? hex : `#${hex}`;
    return `${normalized}${alphaHex}`;
}

/**
 * Company Back Office variant of the catalog card. Same visual language as
 * CatalogCard but edit-oriented: instead of add-to-cart it links to the
 * narrow asset editor at /company/assets/[id]. Collections aren't editable
 * here (no asset-level fields), so they render without an edit action.
 */
export function CompanyAssetCard({ item }: { item: CatalogItem }) {
    const isCollection = item.type === "collection";
    const isGroup = item.type === "group";
    const editAssetId = isGroup ? item.siblings[0]?.id || item.id : item.id;
    const image = !isCollection ? item.onDisplayImage || item.images[0] : item.images[0];
    const Fallback = isCollection ? Layers : Boxes;

    const categoryColor = item.categoryRef?.color || null;
    const catBg = hexWithAlpha(categoryColor, "1A");
    const catText = categoryColor || undefined;
    const catBorder = hexWithAlpha(categoryColor, "40");

    return (
        <div className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg">
            <div className="bg-muted/30">
                <div className="relative aspect-[4/3] overflow-hidden">
                    {image ? (
                        <Image
                            src={image}
                            alt={item.name}
                            fill
                            sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 50vw"
                            className="object-contain p-4 transition-transform duration-300 group-hover:scale-[1.04]"
                        />
                    ) : (
                        <div className="flex h-full w-full items-center justify-center">
                            <Fallback className="h-20 w-20 text-muted-foreground/25" />
                        </div>
                    )}
                    {item.brand && (
                        <div className="absolute left-3 top-3">
                            <Badge
                                variant="secondary"
                                className="border-border/50 bg-background/85 text-[10px] font-medium text-foreground/80 backdrop-blur-sm"
                            >
                                {item.brand.name}
                            </Badge>
                        </div>
                    )}
                    {isGroup && (
                        <div className="absolute right-3 top-3">
                            <Badge className="bg-background/85 text-[10px] text-foreground shadow-sm backdrop-blur-sm hover:bg-background/85">
                                {item.siblingCount} stock records
                            </Badge>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex flex-1 flex-col gap-3 p-4">
                <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                        {isGroup && <Badge variant="secondary">Grouped</Badge>}
                        {item.category && (
                            <Badge
                                variant="outline"
                                className="text-[10px] font-medium"
                                style={
                                    categoryColor
                                        ? {
                                              backgroundColor: catBg,
                                              color: catText,
                                              borderColor: catBorder,
                                          }
                                        : undefined
                                }
                            >
                                {item.category}
                            </Badge>
                        )}
                    </div>
                    <p className="line-clamp-2 text-base font-semibold leading-tight text-foreground">
                        {item.name}
                    </p>
                    {!isCollection && item.code && !isGroup && (
                        <p className="font-mono text-[11px] tracking-wide text-muted-foreground">
                            {item.code}
                        </p>
                    )}
                </div>

                <div className="mt-auto">
                    {isCollection ? (
                        <p className="text-xs text-muted-foreground">
                            Collections aren&apos;t editable here.
                        </p>
                    ) : (
                        <Button variant="outline" size="sm" className="w-full gap-1.5" asChild>
                            <Link href={`/company/assets/${editAssetId}`}>
                                <Pencil className="h-3.5 w-3.5" />
                                Edit details
                            </Link>
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
