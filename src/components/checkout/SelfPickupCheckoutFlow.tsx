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
import { categoryLabel } from "@/lib/category-display";
import {
    ShoppingCart,
    User,
    Clock,
    FileText,
    ArrowLeft,
    ArrowRight,
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
        pickup_time_start: "",
        pickup_time_end: "",
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
        <div className="space-y-8">
            {/* Step Indicator */}
            <div className="flex items-center justify-center gap-2">
                {PICKUP_STEPS.map((step, index) => {
                    const isActive = step.key === currentStep;
                    const isCompleted = index < currentStepIndex;
                    const Icon = step.icon;

                    return (
                        <div
                            key={step.key}
                            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm
                                ${isActive ? "bg-primary text-primary-foreground" : ""}
                                ${isCompleted ? "text-primary" : "text-muted-foreground"}`}
                        >
                            {isCompleted ? (
                                <Check className="h-4 w-4" />
                            ) : (
                                <Icon className="h-4 w-4" />
                            )}
                            <span className="hidden sm:inline">{step.label}</span>
                        </div>
                    );
                })}
            </div>

            {/* Step Content */}

            {/* Step 1: Cart Review */}
            {currentStep === "cart" && (
                <Card>
                    <CardHeader>
                        <CardTitle>Items for Collection</CardTitle>
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
                                            <p className="font-medium">{item.assetName}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {categoryLabel(item.category)}
                                            </p>
                                        </div>
                                        <Badge variant="outline">
                                            <Package className="h-3 w-3 mr-1" />
                                            {item.quantity}
                                        </Badge>
                                    </div>
                                ))}
                                <div className="pt-4 border-t flex justify-between text-sm">
                                    <span className="text-muted-foreground">
                                        {itemCount} items | {totalVolume.toFixed(3)} m3 |{" "}
                                        {totalWeight.toFixed(2)} kg
                                    </span>
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
                        <CardTitle>Who is collecting?</CardTitle>
                        <p className="text-sm text-muted-foreground">
                            These details default from your account. Edit if someone else is
                            collecting.
                        </p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="collector_name">Collector Name *</Label>
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
                                <Label htmlFor="collector_phone">Collector Phone *</Label>
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
                            <h3 className="font-medium">When are you collecting? *</h3>
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
                            <h3 className="font-medium">Expected Return (optional)</h3>
                            <p className="text-sm text-muted-foreground">
                                When do you expect to return these items? If left blank, a
                                default window will be applied.
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
                <div className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Review Your Self-Pickup</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-muted-foreground">Collector</p>
                                    <p className="font-medium">{formData.collector_name}</p>
                                    <p>{formData.collector_phone}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Collection Date</p>
                                    <p className="font-medium">{formData.pickup_date}</p>
                                    <p>
                                        {formData.pickup_time_start} - {formData.pickup_time_end}
                                    </p>
                                </div>
                            </div>
                            {formData.expected_return_date && (
                                <div className="text-sm">
                                    <p className="text-muted-foreground">Expected Return</p>
                                    <p className="font-medium">{formData.expected_return_date}</p>
                                </div>
                            )}
                            {formData.notes && (
                                <div className="text-sm">
                                    <p className="text-muted-foreground">Notes</p>
                                    <p>{formData.notes}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Items ({itemCount})</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {items.map((item) => (
                                <div
                                    key={item.assetId}
                                    className="flex items-center justify-between py-2 border-b last:border-0"
                                >
                                    <span>{item.assetName}</span>
                                    <span className="text-muted-foreground">x{item.quantity}</span>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    <p className="text-sm text-muted-foreground text-center">
                        By submitting, this pickup request will be reviewed by our logistics
                        team. Pricing and availability will be confirmed before collection.
                    </p>
                </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between">
                <div>
                    {currentStepIndex === 0 ? (
                        <Button variant="ghost" onClick={onSwitchToStandard}>
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Switch to Standard Order
                        </Button>
                    ) : (
                        <Button variant="outline" onClick={handleBack}>
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back
                        </Button>
                    )}
                </div>
                <div>
                    {currentStep === "review" ? (
                        <Button
                            onClick={handleSubmit}
                            disabled={isSubmitting || !canProceed()}
                        >
                            {isSubmitting ? "Submitting..." : "Submit Pickup Request"}
                        </Button>
                    ) : (
                        <Button onClick={handleNext} disabled={!canProceed()}>
                            Next
                            <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
