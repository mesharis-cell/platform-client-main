"use client";

import { AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { MaintenanceDecision } from "@/hooks/use-feasibility-check";

type OrangeDecisionCardProps = {
    assetName: string;
    decision?: MaintenanceDecision;
    onDecisionChange: (decision: MaintenanceDecision) => void;
};

export function OrangeDecisionCard({
    assetName,
    decision,
    onDecisionChange,
}: OrangeDecisionCardProps) {
    return (
        <Card className="p-4 border-amber-300 bg-amber-50/40">
            <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1 space-y-3">
                    <div>
                        <p className="font-medium text-amber-900">{assetName}</p>
                        <p className="text-xs text-amber-800">
                            This ORANGE item requires your decision before submit.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button
                            type="button"
                            size="sm"
                            variant={decision === "FIX_IN_ORDER" ? "default" : "outline"}
                            onClick={() => onDecisionChange("FIX_IN_ORDER")}
                        >
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
                    </div>
                </div>
            </div>
        </Card>
    );
}
