"use client";

import { useState } from "react";
import { AlertCircle, ChevronDown, ChevronUp, CheckCircle2, Clock, Wrench } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import type { MaintenanceDecision } from "@/hooks/use-feasibility-check";

type OrangeDecisionCardProps = {
    assetName: string;
    assetImage?: string;
    conditionNotes?: string;
    conditionImages?: { url: string; note?: string }[];
    refurbDaysEstimate?: number;
    decision?: MaintenanceDecision;
    onDecisionChange: (decision: MaintenanceDecision) => void;
};

export function OrangeDecisionCard({
    assetName,
    assetImage,
    conditionNotes,
    conditionImages,
    refurbDaysEstimate,
    decision,
    onDecisionChange,
}: OrangeDecisionCardProps) {
    const [expanded, setExpanded] = useState(false);
    const hasDetails =
        conditionNotes || (conditionImages && conditionImages.length > 0) || refurbDaysEstimate;

    return (
        <Card
            className={`overflow-hidden border-amber-300 transition-colors ${decision ? "bg-amber-50/20 border-amber-200" : "bg-amber-50/40"}`}
        >
            <div className="p-4">
                <div className="flex items-start gap-3">
                    {assetImage ? (
                        <div className="w-12 h-12 rounded-md overflow-hidden border border-amber-200 shrink-0">
                            <Image
                                src={assetImage}
                                alt={assetName}
                                width={48}
                                height={48}
                                className="object-cover w-full h-full"
                            />
                        </div>
                    ) : (
                        <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                                <p className="font-medium text-amber-900 truncate">{assetName}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span className="inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">
                                        <AlertCircle className="h-3 w-3" /> ORANGE
                                    </span>
                                    {refurbDaysEstimate && (
                                        <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                                            <Clock className="h-3 w-3" /> ~{refurbDaysEstimate} day
                                            {refurbDaysEstimate > 1 ? "s" : ""} repair
                                        </span>
                                    )}
                                </div>
                            </div>
                            {decision && (
                                <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                            )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <Button
                                type="button"
                                size="sm"
                                variant={decision === "FIX_IN_ORDER" ? "default" : "outline"}
                                className={decision === "FIX_IN_ORDER" ? "gap-1.5" : ""}
                                onClick={() => onDecisionChange("FIX_IN_ORDER")}
                            >
                                <Wrench className="h-3.5 w-3.5" />
                                Fix before event
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                variant={decision === "USE_AS_IS" ? "default" : "outline"}
                                onClick={() => onDecisionChange("USE_AS_IS")}
                            >
                                Use as-is
                            </Button>

                            {hasDetails && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="ml-auto text-amber-700 hover:text-amber-900 hover:bg-amber-100 gap-1 text-xs"
                                    onClick={() => setExpanded(!expanded)}
                                >
                                    {expanded ? "Hide" : "View"} details
                                    {expanded ? (
                                        <ChevronUp className="h-3.5 w-3.5" />
                                    ) : (
                                        <ChevronDown className="h-3.5 w-3.5" />
                                    )}
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {expanded && hasDetails && (
                <div className="border-t border-amber-200 bg-amber-50/60 p-4 space-y-3">
                    {conditionNotes && (
                        <div>
                            <p className="text-xs font-medium text-amber-800 mb-1">
                                Condition Notes
                            </p>
                            <p className="text-sm text-amber-700">{conditionNotes}</p>
                        </div>
                    )}

                    {conditionImages && conditionImages.length > 0 && (
                        <div>
                            <p className="text-xs font-medium text-amber-800 mb-2">
                                Condition Photos
                            </p>
                            <div className="flex gap-2 overflow-x-auto pb-1">
                                {conditionImages.map((img, i) => (
                                    <div key={i} className="shrink-0 space-y-1">
                                        <div className="w-24 h-24 rounded-md overflow-hidden border border-amber-200">
                                            <Image
                                                src={img.url}
                                                alt={img.note || `Condition ${i + 1}`}
                                                width={96}
                                                height={96}
                                                className="object-cover w-full h-full"
                                            />
                                        </div>
                                        {img.note && (
                                            <p className="text-[10px] text-amber-600 max-w-[96px] truncate">
                                                {img.note}
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {refurbDaysEstimate && (
                        <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-100/60 rounded-md px-3 py-2">
                            <Clock className="h-4 w-4 shrink-0" />
                            <span>
                                Estimated repair time:{" "}
                                <strong>
                                    {refurbDaysEstimate} day{refurbDaysEstimate > 1 ? "s" : ""}
                                </strong>
                            </span>
                        </div>
                    )}
                </div>
            )}
        </Card>
    );
}
