"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Boxes, ArrowLeft, Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ClientNav } from "@/components/client-nav";
import { ClientHeader } from "@/components/client-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

    // Hydrate the form once the asset loads.
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
                    description="Update the presentation details for this asset."
                />
                <div className="px-8 py-6 max-w-2xl">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push("/company/assets")}
                        className="gap-2 font-mono text-xs mb-4"
                    >
                        <ArrowLeft className="h-4 w-4" /> Back to assets
                    </Button>

                    {isLoading ? (
                        <Skeleton className="h-96 w-full" />
                    ) : !asset ? (
                        <div className="text-center py-16 text-muted-foreground font-mono text-sm">
                            Asset not found.
                        </div>
                    ) : (
                        <Card className="bg-card border-border">
                            <CardContent className="p-6 space-y-5">
                                {/* Display image */}
                                <div className="space-y-2">
                                    <Label className="font-mono text-xs uppercase">
                                        Display Image
                                    </Label>
                                    <div className="flex items-center gap-4">
                                        <div className="h-24 w-24 rounded-md border border-border bg-muted/40 overflow-hidden flex items-center justify-center shrink-0">
                                            {form.on_display_image ? (
                                                <img
                                                    src={form.on_display_image}
                                                    alt=""
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <Boxes className="h-8 w-8 text-muted-foreground/40" />
                                            )}
                                        </div>
                                        <label className="cursor-pointer">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={handleFile}
                                                disabled={uploading}
                                            />
                                            <span className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 font-mono text-xs hover:bg-muted transition-colors">
                                                {uploading ? (
                                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                ) : (
                                                    <Upload className="h-3.5 w-3.5" />
                                                )}
                                                Replace image
                                            </span>
                                        </label>
                                    </div>
                                </div>

                                {/* Name */}
                                <div className="space-y-2">
                                    <Label className="font-mono text-xs uppercase">Name</Label>
                                    <Input
                                        value={form.name}
                                        onChange={(e) =>
                                            setForm((f) => ({ ...f, name: e.target.value }))
                                        }
                                    />
                                </div>

                                {/* Description */}
                                <div className="space-y-2">
                                    <Label className="font-mono text-xs uppercase">
                                        Description
                                    </Label>
                                    <Textarea
                                        rows={3}
                                        value={form.description}
                                        onChange={(e) =>
                                            setForm((f) => ({ ...f, description: e.target.value }))
                                        }
                                    />
                                </div>

                                {/* Category */}
                                <div className="space-y-2">
                                    <Label className="font-mono text-xs uppercase">Category</Label>
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
                                                    {c.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Brand */}
                                <div className="space-y-2">
                                    <Label className="font-mono text-xs uppercase">Brand</Label>
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
                                            <SelectItem value={NO_BRAND}>No brand</SelectItem>
                                            {brands.map((b) => (
                                                <SelectItem key={b.id} value={b.id}>
                                                    {b.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="flex justify-end gap-3 pt-2">
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
                            </CardContent>
                        </Card>
                    )}
                </div>
            </ClientNav>
        </CompanyGate>
    );
}
