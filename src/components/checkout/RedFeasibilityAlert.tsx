import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { MaintenanceFeasibilityIssue } from "@/hooks/use-feasibility-check";

type RedFeasibilityAlertProps = {
    issues: MaintenanceFeasibilityIssue[];
    hasChecked: boolean;
    isChecking: boolean;
};

export function RedFeasibilityAlert({ issues, hasChecked, isChecking }: RedFeasibilityAlertProps) {
    if (isChecking) {
        return (
            <Card className="p-4 border-amber-300 bg-amber-50/40">
                <p className="text-sm text-amber-800">Checking maintenance feasibility...</p>
            </Card>
        );
    }

    if (!hasChecked) return null;

    if (issues.length === 0) {
        return (
            <Card className="p-4 border-emerald-300 bg-emerald-50/40">
                <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                    <p className="text-sm text-emerald-800">
                        Maintenance feasibility check passed. You can continue.
                    </p>
                </div>
            </Card>
        );
    }

    return (
        <Card className="p-4 border-destructive/40 bg-destructive/5">
            <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div className="space-y-2">
                    <p className="text-sm font-semibold text-destructive">
                        Some maintenance items cannot be completed in time for this event date.
                    </p>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                        {issues.map((issue) => (
                            <li key={issue.asset_id}>
                                {issue.asset_name}: earliest feasible date is{" "}
                                <span className="font-medium">{issue.earliest_feasible_date}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </Card>
    );
}
