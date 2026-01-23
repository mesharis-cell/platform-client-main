'use client'

/**
 * Order Confirmation Success Component
 * Displays after successful order submission
 */

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { OrderEstimate } from '../checkout/OrderEstimate'
import type { OrderEstimate as OrderEstimateType } from '@/types/hybrid-pricing'

interface OrderConfirmationSuccessProps {
  orderId: string
  orderIdReadable: string
  estimate: OrderEstimateType
  hasRebrandItems: boolean
  itemCount: number
  totalVolume: number
  eventDates: {
    startDate: string
    endDate: string
  }
  venue: {
    name: string
    city: string
  }
}

export function OrderConfirmationSuccess({
  orderId,
  orderIdReadable,
  estimate,
  hasRebrandItems,
  itemCount,
  totalVolume,
  eventDates,
  venue,
}: OrderConfirmationSuccessProps) {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Success Header */}
      <Card className="border-green-500 bg-green-50 dark:bg-green-950/20">
        <CardContent className="p-6 flex items-center gap-4">
          <CheckCircle className="h-12 w-12 text-green-600 shrink-0" />
          <div>
            <h2 className="text-2xl font-bold text-green-900 dark:text-green-100">
              Order Submitted Successfully!
            </h2>
            <p className="text-green-800 dark:text-green-200">
              Order {orderIdReadable}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Order Summary */}
      <Card>
        <CardContent className="p-6 space-y-3">
          <div>
            <p className="text-sm text-muted-foreground">Items</p>
            <p className="font-semibold">
              {itemCount} items ({totalVolume.toFixed(1)} m³ total)
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Event Dates</p>
            <p className="font-semibold">
              {new Date(eventDates.startDate).toLocaleDateString()} -{' '}
              {new Date(eventDates.endDate).toLocaleDateString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Venue</p>
            <p className="font-semibold">{venue.name}, {venue.city}</p>
          </div>
        </CardContent>
      </Card>

      {/* Pricing Estimate */}
      <OrderEstimate estimate={estimate} hasRebrandItems={hasRebrandItems} />

      {/* Rebrand Warning */}
      {hasRebrandItems && (
        <Card className="border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/10">
          <CardContent className="p-4">
            <p className="text-sm text-amber-800 dark:text-amber-300">
              ⚠️ This order includes rebranding work. Rebranding costs will be added to your final quote.
              Additional services or vehicle requirements may also affect the final price.
            </p>
          </CardContent>
        </Card>
      )}

      {/* What's Next */}
      <Card>
        <CardHeader>
          <h3 className="font-semibold">What's Next?</h3>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3 text-sm">
            <li className="flex items-start gap-3">
              <span className="shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary font-semibold text-xs">
                1
              </span>
              <div>
                <p className="font-medium">Logistics Team Review</p>
                <p className="text-muted-foreground">
                  Our logistics team will review your order and add any necessary services.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary font-semibold text-xs">
                2
              </span>
              <div>
                <p className="font-medium">Detailed Quote Prepared</p>
                <p className="text-muted-foreground">
                  We'll prepare a detailed quote including any additional services or rebranding costs.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary font-semibold text-xs">
                3
              </span>
              <div>
                <p className="font-medium">Quote Sent for Your Approval</p>
                <p className="text-muted-foreground">
                  You'll receive the quote via email. Please review and respond within 48 hours.
                </p>
              </div>
            </li>
          </ol>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        <Button asChild variant="outline" className="flex-1">
          <Link href={`/orders/${orderId}`}>
            View Order Details
          </Link>
        </Button>
        <Button asChild className="flex-1">
          <Link href="/dashboard">
            <ArrowRight className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
        </Button>
      </div>
    </div>
  )
}
