"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCart } from "@/contexts/cart-context";
import { useToken } from "@/lib/auth/use-token";
import { useSubmitSelfPickupFromCart } from "@/hooks/use-self-pickups";
import { useFeasibilityConfig } from "@/hooks/use-feasibility-check";
import { composeZonedISO } from "@/lib/feasibility/compose-datetime";
import { AnimatePresence, motion } from "framer-motion";
import {
    ShoppingCart,
    User,
    FileText,
    ChevronLeft,
    ChevronRight,
    Check,
    Package,
} from "lucide-react";
import { toast } from "sonner";

type PickupStep = "cart" | "details" | "review";

const PICKUP_STEPS: { key: PickupStep; label: string; icon: any }[] = [
    { key: "cart", label: "Review Items", icon: ShoppingCart },
    { key: "details", label: "Collection Details", icon: User },
    { key: "review", label: "Review & Submit", icon: FileText },
];

interface SelfPickupCheckoutFlowProps {
    onSwitchToStandard: () => void;
}

export function SelfPickupCheckoutFlow({ onSwitchToStandard }: SelfPickupCheckoutFlowProps) {
    const router = useRouter();
    const { user } = useToken();
    const { items, itemCount, totalVolume, totalWeight, clearCart } = useCart();
    const submitMutation = useSubmitSelfPickupFromCart();
    const { data: feasibilityConfig } = useFeasibilityConfig();
    const [currentStep, setCurrentStep] = useState<PickupStep>("cart");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        collector_name: "",
        collector_phone: "",
        collector_email: "",
        pickup_date: "",
        pickup_time_start: "09:00",
        pickup_time_end: "11:00",
        expected_return_date: "",
        notes: "",
    });

    // Auto-fill collector from user
    useEffect(() => {
        if (!user) return;
        setFormData((prev) => ({
            ...prev,
            collector_name: prev.collector_name || (user as any).name || "",
            collector_email: prev.collector_email || (user as any).email || "",
            collector_phone: prev.collector_phone || (user as any).phone || "",
        }));
    }, [user]);

    const canProceed = () => {
        switch (currentStep) {
            case "cart":
                return items.length > 0;
            case "details":
                return (
                    formData.collector_name &&
                    formData.collector_phone &&
                    formData.pickup_date &&
                    formData.pickup_time_start &&
                    formData.pickup_time_end
                );
            case "review":
                return true;
            default:
                return false;
        }
    };

    const handleNext = () => {
        const stepIndex = PICKUP_STEPS.findIndex((s) => s.key === currentStep);
        if (stepIndex < PICKUP_STEPS.length - 1) {
            setCurrentStep(PICKUP_STEPS[stepIndex + 1].key);
        }
    };

    const handleBack = () => {
        const stepIndex = PICKUP_STEPS.findIndex((s) => s.key === currentStep);
        if (stepIndex > 0) {
            setCurrentStep(PICKUP_STEPS[stepIndex - 1].key);
        }
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            // Compose timezone-aware ISO strings using the platform timezone.
            // Naive `${date}T${time}:00` strings get parsed by the server as
            // UTC, which for Dubai (+04:00) surfaces as a 4-hour shift on
            // display — 16:00 entered became 20:00 shown. composeZonedISO
            // resolves the correct offset at that specific moment (DST-aware,
            // half/quarter-hour zone aware). Falls back to naive composition
            // only if the platform TZ hasn't loaded yet — but the submit
            // button is disabled until formData is complete, so in practice
            // the config is always resolved by the time we get here.
            const tz = feasibilityConfig?.timezone;
            const pickupWindowStart =
                composeZonedISO({
                    date: formData.pickup_date,
                    time: formData.pickup_time_start,
                    timezone: tz,
                }) ?? `${formData.pickup_date}T${formData.pickup_time_start}:00`;
            const pickupWindowEnd =
                composeZonedISO({
                    date: formData.pickup_date,
                    time: formData.pickup_time_end,
                    timezone: tz,
                }) ?? `${formData.pickup_date}T${formData.pickup_time_end}:00`;

            const payload = {
                items: items.map((item) => ({
                    asset_id: item.assetId,
                    quantity: item.quantity,
                    ...(item.fromCollection ? { from_collection_id: item.fromCollection } : {}),
                })),
                collector_name: formData.collector_name,
                collector_phone: formData.collector_phone,
                ...(formData.collector_email ? { collector_email: formData.collector_email } : {}),
                pickup_window: {
                    start: pickupWindowStart,
                    end: pickupWindowEnd,
                },
                ...(formData.expected_return_date
                    ? {
                          // Same TZ-aware composition as the pickup window
                          // above — don't let a naive string reach the API.
                          expected_return_at:
                              composeZonedISO({
                                  date: formData.expected_return_date,
                                  time: "18:00",
                                  timezone: tz,
                              }) ?? `${formData.expected_return_date}T18:00:00`,
                      }
                    : {}),
                ...(formData.notes ? { notes: formData.notes } : {}),
            };

            const result = await submitMutation.mutateAsync(payload);
            const pickupId = result?.data?.id || result?.data?.self_pickup_id;

            toast.success("Self-pickup submitted successfully");
            clearCart();

            if (pickupId) {
                router.push(`/self-pickups/${pickupId}`);
            } else {
                router.push("/self-pickups");
            }
        } catch (error: any) {
            toast.error(error?.message || "Failed to submit self-pickup");
        } finally {
            setIsSubmitting(false);
        }
    };

    const currentStepIndex = PICKUP_STEPS.findIndex((s) => s.key === currentStep);

    return (
        <>
            {/* Progress Header — matches standard-order flow so the pickup flow
                reads as a first-class feature, not a patched-in second flow. */}
            <div className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10">
                <div className="max-w-5xl mx-auto px-8 py-6">
                    <div className="flex items-center justify-between">
                        {PICKUP_STEPS.map((step, index) => {
                            const isActive = step.key === currentStep;
                            const isCompleted = index < currentStepIndex;
                            const Icon = step.icon;

                            return (
                                <div key={step.key} className="flex items-center flex-1">
                                    <div className="flex items-center gap-3">
                                        <div
                                            className={`h-10 w-10 rounded-full flex items-center justify-center border-2 transition-all ${
                                                isCompleted
                                                    ? "bg-primary border-primary text-primary-foreground"
                                                    : isActive
                                                      ? "bg-primary/10 border-primary text-primary"
                                                      : "bg-muted border-border text-muted-foreground"
                                            }`}
                                        >
                                            {isCompleted ? (
                                                <Check className="h-5 w-5" />
                                            ) : (
                                                <Icon className="h-5 w-5" />
                                            )}
                                        </div>
                                        <div className="hidden sm:block">
                                            <p
                                                className={`text-sm font-medium font-mono uppercase tracking-wide ${
                                                    isActive
                                                        ? "text-foreground"
                                                        : "text-muted-foreground"
                                                }`}
                                            >
                                                {step.label}
                                            </p>
                                            <p className="text-xs text-muted-foreground font-mono">
                                                Step {index + 1} of {PICKUP_STEPS.length}
                                            </p>
                                        </div>
                                    </div>
                                    {index < PICKUP_STEPS.length - 1 && (
                                        <div
                                            className={`flex-1 h-0.5 mx-4 transition-colors ${
                                                isCompleted ? "bg-primary" : "bg-border"
                                            }`}
                                        />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-8 py-10">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentStep}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.25 }}
                        className="space-y-6"
                    >
                        {/* Step 1: Cart Review */}
                        {currentStep === "cart" && (
                            <>
                                <div>
                                    <h2 className="text-3xl font-bold mb-2">
                                        Review Your Collection Items
                                    </h2>
                                    <p className="text-muted-foreground">
                                        Verify your items before providing collection details
                                    </p>
                                </div>

                                <Card className="p-6 bg-card/50 border-border/50">
                                    {items.length === 0 ? (
                                        <p className="text-muted-foreground text-center py-8">
                                            Your cart is empty. Add items from the catalog first.
                                        </p>
                                    ) : (
                                        <div className="space-y-4">
                                            {items.map((item) => (
                                                <div
                                                    key={item.assetId}
                                                    className="flex gap-4 pb-4 border-b border-border last:border-0 last:pb-0"
                                                >
                                                    <div className="w-24 h-24 rounded-lg overflow-hidden border border-border shrink-0 bg-muted">
                                                        {item.image ? (
                                                            <Image
                                                                src={item.image}
                                                                alt={item.assetName}
                                                                width={96}
                                                                height={96}
                                                                className="object-cover w-full h-full"
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center">
                                                                <Package className="h-10 w-10 text-muted-foreground/30" />
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="flex-1">
                                                        <h4 className="font-semibold mb-1">
                                                            {item.assetName}
                                                        </h4>
                                                        <div className="flex items-center gap-3 text-sm text-muted-foreground font-mono mb-2">
                                                            <span>Qty: {item.quantity}</span>
                                                            {item.volume != null && (
                                                                <>
                                                                    <span>•</span>
                                                                    <span>
                                                                        {item.volume} m³ each
                                                                    </span>
                                                                </>
                                                            )}
                                                            {item.weight != null && (
                                                                <>
                                                                    <span>•</span>
                                                                    <span>
                                                                        {item.weight} kg each
                                                                    </span>
                                                                </>
                                                            )}
                                                        </div>
                                                        {item.fromCollectionName && (
                                                            <p className="text-xs text-muted-foreground font-mono">
                                                                From collection:{" "}
                                                                {item.fromCollectionName}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </Card>

                                {items.length > 0 && (
                                    <Card className="p-6 bg-primary/5 border-primary/20">
                                        <div className="grid grid-cols-3 gap-6">
                                            <div>
                                                <p className="text-xs font-mono text-muted-foreground uppercase tracking-wide mb-1">
                                                    Total Items
                                                </p>
                                                <p className="text-2xl font-bold font-mono">
                                                    {itemCount}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs font-mono text-muted-foreground uppercase tracking-wide mb-1">
                                                    Total Volume
                                                </p>
                                                <p className="text-2xl font-bold font-mono text-primary">
                                                    {totalVolume.toFixed(2)} m³
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs font-mono text-muted-foreground uppercase tracking-wide mb-1">
                                                    Total Weight
                                                </p>
                                                <p className="text-2xl font-bold font-mono">
                                                    {totalWeight.toFixed(1)} kg
                                                </p>
                                            </div>
                                        </div>
                                    </Card>
                                )}
                            </>
                        )}

                        {/* Step 2: Collection Details */}
                        {currentStep === "details" && (
                            <>
                                <div>
                                    <h2 className="text-3xl font-bold mb-2">Collection Details</h2>
                                    <p className="text-muted-foreground">
                                        Who is collecting, when, and any pickup notes
                                    </p>
                                </div>

                                <Card className="p-8 bg-card/50 border-border/50 space-y-6">
                                    <div className="space-y-4">
                                        <div className="space-y-1">
                                            <Label className="font-mono uppercase text-xs tracking-wide">
                                                Collector *
                                            </Label>
                                            <p className="text-xs text-muted-foreground">
                                                Defaults from your account. Edit if someone else is
                                                collecting.
                                            </p>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <Label
                                                    htmlFor="collector_name"
                                                    className="font-mono uppercase text-xs tracking-wide"
                                                >
                                                    Collector Name *
                                                </Label>
                                                <Input
                                                    id="collector_name"
                                                    value={formData.collector_name}
                                                    onChange={(e) =>
                                                        setFormData((prev) => ({
                                                            ...prev,
                                                            collector_name: e.target.value,
                                                        }))
                                                    }
                                                    className="h-12 font-mono"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label
                                                    htmlFor="collector_phone"
                                                    className="font-mono uppercase text-xs tracking-wide"
                                                >
                                                    Collector Phone *
                                                </Label>
                                                <Input
                                                    id="collector_phone"
                                                    value={formData.collector_phone}
                                                    onChange={(e) =>
                                                        setFormData((prev) => ({
                                                            ...prev,
                                                            collector_phone: e.target.value,
                                                        }))
                                                    }
                                                    className="h-12 font-mono"
                                                />
                                            </div>
                                            <div className="space-y-2 md:col-span-2">
                                                <Label
                                                    htmlFor="collector_email"
                                                    className="font-mono uppercase text-xs tracking-wide"
                                                >
                                                    Collector Email (optional)
                                                </Label>
                                                <Input
                                                    id="collector_email"
                                                    type="email"
                                                    value={formData.collector_email}
                                                    onChange={(e) =>
                                                        setFormData((prev) => ({
                                                            ...prev,
                                                            collector_email: e.target.value,
                                                        }))
                                                    }
                                                    className="h-12 font-mono"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4 pt-4 border-t border-border/40">
                                        <div className="space-y-1">
                                            <Label className="font-mono uppercase text-xs tracking-wide">
                                                Pickup Window *
                                            </Label>
                                            <p className="text-xs text-muted-foreground">
                                                When do you plan to collect these items from the
                                                warehouse?
                                            </p>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div className="space-y-2">
                                                <Label
                                                    htmlFor="pickup_date"
                                                    className="font-mono uppercase text-xs tracking-wide"
                                                >
                                                    Pickup Date *
                                                </Label>
                                                <Input
                                                    id="pickup_date"
                                                    type="date"
                                                    value={formData.pickup_date}
                                                    onChange={(e) =>
                                                        setFormData((prev) => ({
                                                            ...prev,
                                                            pickup_date: e.target.value,
                                                        }))
                                                    }
                                                    className="h-12 font-mono"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label
                                                    htmlFor="pickup_start"
                                                    className="font-mono uppercase text-xs tracking-wide"
                                                >
                                                    From *
                                                </Label>
                                                <Input
                                                    id="pickup_start"
                                                    type="time"
                                                    value={formData.pickup_time_start}
                                                    onChange={(e) =>
                                                        setFormData((prev) => ({
                                                            ...prev,
                                                            pickup_time_start: e.target.value,
                                                        }))
                                                    }
                                                    className="h-12 font-mono"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label
                                                    htmlFor="pickup_end"
                                                    className="font-mono uppercase text-xs tracking-wide"
                                                >
                                                    To *
                                                </Label>
                                                <Input
                                                    id="pickup_end"
                                                    type="time"
                                                    value={formData.pickup_time_end}
                                                    onChange={(e) =>
                                                        setFormData((prev) => ({
                                                            ...prev,
                                                            pickup_time_end: e.target.value,
                                                        }))
                                                    }
                                                    className="h-12 font-mono"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4 pt-4 border-t border-border/40">
                                        <div className="space-y-1">
                                            <Label className="font-mono uppercase text-xs tracking-wide">
                                                Expected Return (optional)
                                            </Label>
                                            <p className="text-xs text-muted-foreground">
                                                When do you expect to return these items? If left
                                                blank, a default window will be applied.
                                            </p>
                                        </div>
                                        <div className="max-w-xs">
                                            <Input
                                                type="date"
                                                value={formData.expected_return_date}
                                                onChange={(e) =>
                                                    setFormData((prev) => ({
                                                        ...prev,
                                                        expected_return_date: e.target.value,
                                                    }))
                                                }
                                                className="h-12 font-mono"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2 pt-4 border-t border-border/40">
                                        <Label
                                            htmlFor="notes"
                                            className="font-mono uppercase text-xs tracking-wide"
                                        >
                                            Notes (optional)
                                        </Label>
                                        <Textarea
                                            id="notes"
                                            placeholder="Any special instructions for pickup..."
                                            value={formData.notes}
                                            onChange={(e) =>
                                                setFormData((prev) => ({
                                                    ...prev,
                                                    notes: e.target.value,
                                                }))
                                            }
                                            rows={3}
                                        />
                                    </div>
                                </Card>
                            </>
                        )}

                        {/* Step 3: Review */}
                        {currentStep === "review" && (
                            <>
                                <div>
                                    <h2 className="text-3xl font-bold mb-2">Review & Submit</h2>
                                    <p className="text-muted-foreground">
                                        Confirm your pickup details before sending the request
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {/* Items */}
                                    <Card className="p-6 bg-card/50 border-border/50">
                                        <h3 className="text-lg font-semibold mb-4 font-mono uppercase tracking-wide">
                                            Items ({itemCount})
                                        </h3>
                                        <div className="space-y-3">
                                            {items.map((item) => (
                                                <div
                                                    key={item.assetId}
                                                    className="flex items-center gap-3 text-sm"
                                                >
                                                    <div className="w-12 h-12 rounded border border-border overflow-hidden shrink-0">
                                                        {item.image ? (
                                                            <Image
                                                                src={item.image}
                                                                alt={item.assetName}
                                                                width={48}
                                                                height={48}
                                                                className="object-cover"
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full bg-muted flex items-center justify-center">
                                                                <Package className="h-5 w-5 text-muted-foreground/30" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-medium truncate">
                                                            {item.assetName}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground font-mono">
                                                            Qty: {item.quantity}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="mt-4 pt-4 border-t border-border/60 space-y-2 text-sm font-mono">
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">
                                                    Total Items:
                                                </span>
                                                <span className="font-bold">{itemCount}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">
                                                    Total Volume:
                                                </span>
                                                <span className="font-bold text-primary">
                                                    {totalVolume.toFixed(2)} m³
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">
                                                    Total Weight:
                                                </span>
                                                <span className="font-bold">
                                                    {totalWeight.toFixed(1)} kg
                                                </span>
                                            </div>
                                        </div>
                                    </Card>

                                    {/* Collection Details */}
                                    <div className="space-y-6">
                                        <Card className="p-6 bg-card/50 border-border/50">
                                            <h3 className="text-lg font-semibold mb-4 font-mono uppercase tracking-wide">
                                                Collector
                                            </h3>
                                            <div className="space-y-3 text-sm">
                                                <div>
                                                    <p className="text-xs text-muted-foreground font-mono uppercase tracking-wide mb-1">
                                                        Name
                                                    </p>
                                                    <p className="font-medium">
                                                        {formData.collector_name}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-muted-foreground font-mono uppercase tracking-wide mb-1">
                                                        Phone
                                                    </p>
                                                    <p className="font-medium">
                                                        {formData.collector_phone}
                                                    </p>
                                                </div>
                                                {formData.collector_email && (
                                                    <div>
                                                        <p className="text-xs text-muted-foreground font-mono uppercase tracking-wide mb-1">
                                                            Email
                                                        </p>
                                                        <p className="font-medium">
                                                            {formData.collector_email}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </Card>

                                        <Card className="p-6 bg-card/50 border-border/50">
                                            <h3 className="text-lg font-semibold mb-4 font-mono uppercase tracking-wide">
                                                Schedule
                                            </h3>
                                            <div className="space-y-3 text-sm">
                                                <div>
                                                    <p className="text-xs text-muted-foreground font-mono uppercase tracking-wide mb-1">
                                                        Pickup
                                                    </p>
                                                    <p className="font-medium">
                                                        {formData.pickup_date}
                                                        <span className="text-muted-foreground font-mono">
                                                            {" "}
                                                            · {formData.pickup_time_start}–
                                                            {formData.pickup_time_end}
                                                        </span>
                                                    </p>
                                                </div>
                                                {formData.expected_return_date && (
                                                    <div>
                                                        <p className="text-xs text-muted-foreground font-mono uppercase tracking-wide mb-1">
                                                            Expected Return
                                                        </p>
                                                        <p className="font-medium">
                                                            {formData.expected_return_date}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </Card>

                                        {formData.notes && (
                                            <Card className="p-6 bg-card/50 border-border/50">
                                                <h3 className="text-lg font-semibold mb-4 font-mono uppercase tracking-wide">
                                                    Notes
                                                </h3>
                                                <p className="text-sm leading-relaxed">
                                                    {formData.notes}
                                                </p>
                                            </Card>
                                        )}
                                    </div>
                                </div>

                                <p className="text-sm text-muted-foreground text-center">
                                    By submitting, this pickup request will be reviewed by our
                                    logistics team. Pricing and availability will be confirmed
                                    before collection.
                                </p>
                            </>
                        )}
                    </motion.div>
                </AnimatePresence>

                {/* Navigation buttons — matches the order-flow footer layout:
                    outline Back (or "Switch to Standard" on step 0),
                    center "Step X of Y" caption, right Continue/Submit. */}
                <div className="flex items-center justify-between gap-4 mt-10">
                    {currentStepIndex === 0 ? (
                        <Button
                            variant="outline"
                            onClick={onSwitchToStandard}
                            className="gap-2 font-mono"
                            size="lg"
                        >
                            <ChevronLeft className="h-4 w-4" />
                            Switch to Delivery
                        </Button>
                    ) : (
                        <Button
                            variant="outline"
                            onClick={handleBack}
                            className="gap-2 font-mono"
                            size="lg"
                        >
                            <ChevronLeft className="h-4 w-4" />
                            Back
                        </Button>
                    )}

                    <div className="text-sm text-muted-foreground font-mono">
                        Step {currentStepIndex + 1} of {PICKUP_STEPS.length}
                    </div>

                    {currentStep === "review" ? (
                        <Button
                            onClick={handleSubmit}
                            disabled={isSubmitting || !canProceed()}
                            className="gap-2 font-mono uppercase tracking-wide"
                            size="lg"
                        >
                            {isSubmitting ? "Submitting..." : "Submit Pickup Request"}
                            <Check className="h-4 w-4" />
                        </Button>
                    ) : (
                        <Button
                            onClick={handleNext}
                            disabled={!canProceed()}
                            className="gap-2 font-mono"
                            size="lg"
                        >
                            Continue
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </div>
        </>
    );
}
