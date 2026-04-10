"use client";

/**
 * Checkout Flow - Multi-Step Order Creation
 *
 * Design: Linear progress with clear validation and feedback
 * Steps: Review Cart → Event Details → Venue Info → Contact → Review & Submit
 */

import PhoneInput, { isValidPhoneNumber } from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { OrderEstimate } from "@/components/checkout/OrderEstimate";
import { SelfPickupCheckoutFlow } from "@/components/checkout/SelfPickupCheckoutFlow";
import { usePlatform } from "@/contexts/platform-context";
import { MaintenanceDecisionCenter } from "@/components/checkout/MaintenanceDecisionCenter";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useCart } from "@/contexts/cart-context";
import { useCalculateEstimate } from "@/hooks/use-order-submission";
import { useSubmitOrderFromCart } from "@/hooks/use-orders";
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
import { useCountries } from "@/hooks/use-countries";
import { useToken } from "@/lib/auth/use-token";
import { useCompany } from "@/hooks/use-companies";
import {
    useFeasibilityConfig,
    useMaintenanceFeasibilityCheck,
    type MaintenanceFeasibilityIssue,
} from "@/hooks/use-feasibility-check";

type Step = "cart" | "installation" | "venue" | "contact" | "review";

const STEPS: { key: Step; label: string; icon: any }[] = [
    { key: "cart", label: "Order Review", icon: ShoppingCart },
    { key: "installation", label: "Installation Details", icon: Calendar },
    { key: "venue", label: "Installation Location", icon: MapPin },
    { key: "contact", label: "Execution Contact", icon: User },
    { key: "review", label: "Review", icon: FileText },
];

