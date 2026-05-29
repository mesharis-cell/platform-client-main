"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Boxes, ArrowLeft, Upload, Loader2, ImageOff } from "lucide-react";
import { toast } from "sonner";
import { ClientNav } from "@/components/client-nav";
import { ClientHeader } from "@/components/client-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { CompanyGate } from "../../company-gate";
import { useCompanyAsset, useUpdateCompanyAsset } from "@/hooks/use-company";
import { useBrands } from "@/hooks/use-brands";
import { useClientAssetCategories } from "@/hooks/use-client-asset-categories";
import { useToken } from "@/lib/auth/use-token";
import { uploadImages } from "@/lib/utils/upload-images";

const NO_BRAND = "__none__";

export default function CompanyAssetEditPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const { user } = useToken();
    const { data: assetData, isLoading } = useCompanyAsset(id);
    const asset = assetData?.data;
    const update = useUpdateCompanyAsset();

    const { data: brandsData } = useBrands(
        user?.company_id ? { company_id: user.company_id } : undefined
    );
    const brands: any[] = brandsData?.data || [];
    const { data: categories = [] } = useClientAssetCategories();

    const [form, setForm] = useState({
        name: "",
        description: "",
        category: "",
        brand_id: NO_BRAND,
        on_display_image: "" as string | null,
    });
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        if (asset) {
            setForm({
                name: asset.name ?? "",
                description: asset.description ?? "",
                category: asset.category ?? "",
                brand_id: asset.brand_id ?? NO_BRAND,
                on_display_image: asset.on_display_image ?? "",
            });
        }
    }, [asset]);

    const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
            const urls = await uploadImages({
                files: [file],
                companyId: user?.company_id || undefined,
                profile: "photo",
            });
            setForm((f) => ({ ...f, on_display_image: urls[0] }));
            toast.success("Image uploaded");
        } catch {
            toast.error("Image upload failed");
        } finally {
            setUploading(false);
        }
    };

    const handleSave = async () => {
        try {
            await update.mutateAsync({
                id,
                data: {
                    name: form.name,
                    description: form.description || null,
                    category: form.category,
                    brand_id: form.brand_id === NO_BRAND ? null : form.brand_id,
                    on_display_image: form.on_display_image || null,
                },
            });
            toast.success("Asset updated");
            router.push("/company/assets");
        } catch {
            /* throwApiError already surfaces a toast */
        }
    };

    return (
        <CompanyGate requiredPermission="company:edit_assets">
            <ClientNav>
                <ClientHeader
                    icon={Boxes}
                    title="Edit Asset"
                    description="Update the presentation details shown to your team and on documents."
                    breadcrumbs={[
                        { label: "Company", href: "/company" },
                        { label: "Assets", href: "/company/assets" },
                        { label: "Edit" },
                    ]}
                />
                <div className="px-8 py-6">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push("/company/assets")}
                        className="gap-2 font-mono text-xs mb-5"
                    >
                        <ArrowLeft className="h-4 w-4" /> Back to assets
                    </Button>

                    {isLoading ? (
                        <div className="grid gap-6 lg:grid-cols-3">
                            <Skeleton className="h-80 w-full lg:col-span-1" />
                            <Skeleton className="h-80 w-full lg:col-span-2" />
                        </div>
                    ) : !asset ? (
                        <div className="text-center py-16 text-muted-foreground font-mono text-sm">
                            Asset not found.
                        </div>
                    ) : (
                        <>
                            <div className="grid gap-6 lg:grid-cols-3 items-start">
                                {/* Left: display image */}
                                <Card className="bg-card border-border lg:col-span-1">
                                    <CardHeader>
                                        <CardTitle className="font-mono text-sm uppercase tracking-wide">
                                            Display Image
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="relative aspect-square w-full rounded-lg border border-border bg-muted/30 overflow-hidden flex items-center justify-center">
                                            {form.on_display_image ? (
                                                <img
                                                    src={form.on_display_image}
                                                    alt={form.name}
                                                    className="w-full h-full object-contain p-3"
                                                />
                                            ) : (
                                                <div className="flex flex-col items-center gap-2 text-muted-foreground/40">
                                                    <ImageOff className="h-10 w-10" />
                                                    <span className="text-xs font-mono">
                                                        No image
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                        <label className="block">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={handleFile}
                                                disabled={uploading}
                                            />
                                            <span className="w-full inline-flex items-center justify-center gap-2 rounded-md border border-border px-3 py-2 font-mono text-xs hover:bg-muted transition-colors cursor-pointer">
                                                {uploading ? (
                                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                ) : (
                                                    <Upload className="h-3.5 w-3.5" />
                                                )}
                                                {form.on_display_image
                                                    ? "Replace image"
                                                    : "Upload image"}
                                            </span>
                                        </label>
                                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                                            Shown on the catalog and order documents. PNG or JPG,
                                            ideally on a clean background.
                                        </p>
                                    </CardContent>
                                </Card>

                                {/* Right: details */}
                                <Card className="bg-card border-border lg:col-span-2">
                                    <CardHeader>
                                        <CardTitle className="font-mono text-sm uppercase tracking-wide">
                                            Details
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-5">
                                        <div className="space-y-2">
                                            <Label className="font-mono text-xs uppercase">
                                                Name
                                            </Label>
                                            <Input
                                                value={form.name}
                                                onChange={(e) =>
                                                    setForm((f) => ({ ...f, name: e.target.value }))
                                                }
                                                placeholder="Asset name"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="font-mono text-xs uppercase">
                                                Description
                                            </Label>
                                            <Textarea
                                                rows={4}
                                                value={form.description}
                                                onChange={(e) =>
                                                    setForm((f) => ({
                                                        ...f,
                                                        description: e.target.value,
                                                    }))
                                                }
                                                placeholder="Short description shown to your team"
                                            />
                                        </div>

                                        <div className="grid gap-5 sm:grid-cols-2">
                                            <div className="space-y-2">
                                                <Label className="font-mono text-xs uppercase">
                                                    Category
                                                </Label>
                                                <Select
                                                    value={form.category || undefined}
                                                    onValueChange={(v) =>
                                                        setForm((f) => ({ ...f, category: v }))
                                                    }
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select a category" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {categories.map((c) => (
                                                            <SelectItem key={c.id} value={c.name}>
                                                                <span className="flex items-center gap-2">
                                                                    <span
                                                                        className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
                                                                        style={{
                                                                            backgroundColor:
                                                                                c.color,
                                                                        }}
                                                                    />
                                                                    {c.name}
                                                                </span>
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="font-mono text-xs uppercase">
                                                    Brand
                                                </Label>
                                                <Select
                                                    value={form.brand_id}
                                                    onValueChange={(v) =>
                                                        setForm((f) => ({ ...f, brand_id: v }))
                                                    }
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select a brand" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value={NO_BRAND}>
                                                            No brand
                                                        </SelectItem>
                                                        {brands.map((b) => (
                                                            <SelectItem key={b.id} value={b.id}>
                                                                {b.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Save bar */}
                            <div className="mt-6 flex items-center justify-end gap-3 border-t border-border pt-5">
                                <Button
                                    variant="outline"
                                    onClick={() => router.push("/company/assets")}
                                    className="font-mono text-xs"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleSave}
                                    disabled={update.isPending || uploading}
                                    className="font-mono text-xs gap-2"
                                >
                                    {update.isPending && (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    )}
                                    Save changes
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            </ClientNav>
        </CompanyGate>
    );
}
