"use client";

import { motion } from "framer-motion";
import { DollarSign, Truck, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface RequestPricingCardProps {
    pricingOverview: {
        final_total: string;
        logistics_sub_total: string;
        service_fee: string;
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
                                    AED {formatCurrency(pricingOverview.final_total)}
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
                                {/* Logistics Subtotal */}
                                <div className="flex items-center justify-between group p-2 -mx-2 rounded-lg hover:bg-muted/40 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-md bg-muted/50 text-muted-foreground group-hover:text-primary group-hover:bg-primary/10 transition-all duration-300">
                                            <Truck className="w-4 h-4" />
                                        </div>
                                        <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                                            Logistics Subtotal
                                        </span>
                                    </div>
                                    <span className="font-mono text-sm font-medium tracking-tight">
                                        AED {formatCurrency(pricingOverview.logistics_sub_total)}
                                    </span>
                                </div>

                                {/* Operational Services */}
                                <div className="flex items-center justify-between group p-2 -mx-2 rounded-lg hover:bg-muted/40 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-md bg-muted/50 text-muted-foreground group-hover:text-primary group-hover:bg-primary/10 transition-all duration-300">
                                            <FileText className="w-4 h-4" />
                                        </div>
                                        <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                                            Operational Services
                                        </span>
                                    </div>
                                    <span className="font-mono text-sm font-medium tracking-tight">
                                        AED {formatCurrency(pricingOverview.service_fee)}
                                    </span>
                                </div>

                                <Separator className="bg-border/60 my-2" />

                                {/* Summary Row inside Breakdown */}
                                <div className="flex items-center justify-between px-2 pt-1">
                                    <span className="text-sm font-semibold text-foreground">
                                        Total
                                    </span>
                                    <span className="font-mono font-bold text-primary tracking-tight">
                                        AED {formatCurrency(pricingOverview.final_total)}
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
