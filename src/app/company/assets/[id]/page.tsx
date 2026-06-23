"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
    Boxes,
    ArrowLeft,
    Upload,
    Loader2,
    ImageOff,
    X,
    Star,
    ImagePlus,
    Layers,
} from "lucide-react";
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

type GalleryImage = { url: string; note?: string };

export default function CompanyAssetEditPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const { user } = useToken();
    const { data: assetData, isLoading } = useCompanyAsset(id);
    const asset = assetData?.data as Record<string, any> | undefined;
    const update = useUpdateCompanyAsset();

    // A grouped asset edits the whole group (label + group gallery cascade to all
    // #N siblings); a lone asset edits its own fields. Driven by group_id.
    const isGroup = Boolean(asset?.group_id);

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
        cover: "" as string | null,
        gallery: [] as GalleryImage[],
    });
    const [uploadingCover, setUploadingCover] = useState(false);
    const [uploadingGallery, setUploadingGallery] = useState(false);

    useEffect(() => {
        if (!asset) return;
        const grouped = Boolean(asset.group_id);
        const rawGallery: any[] = grouped
            ? Array.isArray(asset.group_images)
                ? asset.group_images
                : []
            : // Lone gallery shows only the client-curated photos; scan imagery
              // (source:'SCAN') lives in the same column but is preserved server-side.
              Array.isArray(asset.images)
              ? asset.images.filter((i: any) => i?.source !== "SCAN")
              : [];
        setForm({
            name: (grouped ? asset.group_name : asset.name) ?? "",
            description: asset.description ?? "",
            category: asset.category ?? "",
            brand_id: asset.brand_id ?? NO_BRAND,
            cover: (grouped ? asset.group_on_display_image : asset.on_display_image) ?? "",
            gallery: rawGallery.map((i) => ({ url: i.url, note: i.note })),
        });
    }, [asset]);

    const handleCoverFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadingCover(true);
        try {
            const urls = await uploadImages({
                files: [file],
                companyId: user?.company_id || undefined,
                profile: "photo",
            });
            setForm((f) => ({ ...f, cover: urls[0] }));
            toast.success("Cover image uploaded");
        } catch {
            toast.error("Image upload failed");
        } finally {
            setUploadingCover(false);
            e.target.value = "";
        }
    };

    const handleAddPhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files ?? []);
        if (files.length === 0) return;
        setUploadingGallery(true);
        try {
            const urls = await uploadImages({
                files,
                companyId: user?.company_id || undefined,
                profile: "photo",
            });
            setForm((f) => ({ ...f, gallery: [...f.gallery, ...urls.map((url) => ({ url }))] }));
            toast.success(`${urls.length} photo${urls.length > 1 ? "s" : ""} added`);
        } catch {
            toast.error("Photo upload failed");
        } finally {
            setUploadingGallery(false);
            e.target.value = "";
        }
    };

    const removePhoto = (index: number) =>
        setForm((f) => ({ ...f, gallery: f.gallery.filter((_, i) => i !== index) }));

    const makeCover = (url: string) => {
        setForm((f) => ({ ...f, cover: url }));
        toast.success("Set as cover");
    };

    const handleSave = async () => {
        const common = {
            description: form.description || null,
            category: form.category,
            brand_id: form.brand_id === NO_BRAND ? null : form.brand_id,
        };
        const data = isGroup
            ? {
                  ...common,
                  group_name: form.name,
                  group_on_display_image: form.cover || null,
                  group_images: form.gallery,
              }
            : {
                  ...common,
                  name: form.name,
                  on_display_image: form.cover || null,
                  images: form.gallery,
              };
        try {
            await update.mutateAsync({ id, data });
            toast.success(isGroup ? "Group updated" : "Asset updated");
            router.push("/company/assets");
        } catch {
            /* throwApiError already surfaces a toast */
        }
    };

    return (
        <CompanyGate requiredPermission="company:edit_assets">
            <ClientNav>
                <ClientHeader
                    icon={isGroup ? Layers : Boxes}
                    title={isGroup ? "Edit Group" : "Edit Asset"}
                    description={
                        isGroup
                            ? "Update the group label, cover and photos — changes apply to every unit in the group."
                            : "Update the presentation details shown to your team and on documents."
                    }
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
                            {isGroup && (
                                <div className="mb-5 flex items-start gap-2 rounded-lg border border-border bg-muted/30 px-4 py-3">
                                    <Layers className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                        You&apos;re editing the whole group. The name, cover and
                                        photos apply to <strong>all units</strong> in this group;
                                        each unit keeps its{" "}
                                        <span className="font-mono">#number</span>.
                                    </p>
                                </div>
                            )}

                            <div className="grid gap-6 lg:grid-cols-3 items-start">
                                {/* Left: cover image */}
                                <Card className="bg-card border-border lg:col-span-1">
                                    <CardHeader>
                                        <CardTitle className="font-mono text-sm uppercase tracking-wide">
                                            Cover Image
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="relative aspect-square w-full rounded-lg border border-border bg-muted/30 overflow-hidden flex items-center justify-center">
                                            {form.cover ? (
                                                <img
                                                    src={form.cover}
                                                    alt={form.name}
                                                    className="w-full h-full object-contain p-3"
                                                />
                                            ) : (
                                                <div className="flex flex-col items-center gap-2 text-muted-foreground/40">
                                                    <ImageOff className="h-10 w-10" />
                                                    <span className="text-xs font-mono">
                                                        No cover
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                        <label className="block">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={handleCoverFile}
                                                disabled={uploadingCover}
                                            />
                                            <span className="w-full inline-flex items-center justify-center gap-2 rounded-md border border-border px-3 py-2 font-mono text-xs hover:bg-muted transition-colors cursor-pointer">
                                                {uploadingCover ? (
                                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                ) : (
                                                    <Upload className="h-3.5 w-3.5" />
                                                )}
                                                {form.cover ? "Replace cover" : "Upload cover"}
                                            </span>
                                        </label>
                                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                                            The thumbnail shown on the catalog and order documents.
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
                                                {isGroup ? "Group name" : "Name"}
                                            </Label>
                                            <Input
                                                value={form.name}
                                                onChange={(e) =>
                                                    setForm((f) => ({ ...f, name: e.target.value }))
                                                }
                                                placeholder={isGroup ? "Group name" : "Asset name"}
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

                            {/* Photo gallery */}
                            <Card className="bg-card border-border mt-6">
                                <CardHeader>
                                    <CardTitle className="font-mono text-sm uppercase tracking-wide">
                                        Photos
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                                        {form.gallery.map((img, index) => {
                                            const isCover = form.cover === img.url;
                                            return (
                                                <div
                                                    key={`${img.url}-${index}`}
                                                    className="group/photo relative aspect-square overflow-hidden rounded-lg border border-border bg-muted/30"
                                                >
                                                    <img
                                                        src={img.url}
                                                        alt=""
                                                        className="h-full w-full object-contain p-2"
                                                    />
                                                    {isCover && (
                                                        <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded bg-background/90 px-1.5 py-0.5 text-[9px] font-mono uppercase text-foreground shadow-sm">
                                                            <Star className="h-2.5 w-2.5 fill-current" />
                                                            Cover
                                                        </span>
                                                    )}
                                                    <div className="absolute inset-0 flex items-center justify-center gap-1.5 bg-background/70 opacity-0 transition-opacity group-hover/photo:opacity-100">
                                                        {!isCover && (
                                                            <Button
                                                                type="button"
                                                                size="sm"
                                                                variant="secondary"
                                                                className="h-7 gap-1 px-2 text-[10px]"
                                                                onClick={() => makeCover(img.url)}
                                                            >
                                                                <Star className="h-3 w-3" /> Cover
                                                            </Button>
                                                        )}
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="destructive"
                                                            className="h-7 w-7 p-0"
                                                            onClick={() => removePhoto(index)}
                                                        >
                                                            <X className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border bg-muted/20 text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                multiple
                                                className="hidden"
                                                onChange={handleAddPhotos}
                                                disabled={uploadingGallery}
                                            />
                                            {uploadingGallery ? (
                                                <Loader2 className="h-5 w-5 animate-spin" />
                                            ) : (
                                                <ImagePlus className="h-5 w-5" />
                                            )}
                                            <span className="font-mono text-[10px] uppercase">
                                                Add photos
                                            </span>
                                        </label>
                                    </div>
                                    <p className="mt-3 text-[11px] text-muted-foreground leading-relaxed">
                                        Catalogue photos shown to your team. Hover a photo to set it
                                        as the cover or remove it. Warehouse scan photos are kept
                                        separately and are never affected here.
                                    </p>
                                </CardContent>
                            </Card>

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
                                    disabled={
                                        update.isPending || uploadingCover || uploadingGallery
                                    }
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
