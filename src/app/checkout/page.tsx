"use client";

/**
 * Checkout Flow - Multi-Step Order Creation
 *
 * Design: Linear progress with clear validation and feedback
 * Steps: Review Cart → Event Details → Venue Info → Contact → Review & Submit
 */

import { OrderEstimate } from "@/components/checkout/OrderEstimate";
import { OrangeDecisionCard } from "@/components/checkout/OrangeDecisionCard";
import { RedFeasibilityAlert } from "@/components/checkout/RedFeasibilityAlert";
import { ClientNav } from "@/components/client-nav";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useCart } from "@/contexts/cart-context";
import { useCalculateEstimate } from "@/hooks/use-order-submission";
import { useSubmitOrderFromCart } from "@/hooks/use-orders";
import type { TripType } from "@/types/hybrid-pricing";
import { AnimatePresence, motion } from "framer-motion";
import {
    AlertCircle,
    Calendar,
    Check,
    ChevronLeft,
    ChevronRight,
    FileText,
    MapPin,
    Package,
    ShoppingCart,
    User,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api/api-client";
import { useGetCountries } from "@/hooks/use-pricing-tiers";
import { useToken } from "@/lib/auth/use-token";
import { useCompany } from "@/hooks/use-companies";
import {
    useMaintenanceFeasibilityCheck,
    type MaintenanceFeasibilityIssue,
} from "@/hooks/use-feasibility-check";

type Step = "cart" | "event" | "venue" | "contact" | "review";

const STEPS: { key: Step; label: string; icon: any }[] = [
    { key: "cart", label: "Order Review", icon: ShoppingCart },
    { key: "event", label: "Event Details", icon: Calendar },
    { key: "venue", label: "Venue Info", icon: MapPin },
    { key: "contact", label: "Contact", icon: User },
    { key: "review", label: "Review", icon: FileText },
];

function CheckoutPageInner() {
    const router = useRouter();
    const { user } = useToken();
    const { data: companyData } = useCompany(user?.company_id || undefined);
    const {
        items,
        itemCount,
        totalVolume,
        totalWeight,
        clearCart,
        isInitialized,
        updateItemMaintenanceDecision,
    } = useCart();
    const [currentStep, setCurrentStep] = useState<Step>("cart");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [availabilityIssues, setAvailabilityIssues] = useState<string[]>([]);
    const [useCustomCountry, setUseCustomCountry] = useState(false);
    const [useCustomCity, setUseCustomCity] = useState(false);
    const [maintenanceFeasibilityIssues, setMaintenanceFeasibilityIssues] = useState<
        MaintenanceFeasibilityIssue[]
    >([]);
    const [hasCheckedMaintenanceFeasibility, setHasCheckedMaintenanceFeasibility] = useState(false);
    const isEstimateFeatureEnabled =
        companyData?.data?.features?.show_estimate_on_order_creation === true;

    // Mutations
    const submitMutation = useSubmitOrderFromCart();
    const maintenanceFeasibilityCheck = useMaintenanceFeasibilityCheck();

    // Form state
    const [formData, setFormData] = useState({
        brand_id: undefined,
        event_start_date: "",
        event_end_date: "",
        venue_name: "",
        venue_country_id: "",
        venue_country_name: "",
        venue_city_id: "",
        venue_city_name: "",
        venue_address: "",
        venue_access_notes: "",
        contact_name: "",
        contact_email: "",
        contact_phone: "",
        special_instructions: "",
        trip_type: "ROUND_TRIP" as TripType, // NEW
    });

    const hasRebrandItems = items.some((item) => item.isReskinRequest);
    const isAllGreenItems = items.every((item) => item.condition === "GREEN");
    const orangeItems = items.filter((item) => item.condition === "ORANGE");
    const redItems = items.filter((item) => item.condition === "RED");
    const missingOrangeDecisions = orangeItems.filter((item) => !item.maintenanceDecision);

    // NEW: Calculate estimate using new system
    const {
        data: estimateData,
        isLoading: isEstimateLoading,
        isError: isEstimateError,
    } = useCalculateEstimate(
        items,
        formData.venue_city_id,
        formData.trip_type,
        currentStep === "review" && !!formData.venue_city_id && isEstimateFeatureEnabled
    );

    // Calculate minimum allowed date (Today + 6 days)
    // "disable prev data also 5 days after current date. measn including current and 5 days after today will be disable."
    const calculateMinDate = () => {
        const date = new Date();
        date.setDate(date.getDate() + 6);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    };

    // NEW: Get countries
    const { data: countriesData } = useGetCountries();

    // NEW: Get cities based on selected country
    const cities = formData.venue_country_id
        ? (countriesData?.data?.find((country) => country.id === formData.venue_country_id)
              ?.cities ?? [])
        : [];

    // Validate cart availability before review step
    useEffect(() => {
        const validateAvailability = async () => {
            if (items.length === 0 || currentStep !== "review") return;

            try {
                const assetIds = items.map((i) => i.assetId);
                const response = await apiClient.post("/operations/v1/asset/batch-availability", {
                    asset_ids: assetIds,
                });

                if (!response.data.success) {
                    console.error("Failed to validate availability");
                    return;
                }

                const assets = response.data.data;
                const issues: string[] = [];

                items.forEach((item) => {
                    const asset = assets.find((a: any) => a.id === item.assetId);

                    if (!asset || asset.status !== "AVAILABLE") {
                        issues.push(`${item.assetName} is no longer available`);
                    } else if (item.quantity > asset.available_quantity) {
                        issues.push(
                            `${item.assetName}: only ${asset.available_quantity} available (you have ${item.quantity})`
                        );
                    }
                });

                setAvailabilityIssues(issues);
            } catch (error) {
                console.error("Error validating availability:", error);
            }
        };

        validateAvailability();
    }, [items, currentStep]);

    useEffect(() => {
        if (redItems.length > 0) return;
        setHasCheckedMaintenanceFeasibility(false);
        setMaintenanceFeasibilityIssues([]);
    }, [redItems.length]);

    // Estimate is now handled by useCalculateEstimate hook above

    // Redirect if cart is empty
    useEffect(() => {
        if (items.length === 0 && currentStep !== "cart") {
            router.push("/catalog");
        }
    }, [items.length, currentStep, router]);

    const currentStepIndex = STEPS.findIndex((s) => s.key === currentStep);

    const canProceed = () => {
        switch (currentStep) {
            case "cart":
                return items.length > 0;
            case "event":
                return (
                    formData.event_start_date &&
                    formData.event_end_date &&
                    new Date(formData.event_start_date) <= new Date(formData.event_end_date)
                );
            case "venue":
                return (
                    formData.venue_name &&
                    formData.venue_country_id &&
                    formData.venue_city_id &&
                    formData.venue_address
                );
            case "contact":
                return formData.contact_name && formData.contact_email && formData.contact_phone;
            case "review":
                return true;
            default:
                return false;
        }
    };

    const handleNext = async () => {
        if (!canProceed()) {
            toast.error("Please fill all required fields");
            return;
        }

        if (currentStep === "event" && redItems.length > 0) {
            try {
                const result = await maintenanceFeasibilityCheck.mutateAsync({
                    items: redItems.map((item) => ({
                        asset_id: item.assetId,
                        maintenance_decision: "FIX_IN_ORDER",
                    })),
                    event_start_date: formData.event_start_date,
                });
                setHasCheckedMaintenanceFeasibility(true);
                setMaintenanceFeasibilityIssues(result.issues || []);

                if (!result.feasible) {
                    toast.error(
                        "Some maintenance items cannot be completed before event. Choose a later start date."
                    );
                    return;
                }
            } catch (error) {
                toast.error(error instanceof Error ? error.message : "Failed feasibility check");
                return;
            }
        }

        const nextIndex = currentStepIndex + 1;
        if (nextIndex < STEPS.length) {
            setCurrentStep(STEPS[nextIndex].key);
        }
    };

    const handleBack = () => {
        const prevIndex = currentStepIndex - 1;
        if (prevIndex >= 0) {
            setCurrentStep(STEPS[prevIndex].key);
        }
    };

    const handleSubmit = async () => {
        if (missingOrangeDecisions.length > 0) {
            toast.error("Select a maintenance decision for all ORANGE items before submitting");
            return;
        }
        if (availabilityIssues.length > 0) {
            toast.error("Please resolve availability issues before submitting");
            return;
        }

        if (items.length === 0) {
            toast.error("Cart is empty");
            return;
        }

        setIsSubmitting(true);
        try {
            const maintenanceResult = await maintenanceFeasibilityCheck.mutateAsync({
                items: items.map((item) => ({
                    asset_id: item.assetId,
                    maintenance_decision: item.maintenanceDecision,
                })),
                event_start_date: formData.event_start_date,
            });

            setHasCheckedMaintenanceFeasibility(true);
            setMaintenanceFeasibilityIssues(maintenanceResult.issues || []);
            if (!maintenanceResult.feasible) {
                const details = maintenanceResult.issues
                    .map((issue) => `${issue.asset_name}: ${issue.earliest_feasible_date}`)
                    .join(" | ");
                toast.error(`Maintenance timeline is not feasible. ${details}`);
                return;
            }

            // For payload: send ID if from dropdown, or name if custom
            const submitData = {
                items: items.map((item) => ({
                    asset_id: item.assetId,
                    quantity: item.quantity,
                    from_collection_id: item.fromCollection,
                    // Include reskin fields
                    is_reskin_request: item.isReskinRequest || false,
                    reskin_target_brand_id: item.reskinTargetBrandId,
                    reskin_target_brand_custom: item.reskinTargetBrandCustom,
                    reskin_notes: item.reskinNotes,
                    maintenance_decision: item.maintenanceDecision,
                })),
                ...formData,
                // Send ID if from dropdown, or custom text if custom mode
                venue_country_id: useCustomCountry
                    ? formData.venue_country_id
                    : formData.venue_country_id,
                venue_city_id: useCustomCity ? formData.venue_city_id : formData.venue_city_id,
                venue_city_name: undefined,
                venue_country_name: undefined,
                trip_type: formData.trip_type, // Include trip type
            };

            const result = await submitMutation.mutateAsync(submitData);

            toast.success("Order submitted successfully!", {
                description: `Order ID: ${result.orderId}`,
            });

            clearCart();
            router.push(`/orders/${result.orderId}`);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to submit order");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Show loading while cart initializes
    if (!isInitialized) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center">
                    <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-sm text-muted-foreground font-mono">Loading cart...</p>
                </div>
            </div>
        );
    }

    if (items.length === 0) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-8">
                <Card className="max-w-md w-full p-10 text-center">
                    <div className="h-20 w-20 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-6">
                        <ShoppingCart className="h-10 w-10 text-muted-foreground/50" />
                    </div>
                    <h2 className="text-2xl font-bold mb-3">Your cart is empty</h2>
                    <p className="text-muted-foreground mb-6">
                        Add items to your cart before proceeding to checkout
                    </p>
                    <Button onClick={() => router.push("/catalog")} className="gap-2 font-mono">
                        <Package className="h-4 w-4" />
                        Browse Catalog
                    </Button>
                </Card>
            </div>
        );
    }

    console.log("items from checkout......", items);

    return (
        <div className="min-h-screen bg-linear-to-br from-background via-muted/10 to-background">
            {/* Progress Header */}
            <div className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10">
                <div className="max-w-5xl mx-auto px-8 py-6">
                    <div className="flex items-center justify-between">
                        {STEPS.map((step, index) => {
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
                                        <div
                                            className={`hidden sm:block ${index < STEPS.length - 1 ? "" : ""}`}
                                        >
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
                                                Step {index + 1} of {STEPS.length}
                                            </p>
                                        </div>
                                    </div>
                                    {index < STEPS.length - 1 && (
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

            {/* warning if any item condition is red or orange */}

            {items.length > 0 && (
                <div className="max-w-5xl mx-auto px-8 pt-10">
                    {items.some(
                        (item) => item.condition === "RED" || item.condition === "ORANGE"
                    ) && (
                        <div className="bg-yellow-50 border-yellow-200 border rounded-lg p-4 mb-6">
                            <div className="flex items-center">
                                <div className="shrink-0">
                                    <AlertCircle className="h-5 w-5 text-yellow-400" />
                                </div>
                                <div className="ml-3">
                                    <h3 className="text-sm font-medium text-yellow-800">
                                        Maintenance Required
                                    </h3>
                                    <div className="mt-2 text-sm text-yellow-700">
                                        <p>
                                            Your order contain item(s) require maintenance. It may
                                            require some time to prepare.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Content */}
            <div className="max-w-5xl mx-auto px-8 py-10">
                <AnimatePresence mode="wait">
                    {/* Step 1: Cart Review */}
                    {currentStep === "cart" && (
                        <motion.div
                            key="cart"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3 }}
                            className="space-y-6"
                        >
                            <div>
                                <h2 className="text-3xl font-bold mb-2">Review Your Order</h2>
                                <p className="text-muted-foreground">
                                    Verify your items before proceeding to event details
                                </p>
                            </div>

                            <Card className="p-6 bg-card/50 border-border/50">
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
                                                    <span>•</span>
                                                    <span>{item.volume} m³ each</span>
                                                    <span>•</span>
                                                    <span>{item.weight} kg each</span>
                                                </div>
                                                {(item.condition === "RED" ||
                                                    item.condition === "ORANGE") && (
                                                    <p className="text-xs text-red-500 font-mono">
                                                        Attention: This item requires maintenance{" "}
                                                        <br />
                                                        Condition: {item.condition}
                                                    </p>
                                                )}
                                                {item.fromCollectionName && (
                                                    <p className="text-xs text-muted-foreground font-mono">
                                                        From collection: {item.fromCollectionName}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </Card>

                            {/* Totals Card */}
                            <Card className="p-6 bg-primary/5 border-primary/20">
                                <div className="grid grid-cols-3 gap-6">
                                    <div>
                                        <p className="text-xs font-mono text-muted-foreground uppercase tracking-wide mb-1">
                                            Total Items
                                        </p>
                                        <p className="text-2xl font-bold font-mono">{itemCount}</p>
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
                        </motion.div>
                    )}

                    {/* Step 2: Event Details */}
                    {currentStep === "event" && (
                        <motion.div
                            key="event"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3 }}
                            className="space-y-6"
                        >
                            <div>
                                <h2 className="text-3xl font-bold mb-2">Event Details</h2>
                                <p className="text-muted-foreground">
                                    When do you need these assets?
                                </p>
                            </div>

                            <Card className="p-8 bg-card/50 border-border/50 space-y-6">
                                <div className="space-y-6">
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label
                                                htmlFor="eventStartDate"
                                                className="font-mono uppercase text-xs tracking-wide"
                                            >
                                                Event Start Date *
                                            </Label>
                                            <Input
                                                id="eventStartDate"
                                                type="date"
                                                value={formData.event_start_date}
                                                onChange={(e) => {
                                                    setFormData({
                                                        ...formData,
                                                        event_start_date: e.target.value,
                                                    });
                                                    setHasCheckedMaintenanceFeasibility(false);
                                                    setMaintenanceFeasibilityIssues([]);
                                                }}
                                                required
                                                min={calculateMinDate()}
                                                className="h-12 font-mono"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label
                                                htmlFor="eventEndDate"
                                                className="font-mono uppercase text-xs tracking-wide"
                                            >
                                                Event End Date *
                                            </Label>
                                            <Input
                                                id="eventEndDate"
                                                type="date"
                                                value={formData.event_end_date}
                                                onChange={(e) => {
                                                    setFormData({
                                                        ...formData,
                                                        event_end_date: e.target.value,
                                                    });
                                                    setHasCheckedMaintenanceFeasibility(false);
                                                    setMaintenanceFeasibilityIssues([]);
                                                }}
                                                required
                                                min={
                                                    formData.event_start_date || calculateMinDate()
                                                }
                                                className="h-12 font-mono"
                                            />
                                        </div>
                                    </div>

                                    {formData.event_start_date && formData.event_end_date && (
                                        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                                            <div className="flex items-center gap-3">
                                                <Calendar className="h-5 w-5 text-primary" />
                                                <div>
                                                    <p className="text-sm font-medium">
                                                        Event Duration
                                                    </p>
                                                    <p className="text-xs text-muted-foreground font-mono">
                                                        {Math.ceil(
                                                            (new Date(
                                                                formData.event_end_date
                                                            ).getTime() -
                                                                new Date(
                                                                    formData.event_start_date
                                                                ).getTime()) /
                                                                (1000 * 60 * 60 * 24)
                                                        ) + 1}{" "}
                                                        days
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {redItems.length > 0 && (
                                        <div className="space-y-3">
                                            <Card className="p-4 border-red-300 bg-red-50/40">
                                                <p className="text-sm text-red-800">
                                                    Your cart includes RED items. These are fix-only
                                                    items and must pass feasibility before you can
                                                    continue.
                                                </p>
                                            </Card>
                                            <RedFeasibilityAlert
                                                issues={maintenanceFeasibilityIssues}
                                                hasChecked={hasCheckedMaintenanceFeasibility}
                                                isChecking={maintenanceFeasibilityCheck.isPending}
                                            />
                                        </div>
                                    )}
                                </div>
                            </Card>
                        </motion.div>
                    )}

                    {/* Step 3: Venue Information */}
                    {currentStep === "venue" && (
                        <motion.div
                            key="venue"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3 }}
                            className="space-y-6"
                        >
                            <div>
                                <h2 className="text-3xl font-bold mb-2">Venue Information</h2>
                                <p className="text-muted-foreground">
                                    Where will the event take place?
                                </p>
                            </div>

                            <Card className="p-8 bg-card/50 border-border/50">
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <Label
                                            htmlFor="venueName"
                                            className="font-mono uppercase text-xs tracking-wide"
                                        >
                                            Transport Trip Type
                                        </Label>
                                        <Select
                                            value={formData.trip_type}
                                            onValueChange={(value) =>
                                                setFormData({
                                                    ...formData,
                                                    trip_type: value as TripType,
                                                })
                                            }
                                            required
                                        >
                                            <SelectTrigger className="h-12">
                                                <SelectValue placeholder="Select Transport Trip Type" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="ROUND_TRIP">
                                                    Round Trip
                                                </SelectItem>
                                                <SelectItem value="ONE_WAY">One Way</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label
                                            htmlFor="venueName"
                                            className="font-mono uppercase text-xs tracking-wide"
                                        >
                                            Venue Name *
                                        </Label>
                                        <Input
                                            id="venueName"
                                            value={formData.venue_name}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    venue_name: e.target.value,
                                                })
                                            }
                                            placeholder="e.g., Dubai Festival City"
                                            required
                                            className="h-12"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label
                                                htmlFor="venueCountry"
                                                className="font-mono uppercase text-xs tracking-wide"
                                            >
                                                Country *
                                            </Label>
                                            {!useCustomCountry ? (
                                                <Select
                                                    value={formData.venue_country_id}
                                                    onValueChange={(value) => {
                                                        if (value === "_custom_") {
                                                            setUseCustomCountry(true);
                                                            setUseCustomCity(true);
                                                            setFormData({
                                                                ...formData,
                                                                venue_country_id: "",
                                                                venue_country_name: "",
                                                                venue_city_id: "",
                                                                venue_city_name: "",
                                                            });
                                                        } else {
                                                            const selectedCountry =
                                                                countriesData?.data?.find(
                                                                    (c) => c.id === value
                                                                );
                                                            setUseCustomCity(false);
                                                            setFormData({
                                                                ...formData,
                                                                venue_country_id: value,
                                                                venue_country_name:
                                                                    selectedCountry?.name || "",
                                                                venue_city_id: "",
                                                                venue_city_name: "",
                                                            });
                                                        }
                                                    }}
                                                >
                                                    <SelectTrigger className="h-12 font-mono">
                                                        <SelectValue placeholder="Select country" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {countriesData?.data?.map((country) => (
                                                            <SelectItem
                                                                key={country.id}
                                                                value={country.id}
                                                                className="font-mono"
                                                            >
                                                                {country.name}
                                                            </SelectItem>
                                                        ))}
                                                        {/* <SelectItem
                                                            value="_custom_"
                                                            className="font-mono text-primary"
                                                        >
                                                            + Enter custom location
                                                        </SelectItem> */}
                                                    </SelectContent>
                                                </Select>
                                            ) : (
                                                <div className="flex gap-2">
                                                    <Input
                                                        id="venueCountry"
                                                        value={formData.venue_country_id}
                                                        onChange={(e) =>
                                                            setFormData({
                                                                ...formData,
                                                                venue_country_id: e.target.value,
                                                                venue_country_name: e.target.value,
                                                            })
                                                        }
                                                        placeholder="e.g., UAE"
                                                        required
                                                        className="h-12"
                                                    />
                                                    <Button
                                                        variant="outline"
                                                        onClick={() => {
                                                            setUseCustomCountry(false);
                                                            setUseCustomCity(false);
                                                            setFormData({
                                                                ...formData,
                                                                venue_country_id: "",
                                                                venue_country_name: "",
                                                                venue_city_id: "",
                                                                venue_city_name: "",
                                                            });
                                                        }}
                                                        className="h-12 px-4"
                                                    >
                                                        Cancel
                                                    </Button>
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <Label
                                                htmlFor="venueCity"
                                                className="font-mono uppercase text-xs tracking-wide"
                                            >
                                                City *
                                            </Label>
                                            {!useCustomCity ? (
                                                <Select
                                                    value={formData.venue_city_id}
                                                    onValueChange={(value) => {
                                                        if (value === "_custom_") {
                                                            setUseCustomCity(true);
                                                            setFormData({
                                                                ...formData,
                                                                venue_city_id: "",
                                                                venue_city_name: "",
                                                            });
                                                        } else {
                                                            const selectedCity = cities.find(
                                                                (c) => c.id === value
                                                            );
                                                            setFormData({
                                                                ...formData,
                                                                venue_city_id: value,
                                                                venue_city_name:
                                                                    selectedCity?.name || "",
                                                            });
                                                        }
                                                    }}
                                                    disabled={!formData.venue_country_id}
                                                >
                                                    <SelectTrigger className="h-12 font-mono">
                                                        <SelectValue
                                                            placeholder={
                                                                formData.venue_country_id
                                                                    ? "Select city"
                                                                    : "Select country first"
                                                            }
                                                        />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {cities.map((city) => (
                                                            <SelectItem
                                                                key={city.id}
                                                                value={city.id}
                                                                className="font-mono"
                                                            >
                                                                {city.name}
                                                            </SelectItem>
                                                        ))}
                                                        {/* {cities.length > 0 && (
                                                            <SelectItem
                                                                value="_custom_"
                                                                className="font-mono text-primary"
                                                            >
                                                                + Enter custom city
                                                            </SelectItem>
                                                        )} */}
                                                    </SelectContent>
                                                </Select>
                                            ) : (
                                                <div className="flex gap-2">
                                                    <Input
                                                        id="venueCity"
                                                        value={formData.venue_city_id}
                                                        onChange={(e) =>
                                                            setFormData({
                                                                ...formData,
                                                                venue_city_id: e.target.value,
                                                                venue_city_name: e.target.value,
                                                            })
                                                        }
                                                        placeholder="e.g., Dubai"
                                                        required
                                                        className="h-12"
                                                    />
                                                    {!useCustomCountry && (
                                                        <Button
                                                            variant="outline"
                                                            onClick={() => {
                                                                setUseCustomCity(false);
                                                                setFormData({
                                                                    ...formData,
                                                                    venue_city_id: "",
                                                                    venue_city_name: "",
                                                                });
                                                            }}
                                                            className="h-12 px-4"
                                                        >
                                                            Cancel
                                                        </Button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label
                                            htmlFor="venueAddress"
                                            className="font-mono uppercase text-xs tracking-wide"
                                        >
                                            Full Address *
                                        </Label>
                                        <Textarea
                                            id="venueAddress"
                                            value={formData.venue_address}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    venue_address: e.target.value,
                                                })
                                            }
                                            placeholder="Complete venue address"
                                            required
                                            rows={3}
                                            className="font-mono text-sm"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label
                                            htmlFor="venueAccessNotes"
                                            className="font-mono uppercase text-xs tracking-wide"
                                        >
                                            Access Notes (Optional)
                                        </Label>
                                        <Textarea
                                            id="venueAccessNotes"
                                            value={formData.venue_access_notes}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    venue_access_notes: e.target.value,
                                                })
                                            }
                                            placeholder="Loading dock information, access codes, etc."
                                            rows={2}
                                            className="font-mono text-sm"
                                        />
                                    </div>
                                </div>
                            </Card>
                        </motion.div>
                    )}

                    {/* Step 4: Contact Information */}
                    {currentStep === "contact" && (
                        <motion.div
                            key="contact"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3 }}
                            className="space-y-6"
                        >
                            <div>
                                <h2 className="text-3xl font-bold mb-2">Contact Information</h2>
                                <p className="text-muted-foreground">
                                    Who should we contact about this order?
                                </p>
                            </div>

                            <Card className="p-8 bg-card/50 border-border/50">
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <Label
                                            htmlFor="contactName"
                                            className="font-mono uppercase text-xs tracking-wide"
                                        >
                                            Contact Person Name *
                                        </Label>
                                        <Input
                                            id="contactName"
                                            value={formData.contact_name}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    contact_name: e.target.value,
                                                })
                                            }
                                            placeholder="e.g., John Smith"
                                            required
                                            className="h-12"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label
                                                htmlFor="contactEmail"
                                                className="font-mono uppercase text-xs tracking-wide"
                                            >
                                                Email Address *
                                            </Label>
                                            <Input
                                                id="contactEmail"
                                                type="email"
                                                value={formData.contact_email}
                                                onChange={(e) =>
                                                    setFormData({
                                                        ...formData,
                                                        contact_email: e.target.value,
                                                    })
                                                }
                                                placeholder="john@company.com"
                                                required
                                                className="h-12"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label
                                                htmlFor="contactPhone"
                                                className="font-mono uppercase text-xs tracking-wide"
                                            >
                                                Phone Number *
                                            </Label>
                                            <Input
                                                id="contactPhone"
                                                type="tel"
                                                value={formData.contact_phone}
                                                onChange={(e) =>
                                                    setFormData({
                                                        ...formData,
                                                        contact_phone: e.target.value,
                                                    })
                                                }
                                                placeholder="+971 50 123 4567"
                                                required
                                                className="h-12"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label
                                            htmlFor="specialInstructions"
                                            className="font-mono uppercase text-xs tracking-wide"
                                        >
                                            Special Instructions (Optional)
                                        </Label>
                                        <Textarea
                                            id="specialInstructions"
                                            value={formData.special_instructions}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    special_instructions: e.target.value,
                                                })
                                            }
                                            placeholder="Any special handling requirements, setup preferences, or branding requests..."
                                            rows={4}
                                            className="font-mono text-sm"
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Include details about setup, branding, or any special
                                            requirements
                                        </p>
                                    </div>
                                </div>
                            </Card>
                        </motion.div>
                    )}

                    {/* Step 5: Review & Submit */}
                    {currentStep === "review" && (
                        <motion.div
                            key="review"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3 }}
                            className="space-y-6"
                        >
                            <div>
                                <h2 className="text-3xl font-bold mb-2">Review & Submit</h2>
                                <p className="text-muted-foreground">
                                    Double-check all details before submitting your order
                                </p>
                            </div>

                            {orangeItems.length > 0 && (
                                <Card className="p-6 border-amber-300 bg-amber-50/40 space-y-4">
                                    <div>
                                        <h3 className="text-lg font-semibold text-amber-900">
                                            ORANGE Item Decisions Required
                                        </h3>
                                        <p className="text-sm text-amber-800">
                                            Choose fix-or-use for each ORANGE item before submit.
                                        </p>
                                    </div>

                                    <div className="space-y-3">
                                        {orangeItems.map((item) => (
                                            <OrangeDecisionCard
                                                key={item.assetId}
                                                assetName={item.assetName}
                                                decision={item.maintenanceDecision}
                                                onDecisionChange={(decision) => {
                                                    setHasCheckedMaintenanceFeasibility(false);
                                                    setMaintenanceFeasibilityIssues([]);
                                                    updateItemMaintenanceDecision(
                                                        item.assetId,
                                                        decision
                                                    );
                                                }}
                                            />
                                        ))}
                                    </div>

                                    {missingOrangeDecisions.length > 0 && (
                                        <p className="text-sm text-destructive font-medium">
                                            {missingOrangeDecisions.length} ORANGE item(s) still
                                            need a decision.
                                        </p>
                                    )}
                                </Card>
                            )}

                            {/* Order Summary */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Items */}
                                <Card className="p-6 bg-card/50 border-border/50">
                                    <h3 className="text-lg font-semibold mb-4 font-mono uppercase tracking-wide">
                                        Order Items
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

                                    <Separator className="my-4" />

                                    <div className="space-y-2 text-sm font-mono">
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

                                {/* Details Summary */}
                                <div className="space-y-6">
                                    {/* Event Info */}
                                    <Card className="p-6 bg-card/50 border-border/50">
                                        <h3 className="text-lg font-semibold mb-4 font-mono uppercase tracking-wide">
                                            Event
                                        </h3>
                                        <div className="space-y-3 text-sm">
                                            <div>
                                                <p className="text-xs text-muted-foreground font-mono uppercase tracking-wide mb-1">
                                                    Start Date
                                                </p>
                                                <p className="font-medium">
                                                    {new Date(
                                                        formData.event_start_date
                                                    ).toLocaleDateString("en-US", {
                                                        weekday: "long",
                                                        year: "numeric",
                                                        month: "long",
                                                        day: "numeric",
                                                    })}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground font-mono uppercase tracking-wide mb-1">
                                                    End Date
                                                </p>
                                                <p className="font-medium">
                                                    {new Date(
                                                        formData.event_end_date
                                                    ).toLocaleDateString("en-US", {
                                                        weekday: "long",
                                                        year: "numeric",
                                                        month: "long",
                                                        day: "numeric",
                                                    })}
                                                </p>
                                            </div>
                                        </div>
                                    </Card>

                                    {/* Venue Info */}
                                    <Card className="p-6 bg-card/50 border-border/50">
                                        <h3 className="text-lg font-semibold mb-4 font-mono uppercase tracking-wide">
                                            Venue
                                        </h3>
                                        <div className="space-y-3 text-sm">
                                            <div>
                                                <p className="text-xs text-muted-foreground font-mono uppercase tracking-wide mb-1">
                                                    Venue Name
                                                </p>
                                                <p className="font-medium">{formData.venue_name}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground font-mono uppercase tracking-wide mb-1">
                                                    Location
                                                </p>
                                                <p className="font-medium">
                                                    {formData.venue_city_name},{" "}
                                                    {formData.venue_country_name}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground font-mono uppercase tracking-wide mb-1">
                                                    Address
                                                </p>
                                                <p className="font-medium leading-relaxed">
                                                    {formData.venue_address}
                                                </p>
                                            </div>
                                            {formData.venue_access_notes && (
                                                <div>
                                                    <p className="text-xs text-muted-foreground font-mono uppercase tracking-wide mb-1">
                                                        Access Notes
                                                    </p>
                                                    <p className="font-medium leading-relaxed">
                                                        {formData.venue_access_notes}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </Card>

                                    {/* Contact Info */}
                                    <Card className="p-6 bg-card/50 border-border/50">
                                        <h3 className="text-lg font-semibold mb-4 font-mono uppercase tracking-wide">
                                            Contact
                                        </h3>
                                        <div className="space-y-3 text-sm">
                                            <div>
                                                <p className="text-xs text-muted-foreground font-mono uppercase tracking-wide mb-1">
                                                    Name
                                                </p>
                                                <p className="font-medium">
                                                    {formData.contact_name}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground font-mono uppercase tracking-wide mb-1">
                                                    Email
                                                </p>
                                                <p className="font-medium">
                                                    {formData.contact_email}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground font-mono uppercase tracking-wide mb-1">
                                                    Phone
                                                </p>
                                                <p className="font-medium">
                                                    {formData.contact_phone}
                                                </p>
                                            </div>
                                            {formData.special_instructions && (
                                                <div>
                                                    <p className="text-xs text-muted-foreground font-mono uppercase tracking-wide mb-1">
                                                        Special Instructions
                                                    </p>
                                                    <p className="font-medium leading-relaxed">
                                                        {formData.special_instructions}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </Card>
                                </div>
                            </div>

                            {/* Availability Issues Banner */}
                            {availabilityIssues.length > 0 && (
                                <Card className="border-destructive/50 bg-destructive/5 p-6">
                                    <div className="flex items-start gap-3">
                                        <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                                        <div className="flex-1">
                                            <p className="text-sm font-semibold text-destructive mb-2">
                                                Availability Issues
                                            </p>
                                            <ul className="text-sm text-muted-foreground space-y-1 mb-4">
                                                {availabilityIssues.map((issue, i) => (
                                                    <li key={i} className="flex items-start gap-2">
                                                        <span className="text-destructive">•</span>
                                                        <span>{issue}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => router.push("/catalog")}
                                            >
                                                Return to Catalog
                                            </Button>
                                        </div>
                                    </div>
                                </Card>
                            )}

                            {/* NEW: Hybrid Pricing Estimate */}
                            {isEstimateFeatureEnabled &&
                                availabilityIssues.length === 0 &&
                                estimateData?.data && (
                                <OrderEstimate
                                    estimate={estimateData.data.estimate}
                                    hasRebrandItems={hasRebrandItems}
                                />
                            )}

                            {/* Loading Estimate */}
                            {isEstimateFeatureEnabled &&
                                availabilityIssues.length === 0 &&
                                isEstimateLoading &&
                                formData.venue_city_id && (
                                    <Card className="p-6 bg-muted/30 border-border">
                                        <div className="flex items-center gap-3">
                                            <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                            <p className="text-sm text-muted-foreground">
                                                Calculating estimate...
                                            </p>
                                        </div>
                                    </Card>
                                )}

                            {/* Estimate Error */}
                            {isEstimateFeatureEnabled &&
                                availabilityIssues.length === 0 &&
                                isEstimateError &&
                                formData.venue_city_id && (
                                    <Card className="p-6 bg-muted/30 border-border">
                                        <div className="flex items-start gap-3">
                                            <AlertCircle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                                            <div className="flex-1">
                                                <p className="text-sm font-medium mb-1">
                                                    Unable to Calculate Estimate for{" "}
                                                    <b>{formData.venue_city_name}</b>, You will
                                                    receive a custom quote via email within 24-48
                                                    hours after submitting your order.
                                                </p>
                                            </div>
                                        </div>
                                    </Card>
                                )}

                            {!isAllGreenItems && (
                                <Card className="p-6 bg-red-500/10 border-red-500">
                                    <div className="flex items-start gap-3">
                                        <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                                        <div className="flex-1">
                                            <p className="font-medium mb-1 text-red-500">
                                                Your order includes damaged{" "}
                                                {hasRebrandItems && "and rebrand"} items. Please
                                                consider couple of days for assets maintenance{" "}
                                                {hasRebrandItems && "and rebrand"}.
                                            </p>
                                        </div>
                                    </div>
                                </Card>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Navigation Buttons */}
                <div className="flex items-center justify-between gap-4 mt-10">
                    <Button
                        variant="outline"
                        onClick={handleBack}
                        disabled={currentStepIndex === 0}
                        className="gap-2 font-mono"
                        size="lg"
                    >
                        <ChevronLeft className="h-4 w-4" />
                        Back
                    </Button>

                    <div className="text-sm text-muted-foreground font-mono">
                        Step {currentStepIndex + 1} of {STEPS.length}
                    </div>

                    {currentStep === "review" ? (
                        <Button
                            onClick={handleSubmit}
                            disabled={
                                isSubmitting ||
                                availabilityIssues.length > 0 ||
                                missingOrangeDecisions.length > 0 ||
                                (redItems.length > 0 && !hasCheckedMaintenanceFeasibility)
                            }
                            className="gap-2 font-mono uppercase tracking-wide"
                            size="lg"
                        >
                            {isSubmitting ? "Submitting..." : "Submit Order"}
                            <Check className="h-4 w-4" />
                        </Button>
                    ) : (
                        <Button
                            onClick={handleNext}
                            disabled={!canProceed() || maintenanceFeasibilityCheck.isPending}
                            className="gap-2 font-mono"
                            size="lg"
                        >
                            Continue
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function CheckoutPage() {
    return (
        <ClientNav>
            <CheckoutPageInner />
        </ClientNav>
    );
}
