"use client";

import { useState } from "react";
import { Download, FileSpreadsheet, Loader2 } from "lucide-react";
import { ClientNav } from "@/components/client-nav";
import { ClientHeader } from "@/components/client-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { apiClient } from "@/lib/api/api-client";
import { useClientReports, type ReportCardMeta, type ReportFilterMeta } from "@/hooks/use-reports";

type CardFilterState = Record<string, any>;

export default function ClientReportsPage() {
    const { data: reports, isLoading } = useClientReports();
    const [filters, setFilters] = useState<Record<string, CardFilterState>>({});
    const [downloading, setDownloading] = useState<string | null>(null);

    const cards = reports ?? [];

    const setF = (cardKey: string, fKey: string, value: any) =>
        setFilters((prev) => ({ ...prev, [cardKey]: { ...(prev[cardKey] ?? {}), [fKey]: value } }));
    const getF = (cardKey: string, fKey: string) => filters[cardKey]?.[fKey];

    // company is forced to the caller's company server-side — never rendered/sent here.
    const shownFilters = (card: ReportCardMeta) => card.filters.filter((f) => f.type !== "company");

    const buildQuery = (card: ReportCardMeta): string => {
        const f = filters[card.key] ?? {};
        const q = new URLSearchParams();
        for (const flt of shownFilters(card)) {
            if (flt.type === "category-include-exclude") {
                const raw = (f[flt.key] as { mode?: string; text?: string }) ?? {};
                const values = (raw.text ?? "")
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean);
                if (values.length) {
                    const param = raw.mode === "exclude" ? "category_exclude" : "category_include";
                    values.forEach((v) => q.append(param, v));
                }
            } else {
                const v = f[flt.key];
                if (v) q.append(flt.key, String(v));
            }
        }
        return q.toString();
    };

    const run = async (card: ReportCardMeta) => {
        const query = buildQuery(card);
        const url = `/client/v1/reports/${card.key}/run${query ? `?${query}` : ""}`;
        setDownloading(card.key);
        try {
            const response = await apiClient.get(url, { responseType: "blob" });
            const contentType = String(response.headers?.["content-type"] ?? "");
            const blob =
                response.data instanceof Blob
                    ? response.data
                    : new Blob([response.data], { type: contentType });
            /* eslint-disable no-undef */
            const rg =
                typeof globalThis !== "undefined"
                    ? (globalThis as unknown as Record<string, unknown>)
                    : undefined;
            /* eslint-enable no-undef */
            const doc = rg?.["document"] as Document | undefined;
            if (!doc) return;
            const downloadUrl = URL.createObjectURL(blob);
            const a = doc.createElement("a");
            a.href = downloadUrl;
            a.download = `${card.key}-${new Date().toISOString().split("T")[0]}.xlsx`;
            doc.body.appendChild(a);
            a.click();
            doc.body.removeChild(a);
            URL.revokeObjectURL(downloadUrl);
            toast.success(`${card.label} downloaded`);
        } catch (err) {
            // With responseType: "blob", an error response body is delivered as
            // a Blob too — so the JSON { message } the API sends is hidden inside
            // it. Read the blob, parse the JSON, and surface the real message;
            // fall back to the generic toast if anything in that chain fails.
            let message = `Failed to download ${card.label}`;
            try {
                const data = (err as { response?: { data?: unknown } })?.response?.data;
                if (data instanceof Blob) {
                    const text = await data.text();
                    const parsed = JSON.parse(text) as { message?: unknown };
                    if (typeof parsed?.message === "string" && parsed.message) {
                        message = parsed.message;
                    }
                }
            } catch {
                /* keep the generic message */
            }
            toast.error(message);
        } finally {
            setDownloading(null);
        }
    };

    const renderFilter = (card: ReportCardMeta, flt: ReportFilterMeta) => {
        const value = getF(card.key, flt.key);
        if (flt.type === "date") {
            return (
                <div key={flt.key} className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">{flt.label}</Label>
                    <Input
                        type="date"
                        value={value || ""}
                        onChange={(e) => setF(card.key, flt.key, e.target.value)}
                        className="w-40"
                    />
                </div>
            );
        }
        if (flt.type === "category-include-exclude") {
            const cat = (value as { mode?: string; text?: string }) ?? {};
            return (
                <div key={flt.key} className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">{flt.label}</Label>
                    <div className="flex gap-2">
                        <Select
                            value={cat.mode ?? "include"}
                            onValueChange={(m) => setF(card.key, flt.key, { ...cat, mode: m })}
                        >
                            <SelectTrigger className="h-9 w-28 text-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="include">Include</SelectItem>
                                <SelectItem value="exclude">Exclude</SelectItem>
                            </SelectContent>
                        </Select>
                        <Input
                            value={cat.text ?? ""}
                            placeholder="e.g. Beverages, Glassware"
                            onChange={(e) =>
                                setF(card.key, flt.key, { ...cat, text: e.target.value })
                            }
                            className="flex-1"
                        />
                    </div>
                </div>
            );
        }
        return (
            <div key={flt.key} className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{flt.label}</Label>
                <Input
                    value={value || ""}
                    placeholder={flt.label}
                    onChange={(e) => setF(card.key, flt.key, e.target.value)}
                />
            </div>
        );
    };

    return (
        <ClientNav>
            <div className="min-h-screen bg-background">
                <ClientHeader
                    icon={FileSpreadsheet}
                    title="Reports"
                    description="Download reports and data exports"
                />

                <div className="container mx-auto px-6 py-8 space-y-6">
                    {isLoading ? (
                        <Card>
                            <CardContent className="py-10 text-center text-muted-foreground">
                                Loading reports…
                            </CardContent>
                        </Card>
                    ) : cards.length === 0 ? (
                        <Card>
                            <CardContent className="py-10 text-center text-muted-foreground">
                                No reports are available for your account yet.
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {cards.map((card) => {
                                const isDownloading = downloading === card.key;
                                return (
                                    <Card key={card.key}>
                                        <CardHeader className="pb-3">
                                            <CardTitle className="text-base flex items-center gap-2">
                                                <FileSpreadsheet className="h-4 w-4 text-primary" />
                                                {card.label}
                                            </CardTitle>
                                            <CardDescription className="text-xs">
                                                {card.description}
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-3">
                                            {shownFilters(card).map((flt) =>
                                                renderFilter(card, flt)
                                            )}
                                            <Button
                                                className="w-full"
                                                variant="outline"
                                                disabled={isDownloading}
                                                onClick={() => run(card)}
                                            >
                                                {isDownloading ? (
                                                    <>
                                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                        Downloading…
                                                    </>
                                                ) : (
                                                    <>
                                                        <Download className="h-4 w-4 mr-2" />
                                                        Download XLSX
                                                    </>
                                                )}
                                            </Button>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </ClientNav>
    );
}
