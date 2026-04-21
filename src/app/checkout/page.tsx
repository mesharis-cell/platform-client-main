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
import { FeasibilityHelper } from "@/components/checkout/FeasibilityHelper";
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
    Truck,
    User,
    Warehouse as WarehouseIcon,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api/api-client";
import { useCountries } from "@/hooks/use-countries";
import { useToken } from "@/lib/auth/use-token";
import { useCompany } from "@/hooks/use-companies";
import {
    useFeasibilityConfig,
    useMaintenanceFeasibilityCheck,
    useFeasibilityPreview,
    interpretFeasibilityPreview,
    type MaintenanceFeasibilityIssue,
} from "@/hooks/use-feasibility-check";

type Step = "mode" | "cart" | "installation" | "venue" | "contact" | "review";

const MODE_STEP = { key: "mode" as const, label: "Delivery Mode", icon: Truck };
const STANDARD_STEPS: { key: Step; label: string; icon: any }[] = [
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
    const [pendingMode, setPendingMode] = useState<"standard" | "self-pickup" | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    // Guards the persist→localStorage effect so it doesn't fire on the
    // initial render with default state (which would clobber the stored
    // checkpoint BEFORE the restore effect has had a chance to read it).
    // The restore effect flips this to true after running.
    const [restoreDone, setRestoreDone] = useState(false);

    // Feature flag: show self-pickup mode option only if enabled
    const selfPickupEnabled = (platform?.features as any)?.enable_self_pickup === true;
    // When self-pickup is available, the first step is an explicit mode picker.
    const STEPS = useMemo<{ key: Step; label: string; icon: any }[]>(
        () => (selfPickupEnabled ? [MODE_STEP, ...STANDARD_STEPS] : STANDARD_STEPS),
        [selfPickupEnabled]
    );
    // Feature flag: whether to show separate Event Start/End date inputs.
    // OFF (default) — hide event dates; delivery + pickup become required and
    // event_start_date / event_end_date are auto-filled from them on submit.
    const eventDateInputsEnabled = (platform?.features as any)?.enable_event_date_inputs === true;
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
        // Permits (venue contact is NOT here — it's first-class at top-level)
        requires_permit: false,
        permit_owner: "UNKNOWN" as "CLIENT" | "PLATFORM" | "UNKNOWN",
        requires_vehicle_docs: false,
        requires_staff_ids: false,
        permit_notes: "",
        // Execution contact
        contact_name: "",
        contact_email: "",
        contact_phone: "",
        // Delivery window preference (client-requested; logistics confirms later)
        requested_delivery_date: "",
        requested_delivery_time_start: "09:00",
        requested_delivery_time_end: "11:00",
        // Pickup window preference (client-requested; logistics confirms later)
        requested_pickup_date: "",
        requested_pickup_time_start: "09:00",
        requested_pickup_time_end: "11:00",
        special_instructions: "",
    });

    // Restore checkout state from localStorage on mount.
    //
    // When self-pickup is enabled, the new Step 0 ("mode") acts as a gate:
    // users must pick delivery vs self-pickup before proceeding. We only
    // restore a saved step if the saved payload already knows about that
    // gate (i.e. has `modeConfirmed: true`). Old checkpoints written before
    // the gate existed would otherwise land the user mid-flow and skip
    // Step 0 entirely.
    //
    // CRITICAL: this must complete before the persist effect writes anything,
    // otherwise initial-render defaults clobber the saved checkpoint. The
    // `restoreDone` flag is flipped at the end of this effect and gates the
    // persist effect below.
    useEffect(() => {
        if (!isInitialized) return;
        const validSteps = STEPS.map((s) => s.key);
        let restoredMidFlow = false;
        try {
            const saved = localStorage.getItem(CHECKOUT_STORAGE_KEY);
            if (saved) {
                const { step, form, modeConfirmed } = JSON.parse(saved);
                if (form) setFormData((prev) => ({ ...prev, ...form }));
                const gateSatisfied = !selfPickupEnabled || modeConfirmed === true;
                if (step && validSteps.includes(step) && items.length > 0 && gateSatisfied) {
                    setCurrentStep(step);
                    restoredMidFlow = true;
                }
            }
        } catch (_) {
            // ignore malformed localStorage data
        }
        if (!restoredMidFlow && selfPickupEnabled) {
            // No valid restore. Default to "mode" when self-pickup feature is on,
            // "cart" otherwise.
            setCurrentStep("mode");
        }
        setRestoreDone(true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isInitialized, selfPickupEnabled]);

    // Auto-fill contact from user token if empty
    useEffect(() => {
        if (!user) return;
        setFormData((prev) => ({
            ...prev,
            contact_name: prev.contact_name || (user as any).name || "",
            contact_email: prev.contact_email || (user as any).email || "",
        }));
    }, [user]);

    // Persist to localStorage on every change. `modeConfirmed` is true once
    // the user has passed the Delivery Mode gate — old checkpoints without
    // this flag are treated as stale and force a return to Step 0.
    //
    // Gated on `restoreDone` so the initial render (with default currentStep
    // = "cart") doesn't stamp modeConfirmed=true and clobber the saved
    // checkpoint before the restore effect above runs.
    useEffect(() => {
        if (!restoreDone) return;
        const modeConfirmed =
            !selfPickupEnabled || (currentStep !== "mode" && currentStep !== undefined);
        localStorage.setItem(
            CHECKOUT_STORAGE_KEY,
            JSON.stringify({ step: currentStep, form: formData, modeConfirmed })
        );
    }, [currentStep, formData, selfPickupEnabled, restoreDone]);

    const orangeItems = items.filter((item) => item.condition === "ORANGE");
    const redItems = items.filter((item) => item.condition === "RED");
    const missingOrangeDecisions = orangeItems.filter((item) => !item.maintenanceDecision);

    // Proactive feasibility preview. Runs whenever items (or their decisions)
    // change — NOT gated on event_start_date. Backend compares against a
    // past sentinel so we always get per-item earliest_feasible_date; the
    // floor is derived here and the user's picked date is compared against
    // it for the hard block + helper rendering.
    const feasibilityItems = useMemo(
        () =>
            items.map((item) => ({
                asset_id: item.assetId,
                maintenance_decision: item.maintenanceDecision,
            })),
        [items]
    );
    const feasibilityPreview = useFeasibilityPreview({
        items: feasibilityItems,
        enabled: items.length > 0,
    });
    // Feasibility is interpreted against whichever date is the effective event
    // start — when the event-dates flag is off, that's the delivery date.
    const feasibility = interpretFeasibilityPreview(
        feasibilityPreview.data,
        eventDateInputsEnabled ? formData.event_start_date : formData.requested_delivery_date
    );
    const feasibilityHelperEnabled =
        (platform?.features as any)?.enable_feasibility_helper !== false;

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

    // Redirect if cart is empty (but allow "mode" step 0 as a pre-cart stop)
    useEffect(() => {
        if (
            !isLeavingAfterSubmit &&
            items.length === 0 &&
            currentStep !== "cart" &&
            currentStep !== "mode"
        ) {
            router.push("/catalog");
        }
    }, [items.length, currentStep, isLeavingAfterSubmit, router]);

    const currentStepIndex = STEPS.findIndex((s) => s.key === currentStep);

    // Derived "effective" event dates. When the event-dates flag is ON, these
    // are whatever the user entered. When OFF, they mirror the delivery /
    // pickup dates (delivery start → event start, pickup end → event end).
    const effectiveEventStart = eventDateInputsEnabled
        ? formData.event_start_date
        : formData.requested_delivery_date;
    const effectiveEventEnd = eventDateInputsEnabled
        ? formData.event_end_date
        : formData.requested_pickup_date;

    const canProceed = () => {
        switch (currentStep) {
            case "mode":
                return pendingMode !== null;
            case "cart":
                return items.length > 0;
            case "installation": {
                const deliveryComplete = Boolean(
                    formData.requested_delivery_date &&
                        formData.requested_delivery_time_start &&
                        formData.requested_delivery_time_end
                );
                const pickupComplete = Boolean(
                    formData.requested_pickup_date &&
                        formData.requested_pickup_time_start &&
                        formData.requested_pickup_time_end
                );
                // When the event-dates flag is OFF, delivery + pickup are the
                // source of truth and BOTH must be complete. When ON, the user
                // still provides event dates directly.
                if (!eventDateInputsEnabled) {
                    return Boolean(
                        deliveryComplete &&
                            pickupComplete &&
                            new Date(formData.requested_delivery_date) <=
                                new Date(formData.requested_pickup_date) &&
                            feasibility.userDateFeasible !== false
                    );
                }
                return Boolean(
                    formData.event_start_date &&
                        formData.event_end_date &&
                        new Date(formData.event_start_date) <= new Date(formData.event_end_date) &&
                        // Hard-block when we KNOW the picked date is too soon.
                        // Always enforced — independent of the helper flag.
                        feasibility.userDateFeasible !== false
                );
            }
            case "review":
                // Block submit path from review-level Next if ORANGE FIX
                // decisions pushed the earliest date past the picked event
                // date. Submit handler also checks as a last line of defense.
                return feasibility.userDateFeasible !== false;
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
            } else if (currentStep === "mode") {
                toast.error("Please pick a delivery mode to continue");
            } else {
                toast.error("Please fill all required fields");
            }
            return;
        }

        // Commit the Delivery Mode selection on Continue (not on card click).
        if (currentStep === "mode" && pendingMode) {
            setCheckoutMode(pendingMode);
            if (pendingMode === "self-pickup") {
                // Self-pickup flow takes over rendering via the checkoutMode branch.
                return;
            }
            setCurrentStep("cart");
            return;
        }

        if (currentStep === "installation" && redItems.length > 0) {
            try {
                // Effective event start: flag-on → user-entered event date;
                // flag-off → delivery date acts as event start.
                const checkEventStart = eventDateInputsEnabled
                    ? formData.event_start_date
                    : formData.requested_delivery_date;
                const result = await maintenanceFeasibilityCheck.mutateAsync({
                    items: redItems.map((item) => ({
                        asset_id: item.assetId,
                        maintenance_decision: "FIX_IN_ORDER",
                    })),
                    event_start_date: checkEventStart,
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
            // When the event-dates flag is off, delivery_date stands in for
            // event_start_date. The backend still requires both fields, so we
            // auto-derive them below.
            const submitEventStart = eventDateInputsEnabled
                ? formData.event_start_date
                : formData.requested_delivery_date;
            const submitEventEnd = eventDateInputsEnabled
                ? formData.event_end_date
                : formData.requested_pickup_date;

            const maintenanceResult = await maintenanceFeasibilityCheck.mutateAsync({
                items: items.map((item) => ({
                    asset_id: item.assetId,
                    maintenance_decision: item.maintenanceDecision,
                })),
                event_start_date: submitEventStart,
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
                event_start_date: submitEventStart,
                event_end_date: submitEventEnd,
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
                ...(formData.venue_contact_name ||
                formData.venue_contact_email ||
                formData.venue_contact_phone
                    ? {
                          venue_contact: {
                              ...(formData.venue_contact_name
                                  ? { name: formData.venue_contact_name }
                                  : {}),
                              ...(formData.venue_contact_email
                                  ? { email: formData.venue_contact_email }
                                  : {}),
                              ...(formData.venue_contact_phone
                                  ? { phone: formData.venue_contact_phone }
                                  : {}),
                          },
                      }
                    : {}),
                // Client-requested delivery window (optional) — date auto-falls-back
                // to event_start_date if user set times but not date explicitly.
                ...(() => {
                    const deliveryDate =
                        formData.requested_delivery_date || formData.event_start_date;
                    if (
                        deliveryDate &&
                        formData.requested_delivery_time_start &&
                        formData.requested_delivery_time_end
                    ) {
                        return {
                            requested_delivery_window: {
                                start: `${deliveryDate}T${formData.requested_delivery_time_start}:00`,
                                end: `${deliveryDate}T${formData.requested_delivery_time_end}:00`,
                            },
                        };
                    }
                    return {};
                })(),
                // Client-requested pickup window (optional) — date auto-falls-back
                // to event_end_date if user set times but not date explicitly.
                ...(() => {
                    const pickupDate = formData.requested_pickup_date || formData.event_end_date;
                    if (
                        pickupDate &&
                        formData.requested_pickup_time_start &&
                        formData.requested_pickup_time_end
                    ) {
                        return {
                            requested_pickup_window: {
                                start: `${pickupDate}T${formData.requested_pickup_time_start}:00`,
                                end: `${pickupDate}T${formData.requested_pickup_time_end}:00`,
                            },
                        };
                    }
                    return {};
                })(),
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
            {/* Progress Header — hidden in self-pickup mode (that flow has its
                own 3-tab nav embedded in SelfPickupCheckoutFlow). */}
            {checkoutMode === "standard" && (
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
            )}

            {/* Step 0 — Delivery Mode (only rendered when feature enabled). */}
            {checkoutMode === "standard" && currentStep === "mode" && (
                <div className="max-w-5xl mx-auto px-8 pt-8 pb-4 space-y-6">
                    <div>
                        <h2 className="text-3xl font-bold mb-2">Delivery Method</h2>
                        <p className="text-muted-foreground">
                            Choose delivery for our logistics team to bring items to your venue, or
                            self-pickup to collect them yourself from the warehouse. You can change
                            this at any time before submitting.
                        </p>
                    </div>

                    <Card className="p-6 bg-card/50 border-border/50">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <button
                                type="button"
                                onClick={() => setPendingMode("standard")}
                                className={`group relative text-left rounded-xl border-2 p-5 transition-all ${
                                    pendingMode === "standard"
                                        ? "border-primary bg-primary/5 ring-2 ring-primary/30 shadow-sm"
                                        : "border-border hover:border-primary/50 hover:bg-muted/30"
                                }`}
                            >
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                        <Truck className="h-5 w-5 text-primary" />
                                    </div>
                                    <p className="font-semibold text-base">Delivery</p>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    Our logistics team delivers to your venue on the date and window
                                    you pick.
                                </p>
                            </button>
                            <button
                                type="button"
                                onClick={() => setPendingMode("self-pickup")}
                                className={`group relative text-left rounded-xl border-2 p-5 transition-all ${
                                    pendingMode === "self-pickup"
                                        ? "border-primary bg-primary/5 ring-2 ring-primary/30 shadow-sm"
                                        : "border-border hover:border-primary/50 hover:bg-muted/30"
                                }`}
                            >
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                        <WarehouseIcon className="h-5 w-5 text-primary" />
                                    </div>
                                    <p className="font-semibold text-base">Self-Pickup</p>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    Collect the items yourself from the warehouse. You provide the
                                    collector and return window.
                                </p>
                            </button>
                        </div>
                    </Card>
                </div>
            )}

            {/* Self-pickup flow (replaces standard steps). The component
                provides its own sticky stepper + content layout matching the
                standard-order flow. */}
            {checkoutMode === "self-pickup" && (
                <SelfPickupCheckoutFlow onSwitchToStandard={() => setCheckoutMode("standard")} />
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
                                                Your order includes item(s) that require
                                                maintenance. Please review condition details and
                                                confirm your decision so our team can proceed
                                                correctly.
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
                                        <h2 className="text-3xl font-bold mb-2">
                                            Review Your Order
                                        </h2>
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
                                                                    <AlertCircle className="h-3 w-3" />{" "}
                                                                    RED — Requires repair
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
                                                                From collection:{" "}
                                                                {item.fromCollectionName}
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
                                        <h2 className="text-3xl font-bold mb-2">
                                            Installation Details
                                        </h2>
                                        <p className="text-muted-foreground">
                                            When do you need these assets to be installed?
                                        </p>
                                    </div>

                                    <Card className="p-8 bg-card/50 border-border/50 space-y-6">
                                        <div className="space-y-6">
                                            {eventDateInputsEnabled && (
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
                                                                    event_start_date:
                                                                        e.target.value,
                                                                });
                                                                setHasCheckedMaintenanceFeasibility(
                                                                    false
                                                                );
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
                                                                setHasCheckedMaintenanceFeasibility(
                                                                    false
                                                                );
                                                                setMaintenanceFeasibilityIssues([]);
                                                            }}
                                                            required
                                                            min={
                                                                formData.event_start_date ||
                                                                calculateMinDate()
                                                            }
                                                            className="h-12 font-mono"
                                                        />
                                                    </div>
                                                </div>
                                            )}

                                            {/* Feasibility helper — inline under the date fields.
                                        Helper copy is gated by the enable_feasibility_helper
                                        platform flag; the hard block on Next is always
                                        enforced via canProceed(). */}
                                            <FeasibilityHelper
                                                helperEnabled={feasibilityHelperEnabled}
                                                isLoading={feasibilityPreview.isLoading}
                                                floorDate={feasibility.floorDate}
                                                userEventDate={
                                                    eventDateInputsEnabled
                                                        ? formData.event_start_date
                                                        : formData.requested_delivery_date
                                                }
                                                userDateFeasible={feasibility.userDateFeasible}
                                                blockingItems={feasibility.blockingItems}
                                                config={feasibilityPreview.data?.config ?? null}
                                                onUseFloorDate={() => {
                                                    if (!feasibility.floorDate) return;
                                                    if (eventDateInputsEnabled) {
                                                        setFormData({
                                                            ...formData,
                                                            event_start_date: feasibility.floorDate,
                                                            event_end_date:
                                                                formData.event_end_date &&
                                                                formData.event_end_date >=
                                                                    feasibility.floorDate
                                                                    ? formData.event_end_date
                                                                    : feasibility.floorDate,
                                                        });
                                                    } else {
                                                        setFormData({
                                                            ...formData,
                                                            requested_delivery_date:
                                                                feasibility.floorDate,
                                                            requested_pickup_date:
                                                                formData.requested_pickup_date &&
                                                                formData.requested_pickup_date >=
                                                                    feasibility.floorDate
                                                                    ? formData.requested_pickup_date
                                                                    : feasibility.floorDate,
                                                        });
                                                    }
                                                }}
                                            />

                                            {/* Delivery + Pickup windows.
                                        When event-dates flag is OFF, these are the primary
                                        input and BOTH are required. Native <input type="date">
                                        + <input type="time"> match the rest of the form's
                                        styling. */}
                                            <div className="space-y-4 pt-4 border-t border-border/40">
                                                <div className="space-y-1">
                                                    <Label className="font-mono uppercase text-xs tracking-wide">
                                                        Delivery &amp; Pickup{" "}
                                                        {eventDateInputsEnabled
                                                            ? "(Optional)"
                                                            : "*"}
                                                    </Label>
                                                    {!eventDateInputsEnabled && (
                                                        <p className="text-xs text-muted-foreground">
                                                            When do you need the items delivered and
                                                            picked up?
                                                        </p>
                                                    )}
                                                </div>

                                                <div className="space-y-5">
                                                    {/* Delivery */}
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                        <div className="space-y-2">
                                                            <Label className="font-mono uppercase text-xs tracking-wide">
                                                                Delivery Date{" "}
                                                                {eventDateInputsEnabled ? "" : "*"}
                                                            </Label>
                                                            <Input
                                                                type="date"
                                                                value={
                                                                    formData.requested_delivery_date
                                                                }
                                                                onChange={(e) =>
                                                                    setFormData({
                                                                        ...formData,
                                                                        requested_delivery_date:
                                                                            e.target.value,
                                                                    })
                                                                }
                                                                min={calculateMinDate()}
                                                                required={!eventDateInputsEnabled}
                                                                className="h-12 font-mono"
                                                            />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label className="font-mono uppercase text-xs tracking-wide">
                                                                From{" "}
                                                                {eventDateInputsEnabled ? "" : "*"}
                                                            </Label>
                                                            <Input
                                                                type="time"
                                                                value={
                                                                    formData.requested_delivery_time_start
                                                                }
                                                                onChange={(e) =>
                                                                    setFormData({
                                                                        ...formData,
                                                                        requested_delivery_time_start:
                                                                            e.target.value,
                                                                    })
                                                                }
                                                                required={!eventDateInputsEnabled}
                                                                className="h-12 font-mono"
                                                            />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label className="font-mono uppercase text-xs tracking-wide">
                                                                To{" "}
                                                                {eventDateInputsEnabled ? "" : "*"}
                                                            </Label>
                                                            <Input
                                                                type="time"
                                                                value={
                                                                    formData.requested_delivery_time_end
                                                                }
                                                                onChange={(e) =>
                                                                    setFormData({
                                                                        ...formData,
                                                                        requested_delivery_time_end:
                                                                            e.target.value,
                                                                    })
                                                                }
                                                                required={!eventDateInputsEnabled}
                                                                className="h-12 font-mono"
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Pickup */}
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                        <div className="space-y-2">
                                                            <Label className="font-mono uppercase text-xs tracking-wide">
                                                                Pickup Date{" "}
                                                                {eventDateInputsEnabled ? "" : "*"}
                                                            </Label>
                                                            <Input
                                                                type="date"
                                                                value={
                                                                    formData.requested_pickup_date
                                                                }
                                                                onChange={(e) =>
                                                                    setFormData({
                                                                        ...formData,
                                                                        requested_pickup_date:
                                                                            e.target.value,
                                                                    })
                                                                }
                                                                min={
                                                                    formData.requested_delivery_date ||
                                                                    calculateMinDate()
                                                                }
                                                                required={!eventDateInputsEnabled}
                                                                className="h-12 font-mono"
                                                            />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label className="font-mono uppercase text-xs tracking-wide">
                                                                From{" "}
                                                                {eventDateInputsEnabled ? "" : "*"}
                                                            </Label>
                                                            <Input
                                                                type="time"
                                                                value={
                                                                    formData.requested_pickup_time_start
                                                                }
                                                                onChange={(e) =>
                                                                    setFormData({
                                                                        ...formData,
                                                                        requested_pickup_time_start:
                                                                            e.target.value,
                                                                    })
                                                                }
                                                                required={!eventDateInputsEnabled}
                                                                className="h-12 font-mono"
                                                            />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label className="font-mono uppercase text-xs tracking-wide">
                                                                To{" "}
                                                                {eventDateInputsEnabled ? "" : "*"}
                                                            </Label>
                                                            <Input
                                                                type="time"
                                                                value={
                                                                    formData.requested_pickup_time_end
                                                                }
                                                                onChange={(e) =>
                                                                    setFormData({
                                                                        ...formData,
                                                                        requested_pickup_time_end:
                                                                            e.target.value,
                                                                    })
                                                                }
                                                                required={!eventDateInputsEnabled}
                                                                className="h-12 font-mono"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {effectiveEventStart && effectiveEventEnd && (
                                                <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                                                    <div className="flex items-center gap-3">
                                                        <Calendar className="h-5 w-5 text-primary" />
                                                        <div>
                                                            <p className="text-sm font-medium">
                                                                {eventDateInputsEnabled
                                                                    ? "Event Duration"
                                                                    : "Rental Duration"}
                                                            </p>
                                                            <p className="text-xs text-muted-foreground font-mono">
                                                                {Math.ceil(
                                                                    (new Date(
                                                                        effectiveEventEnd
                                                                    ).getTime() -
                                                                        new Date(
                                                                            effectiveEventStart
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
                                                            Your cart includes RED items. These are
                                                            fix-only items and must pass feasibility
                                                            before you can continue.
                                                        </p>
                                                    </Card>
                                                    <RedFeasibilityAlert
                                                        issues={maintenanceFeasibilityIssues}
                                                        hasChecked={
                                                            hasCheckedMaintenanceFeasibility
                                                        }
                                                        isChecking={
                                                            maintenanceFeasibilityCheck.isPending
                                                        }
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
                                                        {formData.venue_country_name ||
                                                            "Loading..."}
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
                                                                venue_city_name:
                                                                    selectedCity?.name || "",
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
                                                        The person at the venue who can coordinate
                                                        arrival, access, unloading, or handover.
                                                    </p>
                                                </div>
                                                <div className="grid gap-4 md:grid-cols-3">
                                                    <div className="space-y-1">
                                                        <Label
                                                            htmlFor="venueContactName"
                                                            className="text-xs"
                                                        >
                                                            Name
                                                        </Label>
                                                        <Input
                                                            id="venueContactName"
                                                            value={formData.venue_contact_name}
                                                            onChange={(e) =>
                                                                setFormData({
                                                                    ...formData,
                                                                    venue_contact_name:
                                                                        e.target.value,
                                                                })
                                                            }
                                                            placeholder="Contact name"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <Label
                                                            htmlFor="venueContactEmail"
                                                            className="text-xs"
                                                        >
                                                            Email
                                                        </Label>
                                                        <Input
                                                            id="venueContactEmail"
                                                            type="email"
                                                            value={formData.venue_contact_email}
                                                            onChange={(e) =>
                                                                setFormData({
                                                                    ...formData,
                                                                    venue_contact_email:
                                                                        e.target.value,
                                                                })
                                                            }
                                                            placeholder="contact@venue.com"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <Label
                                                            htmlFor="venueContactPhone"
                                                            className="text-xs"
                                                        >
                                                            Phone
                                                        </Label>
                                                        <Input
                                                            id="venueContactPhone"
                                                            value={formData.venue_contact_phone}
                                                            onChange={(e) =>
                                                                setFormData({
                                                                    ...formData,
                                                                    venue_contact_phone:
                                                                        e.target.value,
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
                                                            Venue requires permits or access
                                                            coordination
                                                        </Label>
                                                        <p className="text-xs text-muted-foreground">
                                                            Share what you know now. Additional
                                                            charges may apply depending on venue
                                                            requirements.
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
                                                            <label className="flex items-start gap-3 rounded-md border border-border/60 bg-background/70 p-3">
                                                                <Checkbox
                                                                    checked={
                                                                        formData.requires_vehicle_docs
                                                                    }
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
                                                                        Use this if venue access
                                                                        needs truck registration or
                                                                        driver docs.
                                                                    </p>
                                                                </div>
                                                            </label>
                                                            <label className="flex items-start gap-3 rounded-md border border-border/60 bg-background/70 p-3">
                                                                <Checkbox
                                                                    checked={
                                                                        formData.requires_staff_ids
                                                                    }
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
                                                                        Use this if crew names, IDs,
                                                                        or passes are needed before
                                                                        entry.
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
                                                                        permit_notes:
                                                                            e.target.value,
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
                                        <h2 className="text-3xl font-bold mb-2">
                                            Point of Contact
                                        </h2>
                                        <p className="text-muted-foreground">
                                            Provide the on-site contact for this order. Our team
                                            will reach out to this person for coordination and
                                            updates.
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
                                                        !isValidPhoneNumber(
                                                            formData.contact_phone
                                                        ) && (
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
                                                    Include details about setup, branding, or any
                                                    special requirements
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

                                    {/* Feasibility re-check. When a user flips an ORANGE
                                decision to "Fix", the preview query re-fires with
                                the new decision; if that pushes the earliest date
                                past the event date they picked at the installation
                                step, the helper surfaces it here + the Submit button
                                is blocked via canProceed. */}
                                    <FeasibilityHelper
                                        helperEnabled={feasibilityHelperEnabled}
                                        isLoading={feasibilityPreview.isLoading}
                                        floorDate={feasibility.floorDate}
                                        userEventDate={
                                            eventDateInputsEnabled
                                                ? formData.event_start_date
                                                : formData.requested_delivery_date
                                        }
                                        userDateFeasible={feasibility.userDateFeasible}
                                        blockingItems={feasibility.blockingItems}
                                        config={feasibilityPreview.data?.config ?? null}
                                        onUseFloorDate={() => {
                                            if (!feasibility.floorDate) return;
                                            if (eventDateInputsEnabled) {
                                                setFormData({
                                                    ...formData,
                                                    event_start_date: feasibility.floorDate,
                                                    event_end_date:
                                                        formData.event_end_date &&
                                                        formData.event_end_date >=
                                                            feasibility.floorDate
                                                            ? formData.event_end_date
                                                            : feasibility.floorDate,
                                                });
                                            } else {
                                                setFormData({
                                                    ...formData,
                                                    requested_delivery_date: feasibility.floorDate,
                                                    requested_pickup_date:
                                                        formData.requested_pickup_date &&
                                                        formData.requested_pickup_date >=
                                                            feasibility.floorDate
                                                            ? formData.requested_pickup_date
                                                            : feasibility.floorDate,
                                                });
                                            }
                                        }}
                                    />

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
                                            {/* Schedule (delivery + pickup always shown; event dates only when flag on) */}
                                            <Card className="p-6 bg-card/50 border-border/50">
                                                <h3 className="text-lg font-semibold mb-4 font-mono uppercase tracking-wide">
                                                    Schedule
                                                </h3>
                                                <div className="space-y-3 text-sm">
                                                    {eventDateInputsEnabled &&
                                                        formData.event_start_date && (
                                                            <div>
                                                                <p className="text-xs text-muted-foreground font-mono uppercase tracking-wide mb-1">
                                                                    Event Start
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
                                                        )}
                                                    {eventDateInputsEnabled &&
                                                        formData.event_end_date && (
                                                            <div>
                                                                <p className="text-xs text-muted-foreground font-mono uppercase tracking-wide mb-1">
                                                                    Event End
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
                                                        )}
                                                    {formData.requested_delivery_date && (
                                                        <div>
                                                            <p className="text-xs text-muted-foreground font-mono uppercase tracking-wide mb-1">
                                                                Delivery
                                                            </p>
                                                            <p className="font-medium">
                                                                {new Date(
                                                                    formData.requested_delivery_date
                                                                ).toLocaleDateString("en-US", {
                                                                    weekday: "long",
                                                                    year: "numeric",
                                                                    month: "long",
                                                                    day: "numeric",
                                                                })}
                                                                {formData.requested_delivery_time_start &&
                                                                formData.requested_delivery_time_end ? (
                                                                    <span className="text-muted-foreground font-mono">
                                                                        {" "}
                                                                        ·{" "}
                                                                        {
                                                                            formData.requested_delivery_time_start
                                                                        }
                                                                        –
                                                                        {
                                                                            formData.requested_delivery_time_end
                                                                        }
                                                                    </span>
                                                                ) : null}
                                                            </p>
                                                        </div>
                                                    )}
                                                    {formData.requested_pickup_date && (
                                                        <div>
                                                            <p className="text-xs text-muted-foreground font-mono uppercase tracking-wide mb-1">
                                                                Pickup
                                                            </p>
                                                            <p className="font-medium">
                                                                {new Date(
                                                                    formData.requested_pickup_date
                                                                ).toLocaleDateString("en-US", {
                                                                    weekday: "long",
                                                                    year: "numeric",
                                                                    month: "long",
                                                                    day: "numeric",
                                                                })}
                                                                {formData.requested_pickup_time_start &&
                                                                formData.requested_pickup_time_end ? (
                                                                    <span className="text-muted-foreground font-mono">
                                                                        {" "}
                                                                        ·{" "}
                                                                        {
                                                                            formData.requested_pickup_time_start
                                                                        }
                                                                        –
                                                                        {
                                                                            formData.requested_pickup_time_end
                                                                        }
                                                                    </span>
                                                                ) : null}
                                                            </p>
                                                        </div>
                                                    )}
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
                                                        <p className="font-medium">
                                                            {formData.venue_name}
                                                        </p>
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
                                                                {formData.permit_owner ===
                                                                    "CLIENT" &&
                                                                    "Client will arrange permits"}
                                                                {formData.permit_owner ===
                                                                    "PLATFORM" &&
                                                                    "Platform should arrange permits"}
                                                                {formData.permit_owner ===
                                                                    "UNKNOWN" &&
                                                                    "Permit ownership still to be confirmed"}
                                                            </p>
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
                                                            <li
                                                                key={i}
                                                                className="flex items-start gap-2"
                                                            >
                                                                <span className="text-destructive">
                                                                    •
                                                                </span>
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
                                                            <b>{formData.venue_city_name}</b>, You
                                                            will receive a custom quote via email
                                                            within 24-48 hours after submitting your
                                                            order.
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
                                    disabled={
                                        !canProceed() || maintenanceFeasibilityCheck.isPending
                                    }
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
