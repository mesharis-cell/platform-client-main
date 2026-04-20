"use client";

import Image from "next/image";
import Link from "next/link";
import { AlertCircle, ArrowUpRight, Boxes, Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CatalogItem } from "@/types/collection";

function hexWithAlpha(hex: string | null | undefined, alphaHex: string) {
    if (!hex) return undefined;
    const normalized = hex.startsWith("#") ? hex : `#${hex}`;
    return `${normalized}${alphaHex}`;
}

export function CatalogCard({ item }: { item: CatalogItem }) {
    const isFamily = item.type === "family";
    const href = isFamily
        ? `/catalog/families/${item.id}`
        : `/catalog/collections/${item.id}`;
    const image = item.images[0];
    const Fallback = isFamily ? Boxes : Layers;

    const categoryColor = item.categoryRef?.color || null;
    const catBg = hexWithAlpha(categoryColor, "1A"); // ~10%
    const catText = categoryColor || undefined;
    const catBorder = hexWithAlpha(categoryColor, "40"); // ~25%

    const code = isFamily ? (item as any).code : null;
    const availability = isFamily
        ? {
              available: (item as any).availableQuantity as number,
              total: (item as any).totalQuantity as number,
          }
        : null;
    const conditionFlags = isFamily
        ? {
              red: (item as any).conditionSummary?.red ?? 0,
              orange: (item as any).conditionSummary?.orange ?? 0,
          }
        : null;

    return (
        <Link
            href={href}
            data-testid={isFamily ? "client-family-card" : "client-collection-card"}
            className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg"
        >
            {/* Image area */}
            <div className="relative aspect-square overflow-hidden bg-muted/30">
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

                {/* Top-left: brand (subtle) */}
                {item.brand && (
                    <div className="absolute left-3 top-3">
                        <Badge
                            variant="secondary"
                            className="bg-background/80 text-foreground/80 backdrop-blur-sm border-border/50 text-[10px] font-medium"
                        >
                            {item.brand.name}
                        </Badge>
                    </div>
                )}

                {/* Top-right: condition warning (if any) */}
                {isFamily &&
                    conditionFlags &&
                    (conditionFlags.red > 0 || conditionFlags.orange > 0) && (
                        <div className="absolute right-3 top-3">
                            <Badge
                                variant="outline"
                                className={
                                    conditionFlags.red > 0
                                        ? "bg-red-500/10 text-red-700 border-red-500/25 backdrop-blur-sm text-[10px]"
                                        : "bg-amber-500/10 text-amber-700 border-amber-500/25 backdrop-blur-sm text-[10px]"
                                }
                            >
                                <AlertCircle className="mr-1 h-2.5 w-2.5" />
                                {conditionFlags.red > 0
                                    ? `${conditionFlags.red} need repair`
                                    : `${conditionFlags.orange} minor`}
                            </Badge>
                        </div>
                    )}
            </div>

            {/* Body */}
            <div className="flex flex-1 flex-col gap-3 p-5">
                {/* Title + code */}
                <div className="space-y-1">
                    <h3 className="font-semibold text-base leading-tight text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                        {item.name}
                    </h3>
                    {code && (
                        <p className="text-[11px] font-mono text-muted-foreground tracking-wide">
                            {code}
                        </p>
                    )}
                </div>

                {/* Category + team pills */}
                <div className="flex flex-wrap items-center gap-1.5">
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
                    {isFamily && (item as any).team && (
                        <Badge
                            variant="outline"
                            className="text-[10px] bg-muted/40 text-foreground/80 border-border/60"
                        >
                            {(item as any).team.name}
                        </Badge>
                    )}
                </div>

                {/* Availability / item count */}
                {isFamily && availability ? (
                    <div className="flex items-baseline gap-2 text-sm">
                        <span
                            className={`font-mono font-bold ${
                                availability.available > 0
                                    ? "text-emerald-600"
                                    : "text-muted-foreground"
                            }`}
                        >
                            {availability.available}
                        </span>
                        <span className="text-muted-foreground text-xs">
                            of {availability.total} available
                        </span>
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground">
                        {(item as any).itemCount ?? 0} items
                    </p>
                )}

                {/* CTA */}
                <Button
                    variant="default"
                    size="sm"
                    className="mt-auto w-full gap-1.5"
                    asChild
                >
                    <span>
                        {isFamily ? "View Asset" : "View Collection"}
                        <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </span>
                </Button>
            </div>
        </Link>
    );
}
