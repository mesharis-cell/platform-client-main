"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useCart } from "@/contexts/cart-context";
import { useToken } from "@/lib/auth/use-token";
import { useSubmitSelfPickupFromCart } from "@/hooks/use-self-pickups";
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
            const pickupWindowStart = `${formData.pickup_date}T${formData.pickup_time_start}:00`;
            const pickupWindowEnd = `${formData.pickup_date}T${formData.pickup_time_end}:00`;

            const payload = {
                items: items.map((item) => ({
                    asset_id: item.assetId,
                    quantity: item.quantity,
                    ...(item.fromCollection
                        ? { from_collection_id: item.fromCollection }
                        : {}),
                })),
                collector_name: formData.collector_name,
                collector_phone: formData.collector_phone,
                ...(formData.collector_email
                    ? { collector_email: formData.collector_email }
                    : {}),
                pickup_window: {
                    start: pickupWindowStart,
                    end: pickupWindowEnd,
                },
                ...(formData.expected_return_date
                    ? {
                          expected_return_at: `${formData.expected_return_date}T18:00:00`,
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
                            <Card>
                                <CardHeader>
                                    <CardTitle className="font-mono uppercase tracking-wide">
                                        Items for Collection
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {items.length === 0 ? (
                                        <p className="text-muted-foreground text-center py-8">
                                            Your cart is empty. Add items from the catalog first.
                                        </p>
                                    ) : (
                                        <>
                                            {items.map((item) => (
                                                <div
                                                    key={item.assetId}
                                                    className="flex items-center justify-between p-3 border rounded-lg"
                                                >
                                                    <div>
                                                        <p className="font-medium">
                                                            {item.assetName}
                                                        </p>
                                                        <p className="text-sm text-muted-foreground">
                                                            {item.category}
                                                        </p>
                                                    </div>
                                                    <Badge variant="outline">
                                                        <Package className="h-3 w-3 mr-1" />
                                                        {item.quantity}
                                                    </Badge>
                                                </div>
                                            ))}
                                            <div className="pt-4 border-t flex flex-wrap gap-6 text-sm font-mono">
                                                <div>
                                                    <p className="text-xs text-muted-foreground uppercase tracking-wide">
                                                        Total Items
                                                    </p>
                                                    <p className="text-lg font-bold">{itemCount}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-muted-foreground uppercase tracking-wide">
                                                        Total Volume
                                                    </p>
                                                    <p className="text-lg font-bold">
                                                        {totalVolume.toFixed(2)} m³
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-muted-foreground uppercase tracking-wide">
                                                        Total Weight
                                                    </p>
                                                    <p className="text-lg font-bold">
                                                        {totalWeight.toFixed(1)} kg
                                                    </p>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </CardContent>
                            </Card>
                        )}

                        {/* Step 2: Collection Details */}
                        {currentStep === "details" && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="font-mono uppercase tracking-wide">
                                        Who is collecting?
                                    </CardTitle>
                                    <p className="text-sm text-muted-foreground">
                                        These details default from your account. Edit if someone
                                        else is collecting.
                                    </p>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="collector_name">
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
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="collector_phone">
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
                                            />
                                        </div>
                                        <div className="space-y-2 md:col-span-2">
                                            <Label htmlFor="collector_email">
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
                                            />
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t space-y-4">
                                        <h3 className="font-medium font-mono uppercase tracking-wide text-sm">
                                            When are you collecting? *
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="pickup_date">Date</Label>
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
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="pickup_start">From</Label>
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
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="pickup_end">To</Label>
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
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t space-y-4">
                                        <h3 className="font-medium font-mono uppercase tracking-wide text-sm">
                                            Expected Return (optional)
                                        </h3>
                                        <p className="text-sm text-muted-foreground">
                                            When do you expect to return these items? If left
                                            blank, a default window will be applied.
                                        </p>
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
                                            />
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t space-y-2">
                                        <Label htmlFor="notes">Notes (optional)</Label>
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
                                </CardContent>
                            </Card>
                        )}

                        {/* Step 3: Review */}
                        {currentStep === "review" && (
                            <div className="space-y-6">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="font-mono uppercase tracking-wide">
                                            Review Your Self-Pickup
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <p className="text-xs text-muted-foreground font-mono uppercase tracking-wide mb-1">
                                                    Collector
                                                </p>
                                                <p className="font-medium">
                                                    {formData.collector_name}
                                                </p>
                                                <p>{formData.collector_phone}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground font-mono uppercase tracking-wide mb-1">
                                                    Collection Date
                                                </p>
                                                <p className="font-medium">
                                                    {formData.pickup_date}
                                                </p>
                                                <p>
                                                    {formData.pickup_time_start} –{" "}
                                                    {formData.pickup_time_end}
                                                </p>
                                            </div>
                                        </div>
                                        {formData.expected_return_date && (
                                            <div className="text-sm">
                                                <p className="text-xs text-muted-foreground font-mono uppercase tracking-wide mb-1">
                                                    Expected Return
                                                </p>
                                                <p className="font-medium">
                                                    {formData.expected_return_date}
                                                </p>
                                            </div>
                                        )}
                                        {formData.notes && (
                                            <div className="text-sm">
                                                <p className="text-xs text-muted-foreground font-mono uppercase tracking-wide mb-1">
                                                    Notes
                                                </p>
                                                <p>{formData.notes}</p>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle className="font-mono uppercase tracking-wide">
                                            Items ({itemCount})
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        {items.map((item) => (
                                            <div
                                                key={item.assetId}
                                                className="flex items-center justify-between py-2 border-b last:border-0"
                                            >
                                                <span>{item.assetName}</span>
                                                <span className="text-muted-foreground font-mono">
                                                    x{item.quantity}
                                                </span>
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>

                                <p className="text-sm text-muted-foreground text-center">
                                    By submitting, this pickup request will be reviewed by our
                                    logistics team. Pricing and availability will be confirmed
                                    before collection.
                                </p>
                            </div>
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
                        </Button>
                    ) : (
                        <Button
                            onClick={handleNext}
                            disabled={!canProceed()}
                            className="gap-2 font-mono uppercase tracking-wide"
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