function CheckoutPageInner() {
    const router = useRouter();
    const { user } = useToken();
    const { platform } = usePlatform();
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
    const [checkoutMode, setCheckoutMode] = useState<"standard" | "self-pickup">("standard");
    const [currentStep, setCurrentStep] = useState<Step>("cart");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Feature flag: show self-pickup mode option only if enabled
    const selfPickupEnabled = (platform?.features as any)?.enable_self_pickup === true;
    const [availabilityIssues, setAvailabilityIssues] = useState<string[]>([]);
    const [maintenanceFeasibilityIssues, setMaintenanceFeasibilityIssues] = useState<
        MaintenanceFeasibilityIssue[]
    >([]);
    const [hasCheckedMaintenanceFeasibility, setHasCheckedMaintenanceFeasibility] = useState(false);
    const [isLeavingAfterSubmit, setIsLeavingAfterSubmit] = useState(false);
    const isEstimateFeatureEnabled =
        companyData?.data?.features?.show_estimate_on_order_creation === true;

    // Mutations
    const submitMutation = useSubmitOrderFromCart();
    const maintenanceFeasibilityCheck = useMaintenanceFeasibilityCheck();

    const CHECKOUT_STORAGE_KEY = "kadence_checkout_form";

    // Form state
    const [formData, setFormData] = useState({
        brand_id: undefined as string | undefined,
        event_start_date: "",
        event_end_date: "",
        venue_name: "",
        venue_country_id: "",
        venue_country_name: "",
        venue_city_id: "",
        venue_city_name: "",
        venue_address: "",
        venue_access_notes: "",
        // Venue contact (always visible, separate from permits)
        venue_contact_name: "",
        venue_contact_email: "",
        venue_contact_phone: "",
        // Permits
        requires_permit: false,
        permit_owner: "UNKNOWN" as "CLIENT" | "PLATFORM" | "UNKNOWN",
        permit_venue_contact_name: "",
        permit_venue_contact_email: "",
        permit_venue_contact_phone: "",
        requires_vehicle_docs: false,
        requires_staff_ids: false,
        permit_notes: "",
        // Execution contact
        contact_name: "",
        contact_email: "",
        contact_phone: "",
        // Delivery window preference
        requested_delivery_date: "",
        requested_delivery_time_start: "",
        requested_delivery_time_end: "",
        special_instructions: "",
    });

    // Restore checkout state from localStorage on mount
    useEffect(() => {
        if (!isInitialized) return;
        try {
            const saved = localStorage.getItem(CHECKOUT_STORAGE_KEY);
            if (!saved) return;
            const { step, form } = JSON.parse(saved);
            if (form) setFormData((prev) => ({ ...prev, ...form }));
            if (step && items.length > 0) setCurrentStep(step);
        } catch (_) {
            // ignore malformed localStorage data
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isInitialized]);

    // Auto-fill contact from user token if empty
    useEffect(() => {
        if (!user) return;
        setFormData((prev) => ({
            ...prev,
            contact_name: prev.contact_name || (user as any).name || "",
            contact_email: prev.contact_email || (user as any).email || "",
        }));
    }, [user]);

    // Persist to localStorage on every change
    useEffect(() => {
        localStorage.setItem(
            CHECKOUT_STORAGE_KEY,
            JSON.stringify({ step: currentStep, form: formData })
        );
    }, [currentStep, formData]);

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
        "ROUND_TRIP",
        currentStep === "review" && !!formData.venue_city_id && isEstimateFeatureEnabled
    );

    // Fetch resolved feasibility config (platform default + company override)
    const { data: feasibilityConfig } = useFeasibilityConfig();

    // Calculate minimum allowed date from actual feasibility config
    const calculateMinDate = () => {
        const leadHours = feasibilityConfig?.minimum_lead_hours ?? 24;
        const date = new Date();
        date.setTime(date.getTime() + leadHours * 60 * 60 * 1000);

        // If weekends are excluded, skip forward past any weekend days
        if (feasibilityConfig?.exclude_weekends) {
            const weekendDays = new Set(feasibilityConfig.weekend_days ?? [0, 6]);
            // Advance past weekend days so the minimum selectable date is a business day
            while (weekendDays.has(date.getDay())) {
                date.setDate(date.getDate() + 1);
            }
        }

        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    };

    const { data: countriesData } = useCountries();

    // Auto-select first country (UAE) when data loads
    useEffect(() => {
        if (!countriesData?.data?.length || formData.venue_country_id) return;
        const first = countriesData.data[0];
        setFormData((prev) => ({
            ...prev,
            venue_country_id: first.id,
            venue_country_name: first.name,
        }));
    }, [countriesData?.data, formData.venue_country_id]);

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
                    setAvailabilityIssues([]);
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
                const status = (error as any)?.response?.status;
                if (status === 403) {
                    // Fallback for legacy CLIENT users missing availability permission;
                    // order submission still validates availability on the backend.
                    setAvailabilityIssues([]);
                    return;
                }
                setAvailabilityIssues([]);
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
        if (!isLeavingAfterSubmit && items.length === 0 && currentStep !== "cart") {
            router.push("/catalog");
        }
    }, [items.length, currentStep, isLeavingAfterSubmit, router]);

    const currentStepIndex = STEPS.findIndex((s) => s.key === currentStep);

    const canProceed = () => {
        switch (currentStep) {
            case "cart":
                return items.length > 0;
            case "installation":
                return (
                    formData.event_start_date &&
                    formData.event_end_date &&
                    new Date(formData.event_start_date) <= new Date(formData.event_end_date)
                );
            case "venue":
                return Boolean(
                    formData.venue_name &&
                        formData.venue_country_id &&
                        formData.venue_city_id &&
                        formData.venue_address &&
                        (!formData.requires_permit || formData.permit_owner)
                );
            case "contact":
                return (
                    formData.contact_name &&
                    formData.contact_phone &&
                    isValidPhoneNumber(formData.contact_phone) &&
                    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contact_email)
                );
            case "review":
                return true;
            default:
                return false;
        }
    };

    const handleNext = async () => {
        if (!canProceed()) {
            if (
                currentStep === "contact" &&
                formData.contact_email &&
                !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contact_email)
            ) {
                toast.error("Please enter a valid email address");
            } else {
                toast.error("Please fill all required fields");
            }
            return;
        }

        if (currentStep === "installation" && redItems.length > 0) {
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

            const submitData = {
                ...(formData.brand_id ? { brand_id: formData.brand_id } : {}),
                items: items.map((item) => ({
                    asset_id: item.assetId,
                    quantity: item.quantity,
                    ...(item.fromCollection ? { from_collection_id: item.fromCollection } : {}),
                    ...(item.maintenanceDecision
                        ? { maintenance_decision: item.maintenanceDecision }
                        : {}),
                })),
                event_start_date: formData.event_start_date,
                event_end_date: formData.event_end_date,
                venue_name: formData.venue_name,
                venue_country_id: formData.venue_country_id,
                venue_city_id: formData.venue_city_id,
                venue_address: formData.venue_address,
                ...(formData.venue_access_notes
                    ? { venue_access_notes: formData.venue_access_notes }
                    : {}),
                ...(formData.requires_permit
                    ? {
                          permit_requirements: {
                              requires_permit: true,
                              permit_owner: formData.permit_owner,
                              ...(formData.permit_venue_contact_name
                                  ? { venue_contact_name: formData.permit_venue_contact_name }
                                  : {}),
                              ...(formData.permit_venue_contact_email
                                  ? { venue_contact_email: formData.permit_venue_contact_email }
                                  : {}),
                              ...(formData.permit_venue_contact_phone
                                  ? { venue_contact_phone: formData.permit_venue_contact_phone }
                                  : {}),
                              ...(formData.requires_vehicle_docs
                                  ? { requires_vehicle_docs: true }
                                  : {}),
                              ...(formData.requires_staff_ids ? { requires_staff_ids: true } : {}),
                              ...(formData.permit_notes ? { notes: formData.permit_notes } : {}),
                          },
                      }
                    : {}),
                contact_name: formData.contact_name,
                contact_email: formData.contact_email,
                contact_phone: formData.contact_phone,
                // Venue contact (top-level, separate from permit_requirements)
                ...(formData.venue_contact_name || formData.venue_contact_email || formData.venue_contact_phone
                    ? {
                          venue_contact: {
                              ...(formData.venue_contact_name ? { name: formData.venue_contact_name } : {}),
                              ...(formData.venue_contact_email ? { email: formData.venue_contact_email } : {}),
                              ...(formData.venue_contact_phone ? { phone: formData.venue_contact_phone } : {}),
                          },
                      }
                    : {}),
                // Client-requested delivery window (optional)
                ...(formData.requested_delivery_date && formData.requested_delivery_time_start && formData.requested_delivery_time_end
                    ? {
                          requested_delivery_window: {
                              start: `${formData.requested_delivery_date}T${formData.requested_delivery_time_start}:00`,
                              end: `${formData.requested_delivery_date}T${formData.requested_delivery_time_end}:00`,
                          },
                      }
                    : {}),
                ...(formData.special_instructions
                    ? { special_instructions: formData.special_instructions }
                    : {}),
            };

            const result = await submitMutation.mutateAsync(submitData);

            toast.success("Order submitted successfully!", {
                description: `Order ID: ${result.orderId}`,
            });

            localStorage.removeItem(CHECKOUT_STORAGE_KEY);
            setIsLeavingAfterSubmit(true);
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

            {/* Mode selector (only when self-pickup feature is enabled) */}
            {selfPickupEnabled && checkoutMode === "standard" && currentStep === "cart" && (
                <div className="max-w-5xl mx-auto px-8 pt-8">
                    <Card className="p-6">
                        <h3 className="text-lg font-semibold mb-2">
                            How would you like to receive these items?
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            Choose delivery for our logistics team to bring items to your venue,
                            or self-pickup to collect them yourself from the warehouse.
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <button
                                className="border-2 border-primary rounded-lg p-4 text-left bg-primary/5"
                                onClick={() => setCheckoutMode("standard")}
                            >
                                <p className="font-semibold">Delivery</p>
                                <p className="text-sm text-muted-foreground mt-1">
                                    We deliver to your venue
                                </p>
                            </button>
                            <button
                                className="border-2 border-border rounded-lg p-4 text-left hover:border-primary/50 transition-colors"
                                onClick={() => setCheckoutMode("self-pickup")}
                            >
                                <p className="font-semibold">I'll collect them myself</p>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Pick up from the warehouse
                                </p>
                            </button>
                        </div>
                    </Card>
                </div>
            )}

            {/* Self-pickup flow (replaces standard steps) */}
            {checkoutMode === "self-pickup" && (
                <div className="max-w-5xl mx-auto px-8 py-10">
                    <SelfPickupCheckoutFlow
                        onSwitchToStandard={() => setCheckoutMode("standard")}
                    />
                </div>
            )}

            {/* Standard order flow continues below — hidden when self-pickup mode */}
            {checkoutMode === "standard" && (
                <>
            {/* warning if any item condition is red or orange */}

            {items.length > 0 && (
                <div className="max-w-5xl mx-auto px-8 pt-10">
                    {items.some(
                        (item) => item.condition === "RED" || item.condition === "ORANGE"
                    ) && (
                        <div className="bg-yellow-50 border-yellow-200 border rounded-lg p-4 mb-6">
                            <div className="flex items-start gap-3">
                                <AlertCircle className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
                                <div>
                                    <h3 className="text-sm font-medium text-yellow-800">
                                        Maintenance Required
                                    </h3>
                                    <p className="mt-1 text-sm text-yellow-700">
                                        Your order includes item(s) that require maintenance. Please
                                        review condition details and confirm your decision so our
                                        team can proceed correctly.
                                    </p>
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
                                                {item.condition === "RED" && (
                                                    <div className="mt-1 space-y-1">
                                                        <span className="inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded-full bg-red-100 text-red-700">
                                                            <AlertCircle className="h-3 w-3" /> RED
                                                            — Requires repair
                                                        </span>
                                                        {item.conditionNotes && (
                                                            <p className="text-xs text-red-600 line-clamp-2">
                                                                {item.conditionNotes}
                                                            </p>
                                                        )}
                                                    </div>
                                                )}
                                                {item.condition === "ORANGE" && (
                                                    <div className="mt-1 space-y-1">
                                                        <span className="inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">
                                                            <AlertCircle className="h-3 w-3" />{" "}
                                                            ORANGE — Decision needed
                                                        </span>
                                                        {item.conditionNotes && (
                                                            <p className="text-xs text-amber-600 line-clamp-2">
                                                                {item.conditionNotes}
                                                            </p>
                                                        )}
                                                    </div>
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
                    {currentStep === "installation" && (
                        <motion.div
                            key="installation"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3 }}
                            className="space-y-6"
                        >
                            <div>
                                <h2 className="text-3xl font-bold mb-2">Installation Details</h2>
                                <p className="text-muted-foreground">
                                    When do you need these assets to be installed?
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
                                                data-testid="checkout-event-start"
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
                                                data-testid="checkout-event-end"
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

                                    {/* Preferred Delivery Window (optional) */}
                                    <div className="space-y-2 pt-4 border-t border-border/40">
                                        <Label className="font-mono uppercase text-xs tracking-wide">
                                            Preferred Delivery Window (Optional)
                                        </Label>
                                        <p className="text-xs text-muted-foreground">
                                            This is a request — logistics will review and confirm your
                                            final delivery window.
                                        </p>
                                        <div className="grid grid-cols-3 gap-4">
                                            <div className="space-y-1">
                                                <Label htmlFor="deliveryDate" className="text-xs">
                                                    Date
                                                </Label>
                                                <Input
                                                    id="deliveryDate"
                                                    type="date"
                                                    value={formData.requested_delivery_date}
                                                    onChange={(e) =>
                                                        setFormData({
                                                            ...formData,
                                                            requested_delivery_date: e.target.value,
                                                        })
                                                    }
                                                    className="h-10 font-mono"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <Label htmlFor="deliveryTimeStart" className="text-xs">
                                                    From
                                                </Label>
                                                <Input
                                                    id="deliveryTimeStart"
                                                    type="time"
                                                    value={formData.requested_delivery_time_start}
                                                    onChange={(e) =>
                                                        setFormData({
                                                            ...formData,
                                                            requested_delivery_time_start: e.target.value,
                                                        })
                                                    }
                                                    className="h-10 font-mono"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <Label htmlFor="deliveryTimeEnd" className="text-xs">
                                                    To
                                                </Label>
                                                <Input
                                                    id="deliveryTimeEnd"
                                                    type="time"
                                                    value={formData.requested_delivery_time_end}
                                                    onChange={(e) =>
                                                        setFormData({
                                                            ...formData,
                                                            requested_delivery_time_end: e.target.value,
                                                        })
                                                    }
                                                    className="h-10 font-mono"
                                                />
                                            </div>
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
                                <h2 className="text-3xl font-bold mb-2">
                                    Installation Information
                                </h2>
                                <p className="text-muted-foreground">
                                    Where will the installation take place?
                                </p>
                            </div>

                            <Card className="p-8 bg-card/50 border-border/50">
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <Label
                                            htmlFor="venueName"
                                            className="font-mono uppercase text-xs tracking-wide"
                                        >
                                            Venue Name *
                                        </Label>
                                        <Input
                                            id="venueName"
                                            data-testid="checkout-venue-name"
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
                                                Country
                                            </Label>
                                            <div className="h-12 px-3 border border-border rounded-md bg-muted/30 flex items-center text-sm font-mono">
                                                {formData.venue_country_name || "Loading..."}
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label
                                                htmlFor="venueCity"
                                                className="font-mono uppercase text-xs tracking-wide"
                                            >
                                                City *
                                            </Label>
                                            <Select
                                                value={formData.venue_city_id}
                                                onValueChange={(value) => {
                                                    const selectedCity = cities.find(
                                                        (c) => c.id === value
                                                    );
                                                    setFormData({
                                                        ...formData,
                                                        venue_city_id: value,
                                                        venue_city_name: selectedCity?.name || "",
                                                    });
                                                }}
                                                disabled={!formData.venue_country_id}
                                            >
                                                <SelectTrigger
                                                    className="h-12 font-mono"
                                                    data-testid="checkout-venue-city"
                                                >
                                                    <SelectValue placeholder="Select city" />
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
                                                </SelectContent>
                                            </Select>
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
                                            data-testid="checkout-venue-address"
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

                                    {/* Venue Contact — always visible, not gated by permits */}
                                    <div className="rounded-lg border border-border/60 bg-card/80 p-4 space-y-4">
                                        <div>
                                            <Label className="font-mono uppercase text-xs tracking-wide">
                                                Venue Contact
                                            </Label>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                The person at the venue who can coordinate arrival,
                                                access, unloading, or handover.
                                            </p>
                                        </div>
                                        <div className="grid gap-4 md:grid-cols-3">
                                            <div className="space-y-1">
                                                <Label htmlFor="venueContactName" className="text-xs">
                                                    Name
                                                </Label>
                                                <Input
                                                    id="venueContactName"
                                                    value={formData.venue_contact_name}
                                                    onChange={(e) =>
                                                        setFormData({
                                                            ...formData,
                                                            venue_contact_name: e.target.value,
                                                        })
                                                    }
                                                    placeholder="Contact name"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <Label htmlFor="venueContactEmail" className="text-xs">
                                                    Email
                                                </Label>
                                                <Input
                                                    id="venueContactEmail"
                                                    type="email"
                                                    value={formData.venue_contact_email}
                                                    onChange={(e) =>
                                                        setFormData({
                                                            ...formData,
                                                            venue_contact_email: e.target.value,
                                                        })
                                                    }
                                                    placeholder="contact@venue.com"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <Label htmlFor="venueContactPhone" className="text-xs">
                                                    Phone
                                                </Label>
                                                <Input
                                                    id="venueContactPhone"
                                                    value={formData.venue_contact_phone}
                                                    onChange={(e) =>
                                                        setFormData({
                                                            ...formData,
                                                            venue_contact_phone: e.target.value,
                                                        })
                                                    }
                                                    placeholder="+971..."
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="rounded-lg border border-border/60 bg-muted/20 p-4 space-y-4">
                                        <div className="flex items-start gap-3">
                                            <Checkbox
                                                id="venueRequiresPermit"
                                                checked={formData.requires_permit}
                                                onCheckedChange={(checked) =>
                                                    setFormData({
                                                        ...formData,
                                                        requires_permit: checked === true,
                                                    })
                                                }
                                            />
                                            <div className="space-y-1">
                                                <Label
                                                    htmlFor="venueRequiresPermit"
                                                    className="font-mono uppercase text-xs tracking-wide"
                                                >
                                                    Venue requires permits or access coordination
                                                </Label>
                                                <p className="text-xs text-muted-foreground">
                                                    Share what you know now. Additional charges may
                                                    apply depending on venue requirements.
                                                </p>
                                            </div>
                                        </div>

                                        {formData.requires_permit && (
                                            <div className="space-y-4">
                                                <div className="space-y-2">
                                                    <Label className="font-mono uppercase text-xs tracking-wide">
                                                        Permit Owner *
                                                    </Label>
                                                    <Select
                                                        value={formData.permit_owner}
                                                        onValueChange={(value) =>
                                                            setFormData({
                                                                ...formData,
                                                                permit_owner: value as
                                                                    | "CLIENT"
                                                                    | "PLATFORM"
                                                                    | "UNKNOWN",
                                                            })
                                                        }
                                                    >
                                                        <SelectTrigger className="h-12 font-mono">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="CLIENT">
                                                                I will arrange
                                                            </SelectItem>
                                                            <SelectItem value="PLATFORM">
                                                                You should arrange
                                                            </SelectItem>
                                                            <SelectItem value="UNKNOWN">
                                                                Not sure yet
                                                            </SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <Label className="font-mono uppercase text-xs tracking-wide">
                                                            Venue Contact Name
                                                        </Label>
                                                        <Input
                                                            value={
                                                                formData.permit_venue_contact_name
                                                            }
                                                            onChange={(e) =>
                                                                setFormData({
                                                                    ...formData,
                                                                    permit_venue_contact_name:
                                                                        e.target.value,
                                                                })
                                                            }
                                                            placeholder="Venue operations contact"
                                                            className="h-12"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label className="font-mono uppercase text-xs tracking-wide">
                                                            Venue Contact Phone
                                                        </Label>
                                                        <Input
                                                            value={
                                                                formData.permit_venue_contact_phone
                                                            }
                                                            onChange={(e) =>
                                                                setFormData({
                                                                    ...formData,
                                                                    permit_venue_contact_phone:
                                                                        e.target.value,
                                                                })
                                                            }
                                                            placeholder="Phone number"
                                                            className="h-12"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="space-y-2">
                                                    <Label className="font-mono uppercase text-xs tracking-wide">
                                                        Venue Contact Email
                                                    </Label>
                                                    <Input
                                                        type="email"
                                                        value={formData.permit_venue_contact_email}
                                                        onChange={(e) =>
                                                            setFormData({
                                                                ...formData,
                                                                permit_venue_contact_email:
                                                                    e.target.value,
                                                            })
                                                        }
                                                        placeholder="venue@example.com"
                                                        className="h-12"
                                                    />
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <label className="flex items-start gap-3 rounded-md border border-border/60 bg-background/70 p-3">
                                                        <Checkbox
                                                            checked={formData.requires_vehicle_docs}
                                                            onCheckedChange={(checked) =>
                                                                setFormData({
                                                                    ...formData,
                                                                    requires_vehicle_docs:
                                                                        checked === true,
                                                                })
                                                            }
                                                        />
                                                        <div>
                                                            <p className="text-sm font-medium">
                                                                Vehicle documents required
                                                            </p>
                                                            <p className="text-xs text-muted-foreground">
                                                                Use this if venue access needs truck
                                                                registration or driver docs.
                                                            </p>
                                                        </div>
                                                    </label>
                                                    <label className="flex items-start gap-3 rounded-md border border-border/60 bg-background/70 p-3">
                                                        <Checkbox
                                                            checked={formData.requires_staff_ids}
                                                            onCheckedChange={(checked) =>
                                                                setFormData({
                                                                    ...formData,
                                                                    requires_staff_ids:
                                                                        checked === true,
                                                                })
                                                            }
                                                        />
                                                        <div>
                                                            <p className="text-sm font-medium">
                                                                Staff IDs required
                                                            </p>
                                                            <p className="text-xs text-muted-foreground">
                                                                Use this if crew names, IDs, or
                                                                passes are needed before entry.
                                                            </p>
                                                        </div>
                                                    </label>
                                                </div>

                                                <div className="space-y-2">
                                                    <Label className="font-mono uppercase text-xs tracking-wide">
                                                        Permit Notes
                                                    </Label>
                                                    <Textarea
                                                        value={formData.permit_notes}
                                                        onChange={(e) =>
                                                            setFormData({
                                                                ...formData,
                                                                permit_notes: e.target.value,
                                                            })
                                                        }
                                                        placeholder="Permit timing, loading bay rules, access windows, or anything the team should know."
                                                        rows={3}
                                                        className="font-mono text-sm"
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {/* Access notes — always visible in permit section */}
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
                                                placeholder="Loading dock info, access codes, gate instructions, etc."
                                                rows={2}
                                                className="font-mono text-sm"
                                            />
                                        </div>
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
                                <h2 className="text-3xl font-bold mb-2">Point of Contact</h2>
                                <p className="text-muted-foreground">
                                    Provide the on-site contact for this order. Our team will reach
                                    out to this person for coordination and updates.
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
                                            data-testid="checkout-contact-name"
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
                                                data-testid="checkout-contact-email"
                                                value={formData.contact_email}
                                                onChange={(e) =>
                                                    setFormData({
                                                        ...formData,
                                                        contact_email: e.target.value,
                                                    })
                                                }
                                                placeholder="john@company.com"
                                                required
                                                className={`h-12 ${formData.contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contact_email) ? "border-destructive" : ""}`}
                                            />
                                            {formData.contact_email &&
                                                !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
                                                    formData.contact_email
                                                ) && (
                                                    <p className="text-xs text-destructive">
                                                        Please enter a valid email address
                                                    </p>
                                                )}
                                        </div>

                                        <div className="space-y-2">
                                            <Label
                                                htmlFor="contactPhone"
                                                className="font-mono uppercase text-xs tracking-wide"
                                            >
                                                Phone Number *
                                            </Label>
                                            <PhoneInput
                                                international
                                                defaultCountry="AE"
                                                data-testid="checkout-contact-phone"
                                                value={formData.contact_phone}
                                                onChange={(value) =>
                                                    setFormData({
                                                        ...formData,
                                                        contact_phone: value || "",
                                                    })
                                                }
                                                className="h-12 rounded-md border border-input bg-background px-3 text-sm [&>input]:border-0 [&>input]:bg-transparent [&>input]:outline-none [&>input]:h-full"
                                            />
                                            {formData.contact_phone &&
                                                !isValidPhoneNumber(formData.contact_phone) && (
                                                    <p className="text-xs text-destructive">
                                                        Please enter a valid phone number
                                                    </p>
                                                )}
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

                            {orangeItems.length > 0 ? (
                                <MaintenanceDecisionCenter
                                    items={orangeItems}
                                    onDecisionChange={(assetId, decision) =>
                                        updateItemMaintenanceDecision(assetId, decision)
                                    }
                                />
                            ) : null}

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
                                            {formData.requires_permit && (
                                                <div className="rounded-md border border-border/60 bg-muted/20 p-3 space-y-2">
                                                    <p className="text-xs text-muted-foreground font-mono uppercase tracking-wide">
                                                        Permit / Access Coordination
                                                    </p>
                                                    <p className="font-medium">
                                                        {formData.permit_owner === "CLIENT" &&
                                                            "Client will arrange permits"}
                                                        {formData.permit_owner === "PLATFORM" &&
                                                            "Platform should arrange permits"}
                                                        {formData.permit_owner === "UNKNOWN" &&
                                                            "Permit ownership still to be confirmed"}
                                                    </p>
                                                    {(formData.permit_venue_contact_name ||
                                                        formData.permit_venue_contact_email ||
                                                        formData.permit_venue_contact_phone) && (
                                                        <div className="text-sm space-y-1">
                                                            {formData.permit_venue_contact_name && (
                                                                <p>
                                                                    Contact:{" "}
                                                                    {
                                                                        formData.permit_venue_contact_name
                                                                    }
                                                                </p>
                                                            )}
                                                            {formData.permit_venue_contact_email && (
                                                                <p>
                                                                    Email:{" "}
                                                                    {
                                                                        formData.permit_venue_contact_email
                                                                    }
                                                                </p>
                                                            )}
                                                            {formData.permit_venue_contact_phone && (
                                                                <p>
                                                                    Phone:{" "}
                                                                    {
                                                                        formData.permit_venue_contact_phone
                                                                    }
                                                                </p>
                                                            )}
                                                        </div>
                                                    )}
                                                    <div className="flex flex-wrap gap-2 text-xs font-mono">
                                                        {formData.requires_vehicle_docs && (
                                                            <span className="rounded-full border px-2 py-1">
                                                                Vehicle docs required
                                                            </span>
                                                        )}
                                                        {formData.requires_staff_ids && (
                                                            <span className="rounded-full border px-2 py-1">
                                                                Staff IDs required
                                                            </span>
                                                        )}
                                                    </div>
                                                    {formData.permit_notes && (
                                                        <p className="text-sm leading-relaxed">
                                                            {formData.permit_notes}
                                                        </p>
                                                    )}
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
                                estimateData?.data?.estimate?.base_operations && (
                                    <OrderEstimate
                                        estimate={estimateData.data.estimate}
                                        hasRebrandItems={false}
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
                        data-testid="checkout-back"
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
                            data-testid="checkout-submit"
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
                            data-testid="checkout-next"
                        >
                            Continue
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </div>
                </>
            )}
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
