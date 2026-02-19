/**
 * CHECKOUT INTEGRATION EXAMPLE
 * Complete example showing order submission with hybrid pricing
 */

"use client";

import { useState, useEffect } from "react";
import { TransportSelector } from "./TransportSelector";
import { OrderEstimate } from "./OrderEstimate";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { calculateTotalVolume } from "@/lib/cart-helpers";
import { submitOrder, calculateEstimate } from "@/lib/api/order-api";
import type { TripType, OrderEstimate as OrderEstimateType } from "@/types/hybrid-pricing";

interface CheckoutExampleProps {
    cart: any[];
    venueData: {
        name: string;
        country: string;
        city: string;
        address: string;
        accessNotes?: string;
    };
    eventData: {
        startDate: string;
        endDate: string;
    };
    contactData: {
        name: string;
        email: string;
        phone: string;
    };
}

export function CheckoutIntegrationExample({
    cart,
    venueData,
    eventData,
    contactData,
}: CheckoutExampleProps) {
    const [tripType, setTripType] = useState<TripType>("ROUND_TRIP");
    const [estimate, setEstimate] = useState<OrderEstimateType | null>(null);
    const [estimateLoading, setEstimateLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Calculate estimate when cart/venue/tripType changes
    useEffect(() => {
        if (cart.length === 0 || !venueData.city) return;

        async function fetchEstimate() {
            setEstimateLoading(true);
            try {
                const result = await calculateEstimate({
                    items: cart.map((item) => ({
                        asset_id: item.assetId,
                        quantity: item.quantity,
                    })),
                    venue_city: venueData.city,
                    trip_type: tripType,
                });
                setEstimate(result.estimate);
            } catch (error: any) {
                toast.error("Failed to calculate estimate");
            } finally {
                setEstimateLoading(false);
            }
        }

        fetchEstimate();
    }, [cart, venueData.city, tripType]);

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            const payload = {
                items: cart.map((item) => ({
                    asset_id: item.assetId,
                    quantity: item.quantity,
                    from_collection_id: item.fromCollectionId,
                })),
                trip_type: tripType, // NEW
                event_start_date: eventData.startDate,
                event_end_date: eventData.endDate,
                venue_name: venueData.name,
                venue_country_id: venueData.country,
                venue_city_id: venueData.city,
                venue_address: venueData.address,
                venue_access_notes: venueData.accessNotes,
                contact_name: contactData.name,
                contact_email: contactData.email,
                contact_phone: contactData.phone,
            };

            const result = await submitOrder(payload);
            toast.success("Order submitted successfully!");
            // Navigate to order confirmation or order detail
            // router.push(`/orders/${result.order_id}`)
        } catch (error: any) {
            toast.error(error.message || "Failed to submit order");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Step 1: Cart Summary */}
            <div>
                <h3 className="font-semibold mb-2">Order Items ({cart.length})</h3>
                <p className="text-sm text-muted-foreground">
                    Total Volume: {calculateTotalVolume(cart).toFixed(1)} m³
                </p>
            </div>

            {/* Step 2: Transport Selection */}
            <TransportSelector tripType={tripType} onTripTypeChange={setTripType} />

            {/* Step 3: Estimate Display */}
            {estimateLoading ? (
                <p className="text-sm text-muted-foreground">Calculating estimate...</p>
            ) : estimate ? (
                <OrderEstimate estimate={estimate} hasRebrandItems={false} />
            ) : null}

            {/* Step 4: Submit Button */}
            <div className="flex gap-3">
                <Button variant="outline" disabled={submitting}>
                    Back
                </Button>
                <Button onClick={handleSubmit} disabled={submitting} className="flex-1">
                    {submitting ? "Submitting Order..." : "Submit Order"}
                </Button>
            </div>
        </div>
    );
}

/**
 * TO INTEGRATE INTO EXISTING CHECKOUT:
 *
 * 1. Import TransportSelector, OrderEstimate, cart helpers
 * 2. Add tripType state to checkout
 * 3. Call calculateEstimate() in useEffect when cart/venue changes
 * 4. Display estimate in review step
 * 5. Include trip_type and rebrand fields in submission payload
 */
