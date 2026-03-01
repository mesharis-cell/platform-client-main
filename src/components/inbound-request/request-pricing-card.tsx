"use client";

import { motion } from "framer-motion";
import { DollarSign } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface RequestPricingCardProps {
    pricingOverview: {
        breakdown_lines?: Array<{
            line_id: string;
            label: string;
            quantity: number;
            unit: string;
            total?: number;
            unit_price?: number;
            billing_mode?: string;
            is_voided?: boolean;
        }>;
        totals?: {
            base_ops_total?: number;
            rate_card_total?: number;
            custom_total?: number;
            total?: number;
            sell_base_ops_total?: number;
            sell_rate_card_total?: number;
            sell_custom_total?: number;
            sell_total?: number;
            subtotal?: number;
            vat_percent?: number;
            vat_amount?: number;
            sell_total_with_vat?: number;
        };
        final_total: string | number;
        subtotal?: string | number;
        vat?: {
            percent: number;
            amount: number;
        };
    };
}

export function RequestPricingCard({ pricingOverview }: RequestPricingCardProps) {
    const formatCurrency = (val: string | undefined) => {
        const num = parseFloat(val || "0");
        return num.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    };
    const lineItems = Array.isArray(pricingOverview.breakdown_lines)
        ? pricingOverview.breakdown_lines.filter(
              (line) => !line.is_voided && (line.billing_mode || "BILLABLE") === "BILLABLE"
          )
        : [];
    const subtotal = String(
        pricingOverview.totals?.subtotal ??
            pricingOverview.totals?.sell_total ??
            pricingOverview.subtotal ??
            pricingOverview.final_total ??
            0
    );
    const vatPercent = Number(
        pricingOverview.totals?.vat_percent ?? pricingOverview.vat?.percent ?? 0
    );
    const vatAmount = String(
        pricingOverview.totals?.vat_amount ?? pricingOverview.vat?.amount ?? 0
    );
    const finalTotal = String(
        pricingOverview.totals?.total ??
            pricingOverview.totals?.sell_total_with_vat ??
            pricingOverview.totals?.sell_total ??
            pricingOverview.final_total ??
            0
    );

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="my-8"
        >
            <Card className="bg-card/50 backdrop-blur-sm border-border/40 overflow-hidden shadow-sm">
                <CardContent className="p-0">
                    <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border/40">
                        {/* Main Total Display - Takes up 1 column */}
                        <div className="md:col-span-1 p-6 flex flex-col justify-center bg-linear-to-br from-primary/5 via-transparent to-transparent">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-sm border border-primary/20">
                                    <DollarSign className="w-6 h-6" />
                                </div>
                                <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                                    Total Estimate
                                </span>
                            </div>
                            <div className="mt-2">
                                <span className="text-3xl font-bold font-mono text-foreground tracking-tight block">
                                    AED {formatCurrency(finalTotal)}
                                </span>
                                <p className="text-xs text-muted-foreground mt-1.5 ml-0.5 flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/50 block" />
                                    All fees included
                                </p>
                            </div>
                        </div>

                        {/* Breakdown Details - Takes up 2 columns */}
                        <div className="md:col-span-2 p-6 flex flex-col justify-center">
                            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 ml-1">
                                Cost Breakdown
                            </h3>

                            <div className="space-y-3">
                                {lineItems.length > 0 && (
                                    <div className="rounded border border-border/60 overflow-hidden mt-2">
                                        <div className="grid grid-cols-12 bg-muted/30 px-3 py-2 text-xs font-medium">
                                            <span className="col-span-8">Line</span>
                                            <span className="col-span-4 text-right">Amount</span>
                                        </div>
                                        {lineItems.map((line) => (
                                            <div
                                                key={line.line_id}
                                                className="grid grid-cols-12 px-3 py-2 text-xs border-t border-border/40"
                                            >
                                                <span className="col-span-8 truncate">
                                                    {line.label} ({line.quantity} {line.unit})
                                                </span>
                                                <span className="col-span-4 text-right font-mono">
                                                    AED {Number(line.total || 0).toFixed(2)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <Separator className="bg-border/60 my-2" />

                                <div className="flex items-center justify-between px-2">
                                    <span className="text-sm text-muted-foreground">Subtotal</span>
                                    <span className="font-mono text-sm">
                                        AED {formatCurrency(subtotal)}
                                    </span>
                                </div>

                                {vatPercent > 0 && (
                                    <div className="flex items-center justify-between px-2">
                                        <span className="text-sm text-muted-foreground">
                                            VAT ({vatPercent.toFixed(2)}%)
                                        </span>
                                        <span className="font-mono text-sm">
                                            AED {formatCurrency(vatAmount)}
                                        </span>
                                    </div>
                                )}

                                {/* Summary Row inside Breakdown */}
                                <div className="flex items-center justify-between px-2 pt-1">
                                    <span className="text-sm font-semibold text-foreground">
                                        Total
                                    </span>
                                    <span className="font-mono font-bold text-primary tracking-tight">
                                        AED {formatCurrency(finalTotal)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}
