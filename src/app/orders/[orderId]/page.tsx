'use client'

/**
 * Order Confirmation Page
 * Industrial-refined aesthetic matching catalog/checkout
 */

import { use, useState } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import {
    CheckCircle2,
    Package,
    Calendar,
    MapPin,
    User,
    FileText,
    Download,
    ArrowLeft,
    Clock,
    AlertCircle,
    DollarSign,
    XCircle,
    Cuboid,
    Truck,
    BoxIcon,
    Loader,
    PartyPopper,
    Archive,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
    useClientApproveQuote,
    useClientDeclineQuote,
} from '@/hooks/use-orders'
import {
    useClientOrderDetail,
    useDownloadInvoice,
} from '@/hooks/use-client-orders'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { ClientNav } from '@/components/client-nav'

export default function OrderPage({
    params,
}: {
    params: Promise<{ orderId: string }>
}) {
    const { orderId } = use(params)
    const router = useRouter()
    const { data: orderData, isLoading } = useClientOrderDetail(orderId)
    const order = orderData?.data;
    const approveQuote = useClientApproveQuote()
    const declineQuote = useClientDeclineQuote()
    const downloadInvoice = useDownloadInvoice()

    const [approveDialogOpen, setApproveDialogOpen] = useState(false)
    const [declineDialogOpen, setDeclineDialogOpen] = useState(false)
    const [declineReason, setDeclineReason] = useState('')
    const [notes, setNotes] = useState('')

    const handleApprove = async () => {
        try {
            await approveQuote.mutateAsync({
                orderId: orderData?.data?.id,
                notes: notes || undefined,
            })
            toast.success(
                'Quote approved successfully! Proceeding to invoicing.'
            )
            setApproveDialogOpen(false)
            setNotes('')
        } catch (error: any) {
            toast.error(error.message || 'Failed to approve quote')
        }
    }

    const handleDecline = async () => {
        if (declineReason.trim().length < 10) {
            toast.error('Decline reason must be at least 10 characters')
            return
        }

        try {
            await declineQuote.mutateAsync({
                orderId: orderData?.data?.id,
                declineReason: declineReason.trim(),
            })
            toast.success(
                'Quote declined. Your feedback has been sent to our team.'
            )
            setDeclineDialogOpen(false)
            setDeclineReason('')
        } catch (error: any) {
            toast.error(error.message || 'Failed to decline quote')
        }
    }

    const handleDownloadInvoice = async () => {
        if (!invoice) return

        try {
            await downloadInvoice.mutateAsync(invoice.invoiceNumber)
            toast.success('Invoice downloaded successfully')
        } catch (error: any) {
            toast.error(error.message || 'Failed to download invoice')
        }
    }

    if (isLoading) {
        return (
            <ClientNav>
                <div className='min-h-screen bg-linear-to-br from-background via-muted/10 to-background'>
                    <div className='max-w-7xl mx-auto px-8 py-10'>
                        <Skeleton className='h-40 w-full mb-8' />
                        <Skeleton className='h-96 w-full' />
                    </div>
                </div>
            </ClientNav>
        )
    }

    if (!order) {
        return (
            <ClientNav>
                <div className='min-h-screen bg-linear-to-br from-background via-muted/10 to-background flex items-center justify-center p-8'>
                    <Card className='max-w-md w-full p-10 text-center border-border/50 bg-card/50'>
                        <div className='h-20 w-20 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-6'>
                            <AlertCircle className='w-10 h-10 text-muted-foreground/50' />
                        </div>
                        <h2 className='text-2xl font-bold mb-3'>
                            Order Not Found
                        </h2>
                        <p className='text-muted-foreground mb-6'>
                            Order {orderId} does not exist or you don't have
                            access to it.
                        </p>
                        <Button
                            onClick={() => router.push('/my-orders')}
                            variant='outline'
                            className='gap-2 font-mono'
                        >
                            <ArrowLeft className='w-4 h-4' />
                            Back to Orders
                        </Button>
                    </Card>
                </div>
            </ClientNav>
        )
    }

    const statusColors: Record<string, string> = {
        DRAFT: 'bg-muted text-muted-foreground border-muted',
        SUBMITTED: 'bg-primary/10 text-primary border-primary/30',
        PRICING_REVIEW: 'text-secondary border-secondary/30',
        PENDING_APPROVAL:
            'bg-orange-500/10 text-orange-600 border-orange-500/30',
        QUOTED: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
        APPROVED: 'bg-green-500/10 text-green-600 border-green-500/30',
        DECLINED: 'bg-destructive/10 text-destructive border-destructive/30',
        INVOICED: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/30',
        PAID: 'bg-green-500/10 text-green-600 border-green-500/30',
        CONFIRMED: 'bg-teal-500/10 text-teal-600 border-teal-500/30',
        IN_PREPARATION: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/30',
        READY_FOR_DELIVERY: 'bg-sky-500/10 text-sky-600 border-sky-500/30',
        IN_TRANSIT: 'bg-violet-500/10 text-violet-600 border-violet-500/30',
        DELIVERED: 'bg-fuchsia-500/10 text-fuchsia-600 border-fuchsia-500/30',
        IN_USE: 'bg-pink-500/10 text-pink-600 border-pink-500/30',
        AWAITING_RETURN: 'bg-rose-500/10 text-rose-600 border-rose-500/30',
        CLOSED: 'bg-slate-600/10 text-slate-700 border-slate-600/20',
    }

    // Individual state checks for precise UI control
    const isSubmitted = order.order_status === 'SUBMITTED'
    const isPricingReview = order.order_status === 'PRICING_REVIEW'
    const isPendingApproval = order.order_status === 'PENDING_APPROVAL'
    const isQuoted = order.order_status === 'QUOTED'
    const isApproved = order.order_status === 'APPROVED'
    const isDeclined = order.order_status === 'DECLINED'
    const isInvoiced = order.order_status === 'INVOICED'
    const isPaid = order.order_status === 'PAID'
    const isConfirmed = order.order_status === 'CONFIRMED'
    const isInPreparation = order.order_status === 'IN_PREPARATION'
    const isReadyForDelivery = order.order_status === 'READY_FOR_DELIVERY'
    const isInTransit = order.order_status === 'IN_TRANSIT'
    const isDelivered = order.order_status === 'DELIVERED'
    const isInUse = order.order_status === 'IN_USE'
    const isAwaitingReturn = order.order_status === 'AWAITING_RETURN'
    const isClosed = order.order_status === 'CLOSED'

    // Grouped checks for sections
    const showQuoteSection = isQuoted || isApproved || isDeclined
    const showInvoiceSection =
        isInvoiced ||
        isPaid ||
        isConfirmed ||
        isInPreparation ||
        isReadyForDelivery ||
        isInTransit ||
        isDelivered ||
        isInUse ||
        isAwaitingReturn ||
        isClosed
    const showDeliveryTracking =
        isInTransit || isDelivered || isInUse || isAwaitingReturn || isClosed
    const isFulfillmentStage =
        isConfirmed ||
        isInPreparation ||
        isReadyForDelivery ||
        isInTransit ||
        isDelivered ||
        isInUse ||
        isAwaitingReturn ||
        isClosed

    const invoice =
        showInvoiceSection && order.invoice_id
            ? {
                invoiceNumber: order.invoice_id,
                invoiceGeneratedAt: order.invoice_generated_at,
                finalTotalPrice: order.final_pricing?.total || order.calculated_totals?.total_price || 0, // Fallback if final_pricing is null but calculated exists
                isPaid:
                    isPaid ||
                    isConfirmed ||
                    isInPreparation ||
                    isReadyForDelivery ||
                    isInTransit ||
                    isDelivered ||
                    isInUse ||
                    isAwaitingReturn ||
                    isClosed,
                invoicePaidAt: isPaid ? order.invoice_paid_at : null,
            }
            : null

    return (
        <ClientNav>
            <div className='min-h-screen bg-linear-gradient-to-br from-background via-muted/10 to-background relative'>
                {/* Subtle grid pattern */}
                <div
                    className='fixed inset-0 opacity-[0.015] pointer-events-none'
                    style={{
                        backgroundImage: `
            linear-gradient(hsl(var(--primary)) 1px, transparent 1px),
            linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)
          `,
                        backgroundSize: '60px 60px',
                    }}
                />

                <div className='relative z-10 max-w-7xl mx-auto px-8 py-10'>
                    {/* Breadcrumb */}
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className='flex items-center gap-2 text-sm text-muted-foreground mb-8 font-mono'
                    >
                        <button
                            onClick={() => router.push('/orders')}
                            className='hover:text-foreground transition-colors'
                        >
                            Orders
                        </button>
                        <span>/</span>
                        <span className='text-foreground'>{order?.order_id}</span>
                    </motion.div>

                    {/* Status Hero */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className='mb-8'
                    >
                        <Card className='p-8 bg-card/50 backdrop-blur-sm border-border/40 overflow-hidden relative'>
                            <div className='flex items-center justify-between gap-6'>
                                <div className='flex-1'>
                                    <div className='flex items-center gap-3 mb-3'>
                                        <Badge
                                            className={`font-mono text-xs border ${statusColors[order?.order_status] || 'bg-muted border-muted'}`}
                                        >
                                            {order?.order_status.replace(/_/g, ' ')}
                                        </Badge>
                                        <span className='text-xs text-muted-foreground font-mono flex items-center gap-1'>
                                            <Clock className='w-3 h-3' />
                                            {order.quote_sent_at
                                                ? `Quote sent ${new Date(order.quote_sent_at).toLocaleDateString()}`
                                                : `Submitted ${new Date(order.created_at).toLocaleDateString()}`}
                                        </span>
                                    </div>
                                    <h1 className='text-4xl font-bold mb-2'>
                                        {isSubmitted && 'Order Submitted'}
                                        {isPricingReview && 'Under Review'}
                                        {isPendingApproval && 'Pricing Under Review'}
                                        {isQuoted && 'Quote Ready'}
                                        {isApproved && 'Quote Approved'}
                                        {isDeclined && 'Quote Declined'}
                                        {isInvoiced && 'Invoice Ready'}
                                        {isPaid && 'Payment Confirmed'}
                                        {isConfirmed && 'Order Confirmed'}
                                        {isInPreparation &&
                                            'Preparing Your Order'}
                                        {isReadyForDelivery && 'Ready to Ship'}
                                        {isInTransit && 'On The Way'}
                                        {isDelivered && 'Delivered'}
                                        {isInUse && 'Enjoy Your Event!'}
                                        {isAwaitingReturn && 'Pickup Scheduled'}
                                        {isClosed && 'Order Complete'}
                                    </h1>
                                    <p className='text-muted-foreground leading-relaxed'>
                                        {isSubmitted &&
                                            'Thank you for your order. Our team is reviewing your requirements.'}
                                        {isPricingReview &&
                                            'We are calculating pricing based on your event details and logistics requirements.'}
                                        {isPendingApproval &&
                                            'Our management team is reviewing the pricing. You will receive your quote shortly.'}
                                        {isQuoted &&
                                            'Your quote is ready! Review the pricing below and approve or decline.'}
                                        {isApproved &&
                                            'Your order is proceeding to invoicing. We will begin fulfillment preparations.'}
                                        {isDeclined &&
                                            'Your feedback has been received. Our team may reach out to discuss alternatives.'}
                                        {isInvoiced &&
                                            'Your invoice is ready for payment. Download it below and proceed with payment.'}
                                        {isPaid &&
                                            'Payment confirmed! We are setting up delivery schedules.'}
                                        {isConfirmed &&
                                            'Your order has been confirmed. Items are being prepared for your event.'}
                                        {isInPreparation &&
                                            'Our warehouse team is gathering your items.'}
                                        {isReadyForDelivery &&
                                            'All items are packed and ready for dispatch.'}
                                        {isInTransit &&
                                            'Your items are on their way to the venue.'}
                                        {isDelivered &&
                                            'Items delivered successfully. Enjoy your event!'}
                                        {isInUse &&
                                            'Your event is in progress. We hope everything goes wonderfully!'}
                                        {isAwaitingReturn &&
                                            'Your event is complete. Items will be picked up during the scheduled window.'}
                                        {isClosed &&
                                            'All items returned. Thank you for choosing us!'}
                                    </p>
                                </div>
                                <div
                                    className={`w-20 h-20 rounded-xl flex items-center justify-center shrink-0 ${isApproved ||
                                        isPaid ||
                                        isDelivered ||
                                        isClosed
                                        ? 'bg-green-500'
                                        : isDeclined
                                            ? 'bg-destructive'
                                            : isQuoted || isInvoiced
                                                ? 'bg-amber-500'
                                                : isPendingApproval
                                                    ? 'bg-orange-500'
                                                    : isInTransit
                                                        ? 'bg-violet-500'
                                                        : isInPreparation
                                                            ? 'bg-cyan-500'
                                                            : isAwaitingReturn
                                                                ? 'bg-rose-500'
                                                                : 'bg-primary'
                                        }`}
                                >
                                    {(isSubmitted || isPricingReview) && (
                                        <CheckCircle2 className='w-10 h-10 text-white' />
                                    )}
                                    {isPendingApproval && (
                                        <Clock className='w-10 h-10 text-white' />
                                    )}
                                    {isQuoted && (
                                        <DollarSign className='w-10 h-10 text-white' />
                                    )}
                                    {isApproved && (
                                        <CheckCircle2 className='w-10 h-10 text-white' />
                                    )}
                                    {isDeclined && (
                                        <XCircle className='w-10 h-10 text-white' />
                                    )}
                                    {isInvoiced && (
                                        <FileText className='w-10 h-10 text-white' />
                                    )}
                                    {isPaid && (
                                        <CheckCircle2 className='w-10 h-10 text-white' />
                                    )}
                                    {isConfirmed && (
                                        <CheckCircle2 className='w-10 h-10 text-white' />
                                    )}
                                    {isInPreparation && (
                                        <BoxIcon className='w-10 h-10 text-white' />
                                    )}
                                    {isReadyForDelivery && (
                                        <Package className='w-10 h-10 text-white' />
                                    )}
                                    {isInTransit && (
                                        <Truck className='w-10 h-10 text-white' />
                                    )}
                                    {isDelivered && (
                                        <CheckCircle2 className='w-10 h-10 text-white' />
                                    )}
                                    {isInUse && (
                                        <PartyPopper className='w-10 h-10 text-white' />
                                    )}
                                    {isAwaitingReturn && (
                                        <Clock className='w-10 h-10 text-white' />
                                    )}
                                    {isClosed && (
                                        <Archive className='w-10 h-10 text-white' />
                                    )}
                                </div>
                            </div>
                        </Card>
                    </motion.div>

                    {/* Order ID Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className='mb-6'
                    >
                        <Card className='p-6 bg-card/50 backdrop-blur-sm border-border/40'>
                            <div className='flex items-center justify-between'>
                                <div>
                                    <p className='text-xs font-mono text-muted-foreground uppercase tracking-wide mb-1'>
                                        Order ID
                                    </p>
                                    <p className='text-2xl font-bold font-mono tracking-wider'>
                                        {order.order_id}
                                    </p>
                                </div>
                                <Cuboid className='h-12 w-12 text-primary/20' />
                            </div>
                        </Card>
                    </motion.div>

                    <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
                        {/* Main Content */}
                        <div className='lg:col-span-2 space-y-6'>
                            {/* Feedback #3: Price Adjustment Banner - Show for QUOTED if A2 adjusted pricing */}
                            {isQuoted &&
                                (order?.logistic_pricing?.base_price ||
                                    order?.logistics_pricing?.adjusted_price) && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.25 }}
                                    >
                                        <Card className='p-4 bg-blue-500/5 border-blue-500/30'>
                                            <div className='flex items-start gap-3'>
                                                <AlertCircle className='h-5 w-5 text-blue-600 shrink-0 mt-0.5' />
                                                <div className='flex-1'>
                                                    <p className='font-mono text-sm font-bold text-blue-700 dark:text-blue-400 mb-2'>
                                                        Price Adjustment Applied
                                                    </p>
                                                    <p className='font-mono text-xs text-muted-foreground mb-2'>
                                                        {order.logistics_pricing?.adjustment_reason}
                                                    </p>
                                                    {order?.platform_pricing?.notes && (
                                                        <p className='font-mono text-xs text-muted-foreground italic p-2 bg-background/50 rounded border border-blue-500/20'>
                                                            Note:{' '}
                                                            {
                                                                order?.platform_pricing?.notes
                                                            }
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </Card>
                                    </motion.div>
                                )}

                            {/* Quote Section */}
                            {showQuoteSection && order?.final_pricing?.total_price && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.3 }}
                                >
                                    <Card
                                        className={`p-6 bg-card/50 backdrop-blur-sm border ${isApproved
                                            ? 'border-green-500/30'
                                            : isDeclined
                                                ? 'border-destructive/30'
                                                : 'border-amber-500/30'
                                            }`}
                                    >
                                        <div className='flex items-center gap-2 mb-4'>
                                            <DollarSign className='w-5 h-5 text-primary' />
                                            <h3 className='text-lg font-bold font-mono uppercase tracking-wide'>
                                                Quote
                                            </h3>
                                        </div>

                                        <div className='text-4xl font-bold font-mono text-primary mb-4'>
                                            AED{' '}
                                            {order?.final_pricing?.total_price
                                                ? parseFloat(order.final_pricing.total_price).toFixed(2)
                                                : 'N/A'}
                                        </div>

                                        {isQuoted && (
                                            <div className='flex gap-3'>
                                                <Button
                                                    onClick={() =>
                                                        setApproveDialogOpen(true)
                                                    }
                                                    className='flex-1 font-mono gap-2'
                                                >
                                                    <CheckCircle2 className='w-4 h-4' />
                                                    Approve
                                                </Button>
                                                <Button
                                                    onClick={() =>
                                                        setDeclineDialogOpen(true)
                                                    }
                                                    variant='outline'
                                                    className='flex-1 font-mono gap-2'
                                                >
                                                    <XCircle className='w-4 h-4' />
                                                    Decline
                                                </Button>
                                            </div>
                                        )}

                                        {isApproved && (
                                            <div className='p-3 bg-green-500/10 border border-green-500/20 rounded-md'>
                                                <p className='text-xs font-mono text-green-700 dark:text-green-400'>
                                                    <CheckCircle2 className='w-3 h-3 inline mr-1' />
                                                    Approved{' '}
                                                    {new Date(order.updated_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                        )}
                                        {isDeclined && (
                                            <div className='p-3 bg-destructive/10 border border-destructive/20 rounded-md'>
                                                <p className='text-xs font-mono text-destructive'>
                                                    <XCircle className='w-3 h-3 inline mr-1' />
                                                    Declined{' '}
                                                    {new Date(order.updated_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                        )}
                                    </Card>
                                </motion.div>
                            )}

                            {/* Invoice Section */}
                            {showInvoiceSection && invoice && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.3 }}
                                >
                                    <Card className='p-6 bg-card/50 backdrop-blur-sm border-primary/30'>
                                        <div className='flex items-center justify-between mb-4'>
                                            <div className='flex items-center gap-2'>
                                                <FileText className='w-5 h-5 text-primary' />
                                                <h3 className='text-lg font-bold font-mono uppercase tracking-wide'>
                                                    Invoice
                                                </h3>
                                            </div>
                                            <Badge
                                                className={`font-mono text-xs ${invoice.isPaid ? 'bg-green-500/10 text-green-600 border-green-500/30' : 'bg-amber-500/10 text-amber-600 border-amber-500/30'}`}
                                            >
                                                {invoice.isPaid
                                                    ? 'PAID'
                                                    : 'PENDING'}
                                            </Badge>
                                        </div>

                                        <div className='space-y-3 mb-4'>
                                            <div className='flex justify-between text-sm font-mono'>
                                                <span className='text-muted-foreground'>
                                                    Invoice Number
                                                </span>
                                                <span className='font-bold'>
                                                    {invoice.invoiceNumber}
                                                </span>
                                            </div>
                                            <div className='flex justify-between text-sm font-mono'>
                                                <span className='text-muted-foreground'>
                                                    Date
                                                </span>
                                                <span className='font-bold'>
                                                    {new Date(
                                                        invoice.invoiceGeneratedAt
                                                    ).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <Separator />
                                            <div className='flex justify-between items-baseline'>
                                                <span className='text-sm text-muted-foreground font-mono'>
                                                    Total Amount
                                                </span>
                                                <span className='text-2xl font-bold font-mono text-primary'>
                                                    AED{' '}
                                                    {parseFloat(
                                                        invoice.finalTotalPrice
                                                    ).toFixed(2)}
                                                </span>
                                            </div>
                                        </div>

                                        <Button
                                            onClick={handleDownloadInvoice}
                                            disabled={downloadInvoice.isPending}
                                            className='w-full font-mono gap-2'
                                        >
                                            <Download className='w-4 h-4' />
                                            {downloadInvoice.isPending
                                                ? 'Downloading...'
                                                : 'Download Invoice'}
                                        </Button>
                                    </Card>
                                </motion.div>
                            )}

                            {/* Delivery Tracking Section */}
                            {showDeliveryTracking && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.35 }}
                                >
                                    <Card className='p-6 bg-card/50 backdrop-blur-sm border-border/40'>
                                        <div className='flex items-center gap-2 mb-6'>
                                            <Truck className='w-5 h-5 text-primary' />
                                            <h3 className='text-lg font-bold font-mono uppercase tracking-wide'>
                                                Delivery Status
                                            </h3>
                                        </div>

                                        {/* Delivery Timeline */}
                                        <div className='space-y-4'>
                                            {/* Confirmed */}
                                            <div className='flex items-start gap-4'>
                                                <div
                                                    className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isClosed ||
                                                        isAwaitingReturn ||
                                                        isInUse ||
                                                        isDelivered ||
                                                        isInTransit ||
                                                        isReadyForDelivery ||
                                                        isInPreparation ||
                                                        isConfirmed
                                                        ? 'bg-green-500 text-white'
                                                        : 'bg-muted text-muted-foreground'
                                                        }`}
                                                >
                                                    <CheckCircle2 className='w-5 h-5' />
                                                </div>
                                                <div className='flex-1'>
                                                    <p className='font-semibold'>
                                                        Order Confirmed
                                                    </p>
                                                    <p className='text-xs text-muted-foreground'>
                                                        Items reserved for your
                                                        event
                                                    </p>
                                                </div>
                                            </div>

                                            {/* In Preparation */}
                                            <div className='flex items-start gap-4'>
                                                <div
                                                    className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isClosed ||
                                                        isAwaitingReturn ||
                                                        isInUse ||
                                                        isDelivered ||
                                                        isInTransit ||
                                                        isReadyForDelivery ||
                                                        isInPreparation
                                                        ? 'bg-green-500 text-white'
                                                        : isConfirmed
                                                            ? 'bg-primary text-white animate-pulse'
                                                            : 'bg-muted text-muted-foreground'
                                                        }`}
                                                >
                                                    <BoxIcon className='w-5 h-5' />
                                                </div>
                                                <div className='flex-1'>
                                                    <p className='font-semibold'>
                                                        Preparing Items
                                                    </p>
                                                    <p className='text-xs text-muted-foreground'>
                                                        Gathering from warehouse
                                                    </p>
                                                </div>
                                            </div>

                                            {/* In Transit */}
                                            <div className='flex items-start gap-4'>
                                                <div
                                                    className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isClosed ||
                                                        isAwaitingReturn ||
                                                        isInUse ||
                                                        isDelivered ||
                                                        isInTransit
                                                        ? 'bg-green-500 text-white'
                                                        : isReadyForDelivery
                                                            ? 'bg-primary text-white animate-pulse'
                                                            : 'bg-muted text-muted-foreground'
                                                        }`}
                                                >
                                                    <Truck className='w-5 h-5' />
                                                </div>
                                                <div className='flex-1'>
                                                    <p className='font-semibold'>
                                                        In Transit
                                                    </p>
                                                    <p className='text-xs text-muted-foreground'>
                                                        On the way to venue
                                                    </p>
                                                    {order.delivery_window?.start &&
                                                        (isInTransit ||
                                                            isReadyForDelivery) && (
                                                            <p className='text-xs font-mono text-primary mt-1'>
                                                                ETA:{' '}
                                                                {new Date(
                                                                    order.delivery_window?.start
                                                                ).toLocaleDateString()}{' '}
                                                                {new Date(
                                                                    order.delivery_window?.start
                                                                ).toLocaleTimeString(
                                                                    [],
                                                                    {
                                                                        hour: '2-digit',
                                                                        minute: '2-digit',
                                                                    }
                                                                )}
                                                            </p>
                                                        )}
                                                </div>
                                            </div>

                                            {/* Delivered */}
                                            <div className='flex items-start gap-4'>
                                                <div
                                                    className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isClosed ||
                                                        isAwaitingReturn ||
                                                        isInUse ||
                                                        isDelivered
                                                        ? 'bg-green-500 text-white'
                                                        : isInTransit
                                                            ? 'bg-primary text-white animate-pulse'
                                                            : 'bg-muted text-muted-foreground'
                                                        }`}
                                                >
                                                    <CheckCircle2 className='w-5 h-5' />
                                                </div>
                                                <div className='flex-1'>
                                                    <p className='font-semibold'>
                                                        Delivered
                                                    </p>
                                                    <p className='text-xs text-muted-foreground'>
                                                        Items at venue
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Event Complete / Awaiting Return */}
                                            <div className='flex items-start gap-4'>
                                                <div
                                                    className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isClosed ||
                                                        isAwaitingReturn
                                                        ? 'bg-green-500 text-white'
                                                        : isInUse
                                                            ? 'bg-primary text-white animate-pulse'
                                                            : 'bg-muted text-muted-foreground'
                                                        }`}
                                                >
                                                    <Clock className='w-5 h-5' />
                                                </div>
                                                <div className='flex-1'>
                                                    <p className='font-semibold'>
                                                        Awaiting Pickup
                                                    </p>
                                                    <p className='text-xs text-muted-foreground'>
                                                        Items ready for return
                                                    </p>
                                                    {order.pickup_window?.start &&
                                                        (isAwaitingReturn ||
                                                            isInUse) && (
                                                            <p className='text-xs font-mono text-primary mt-1'>
                                                                Pickup:{' '}
                                                                {new Date(
                                                                    order.pickup_window?.start
                                                                ).toLocaleDateString()}{' '}
                                                                {new Date(
                                                                    order.pickup_window?.start
                                                                ).toLocaleTimeString(
                                                                    [],
                                                                    {
                                                                        hour: '2-digit',
                                                                        minute: '2-digit',
                                                                    }
                                                                )}
                                                            </p>
                                                        )}
                                                </div>
                                            </div>

                                            {/* Completed */}
                                            <div className='flex items-start gap-4'>
                                                <div
                                                    className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isClosed
                                                        ? 'bg-green-500 text-white'
                                                        : isAwaitingReturn
                                                            ? 'bg-primary text-white animate-pulse'
                                                            : 'bg-muted text-muted-foreground'
                                                        }`}
                                                >
                                                    <Archive className='w-5 h-5' />
                                                </div>
                                                <div className='flex-1'>
                                                    <p className='font-semibold'>
                                                        Order Complete
                                                    </p>
                                                    <p className='text-xs text-muted-foreground'>
                                                        All items returned
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                </motion.div>
                            )}

                            {/* Cargo Manifest */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 }}
                            >
                                <Card className='p-6 bg-card/50 backdrop-blur-sm border-border/40'>
                                    <div className='flex items-center gap-2 mb-6'>
                                        <Package className='w-5 h-5 text-primary' />
                                        <h3 className='text-lg font-bold font-mono uppercase tracking-wide'>
                                            Items
                                        </h3>
                                        <Badge
                                            variant='secondary'
                                            className='ml-auto font-mono text-xs'
                                        >
                                            {order.items.length}{' '}
                                            {order.items.length === 1
                                                ? 'item'
                                                : 'items'}
                                        </Badge>
                                    </div>

                                    <div className='space-y-3'>
                                        {order.items.map((item, index) => (
                                            <div
                                                key={item.id}
                                                className='p-4 border border-border/40 rounded-lg bg-background/50 hover:border-primary/20 transition-colors'
                                            >
                                                <div className='flex items-start gap-4'>
                                                    <div className='text-xl font-bold font-mono text-muted-foreground w-8 shrink-0'>
                                                        {String(
                                                            index + 1
                                                        ).padStart(2, '0')}
                                                    </div>
                                                    <div className='flex-1 min-w-0'>
                                                        <div className='font-semibold mb-2'>
                                                            {item.order_item.asset_name}
                                                        </div>

                                                        {/* Compact dimensions */}
                                                        <div className='grid grid-cols-5 gap-2 mb-2'>
                                                            {item.asset
                                                                ?.dimension_length && (
                                                                    <div className='text-center p-1.5 bg-muted/50 rounded border border-border/30'>
                                                                        <div className='text-[9px] text-muted-foreground font-mono uppercase'>
                                                                            L
                                                                        </div>
                                                                        <div className='text-xs font-bold font-mono'>
                                                                            {Number(
                                                                                order.calculated_totals?.volume || 0
                                                                            ).toFixed(2)}
                                                                        </div>
                                                                        <div className='text-[8px] text-muted-foreground'>
                                                                            cm
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            {item.asset
                                                                ?.dimension_width && (
                                                                    <div className='text-center p-1.5 bg-muted/50 rounded border border-border/30'>
                                                                        <div className='text-[9px] text-muted-foreground font-mono uppercase'>
                                                                            W
                                                                        </div>
                                                                        <div className='text-xs font-bold font-mono'>
                                                                            {Number(
                                                                                item
                                                                                    .asset
                                                                                    .dimension_width
                                                                            ).toFixed(
                                                                                0
                                                                            )}
                                                                        </div>
                                                                        <div className='text-[8px] text-muted-foreground'>
                                                                            cm
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            {item.asset
                                                                ?.dimension_height && (
                                                                    <div className='text-center p-1.5 bg-muted/50 rounded border border-border/30'>
                                                                        <div className='text-[9px] text-muted-foreground font-mono uppercase'>
                                                                            H
                                                                        </div>
                                                                        <div className='text-xs font-bold font-mono'>
                                                                            {Number(
                                                                                order.calculated_totals?.weight || 0
                                                                            ).toFixed(1)}
                                                                        </div>
                                                                        <div className='text-[8px] text-muted-foreground'>
                                                                            cm
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            <div className='text-center p-1.5 bg-primary/10 rounded border border-primary/20'>
                                                                <div className='text-[9px] text-muted-foreground font-mono uppercase'>
                                                                    WT
                                                                </div>
                                                                <div className='text-xs font-bold font-mono text-primary'>
                                                                    {Number(
                                                                        item.order_item.weight_per_unit || 0
                                                                    ).toFixed(
                                                                        1
                                                                    )}
                                                                </div>
                                                                <div className='text-[8px] text-primary/70'>
                                                                    kg
                                                                </div>
                                                            </div>
                                                            <div className='text-center p-1.5 bg-secondary/10 rounded border border-secondary/20'>
                                                                <div className='text-[9px] text-muted-foreground font-mono uppercase'>
                                                                    VOL
                                                                </div>
                                                                <div className='text-xs font-bold font-mono'>
                                                                    {Number(
                                                                        item.order_item.volume_per_unit || 0
                                                                    ).toFixed(
                                                                        2
                                                                    )}
                                                                </div>
                                                                <div className='text-[8px] text-muted-foreground/70'>
                                                                    m³
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Quantity line */}
                                                        <div className='flex items-center gap-3 text-xs font-mono text-muted-foreground'>
                                                            <span>
                                                                Qty:{' '}
                                                                <span className='font-bold text-foreground'>
                                                                    {item.order_item.quantity}
                                                                </span>
                                                            </span>
                                                            <span>•</span>
                                                            <span>
                                                                Total:{' '}
                                                                <span className='font-bold'>
                                                                    {Number(item.order_item.total_volume).toFixed(2)}{' '}
                                                                    m³
                                                                </span>
                                                            </span>
                                                            <span>•</span>
                                                            <span>
                                                                <span className='font-bold text-primary'>
                                                                    {Number(item.order_item.total_weight).toFixed(1)}{' '}
                                                                    kg
                                                                </span>
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <Separator className='my-4' />

                                    {/* Totals */}
                                    <div className='grid grid-cols-3 gap-3'>
                                        <div className='text-center p-3 bg-muted/30 rounded-lg border border-border/40'>
                                            <p className='text-[10px] font-mono text-muted-foreground uppercase tracking-wide mb-1'>
                                                Total Volume
                                            </p>
                                            <p className='text-xl font-bold font-mono text-primary'>
                                                {Number(order.calculated_totals?.volume || 0).toFixed(2)}{' '}
                                                m³
                                            </p>
                                        </div>
                                        <div className='text-center p-3 bg-muted/30 rounded-lg border border-border/40'>
                                            <p className='text-[10px] font-mono text-muted-foreground uppercase tracking-wide mb-1'>
                                                Total Weight
                                            </p>
                                            <p className='text-xl font-bold font-mono'>
                                                {Number(order.calculated_totals?.weight || 0).toFixed(1)}{' '}
                                                kg
                                            </p>
                                        </div>
                                        <div className='text-center p-3 bg-muted/30 rounded-lg border border-border/40'>
                                            <p className='text-[10px] font-mono text-muted-foreground uppercase tracking-wide mb-1'>
                                                Items
                                            </p>
                                            <p className='text-xl font-bold font-mono'>
                                                {order.items.length}
                                            </p>
                                        </div>
                                    </div>
                                </Card>
                            </motion.div>

                            {/* What's Next Section - State-specific guidance */}
                            {(isSubmitted ||
                                isPricingReview ||
                                isPendingApproval) && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.5 }}
                                    >
                                        <Card className='p-6 bg-secondary/5 border-secondary/20'>
                                            <h3 className='font-bold font-mono mb-4 uppercase tracking-wide text-sm'>
                                                What's Next
                                            </h3>
                                            <div className='space-y-3 text-sm'>
                                                <div className='flex gap-3'>
                                                    <div className='w-6 h-6 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center shrink-0 text-xs font-bold'>
                                                        1
                                                    </div>
                                                    <div>
                                                        <p className='font-semibold mb-1'>
                                                            Order Review
                                                        </p>
                                                        <p className='text-xs text-muted-foreground'>
                                                            Our team reviews your
                                                            requirements and
                                                            calculates logistics
                                                            pricing.
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className='flex gap-3'>
                                                    <div className='w-6 h-6 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center shrink-0 text-xs font-bold'>
                                                        2
                                                    </div>
                                                    <div>
                                                        <p className='font-semibold mb-1'>
                                                            Receive Quote
                                                        </p>
                                                        <p className='text-xs text-muted-foreground'>
                                                            Quote sent via email.
                                                            Return here to approve
                                                            or decline.
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className='flex gap-3'>
                                                    <div className='w-6 h-6 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center shrink-0 text-xs font-bold'>
                                                        3
                                                    </div>
                                                    <div>
                                                        <p className='font-semibold mb-1'>
                                                            Invoice & Fulfillment
                                                        </p>
                                                        <p className='text-xs text-muted-foreground'>
                                                            After approval, receive
                                                            invoice and we begin
                                                            fulfillment.
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </Card>
                                    </motion.div>
                                )}

                            {isApproved && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.5 }}
                                >
                                    <Card className='p-6 bg-green-500/5 border-green-500/20'>
                                        <h3 className='font-bold font-mono mb-3 uppercase tracking-wide text-sm flex items-center gap-2'>
                                            <Loader className='w-4 h-4 animate-spin' />
                                            What's Next
                                        </h3>
                                        <p className='text-sm text-muted-foreground'>
                                            Your invoice is being generated and
                                            will be emailed to you shortly. Once
                                            received, please process payment to
                                            proceed with fulfillment.
                                        </p>
                                    </Card>
                                </motion.div>
                            )}

                            {isInvoiced && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.5 }}
                                >
                                    <Card className='p-6 bg-amber-500/5 border-amber-500/20'>
                                        <h3 className='font-bold font-mono mb-3 uppercase tracking-wide text-sm flex items-center gap-2'>
                                            <AlertCircle className='w-4 h-4' />
                                            Action Required
                                        </h3>
                                        <p className='text-sm text-muted-foreground'>
                                            Please process payment for the
                                            invoice above. Once payment is
                                            confirmed, we will schedule delivery
                                            and begin fulfillment.
                                        </p>
                                    </Card>
                                </motion.div>
                            )}

                            {isPaid && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.5 }}
                                >
                                    <Card className='p-6 bg-green-500/5 border-green-500/20'>
                                        <h3 className='font-bold font-mono mb-3 uppercase tracking-wide text-sm flex items-center gap-2'>
                                            <CheckCircle2 className='w-4 h-4' />
                                            What's Next
                                        </h3>
                                        <p className='text-sm text-muted-foreground'>
                                            Payment confirmed! Our operations
                                            team is coordinating delivery
                                            schedules. You will receive delivery
                                            window details shortly.
                                        </p>
                                    </Card>
                                </motion.div>
                            )}

                            {(isConfirmed || isInPreparation) && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.5 }}
                                >
                                    <Card className='p-6 bg-cyan-500/5 border-cyan-500/20'>
                                        <h3 className='font-bold font-mono mb-3 uppercase tracking-wide text-sm flex items-center gap-2'>
                                            <BoxIcon className='w-4 h-4' />
                                            What's Next
                                        </h3>
                                        <p className='text-sm text-muted-foreground'>
                                            Your items are being prepared. Once
                                            all items are ready, they will be
                                            dispatched to your venue according
                                            to the delivery schedule.
                                        </p>
                                    </Card>
                                </motion.div>
                            )}

                            {isReadyForDelivery && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.5 }}
                                >
                                    <Card className='p-6 bg-sky-500/5 border-sky-500/20'>
                                        <h3 className='font-bold font-mono mb-3 uppercase tracking-wide text-sm flex items-center gap-2'>
                                            <Package className='w-4 h-4' />
                                            What's Next
                                        </h3>
                                        <p className='text-sm text-muted-foreground'>
                                            All items are packed and ready!
                                            Delivery will begin shortly. Please
                                            ensure someone is available to
                                            receive items during the scheduled
                                            window.
                                        </p>
                                    </Card>
                                </motion.div>
                            )}

                            {isDelivered && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.5 }}
                                >
                                    <Card className='p-6 bg-fuchsia-500/5 border-fuchsia-500/20'>
                                        <h3 className='font-bold font-mono mb-3 uppercase tracking-wide text-sm flex items-center gap-2'>
                                            <PartyPopper className='w-4 h-4' />
                                            What's Next
                                        </h3>
                                        <p className='text-sm text-muted-foreground'>
                                            Items delivered! Enjoy your event.
                                            After the event, please prepare
                                            items for return during the
                                            scheduled pickup window.
                                        </p>
                                    </Card>
                                </motion.div>
                            )}

                            {isAwaitingReturn && order.pickup_window?.start && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.5 }}
                                >
                                    <Card className='p-6 bg-rose-500/5 border-rose-500/20'>
                                        <h3 className='font-bold font-mono mb-3 uppercase tracking-wide text-sm flex items-center gap-2'>
                                            <Clock className='w-4 h-4' />
                                            Pickup Reminder
                                        </h3>
                                        <p className='text-sm text-muted-foreground mb-3'>
                                            Please ensure all items are ready
                                            for pickup on{' '}
                                            <strong>
                                                {new Date(
                                                    order.pickup_window.start
                                                ).toLocaleDateString()}
                                            </strong>{' '}
                                            at{' '}
                                            <strong>
                                                {new Date(
                                                    order.pickup_window.start
                                                ).toLocaleTimeString([], {
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                })}
                                            </strong>
                                            .
                                        </p>
                                        <p className='text-xs text-muted-foreground'>
                                            Our team will inspect items upon
                                            return and update their condition
                                            status.
                                        </p>
                                    </Card>
                                </motion.div>
                            )}

                            {isClosed && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.5 }}
                                >
                                    <Card className='p-6 bg-slate-500/5 border-slate-500/20'>
                                        <h3 className='font-bold font-mono mb-3 uppercase tracking-wide text-sm flex items-center gap-2'>
                                            <CheckCircle2 className='w-4 h-4' />
                                            Thank You!
                                        </h3>
                                        <p className='text-sm text-muted-foreground mb-3'>
                                            All items have been returned and
                                            inspected. Your order is now
                                            complete.
                                        </p>
                                        <Button
                                            onClick={() =>
                                                router.push('/catalog')
                                            }
                                            variant='outline'
                                            className='font-mono gap-2'
                                        >
                                            <Package className='w-4 h-4' />
                                            Browse Catalog for Next Event
                                        </Button>
                                    </Card>
                                </motion.div>
                            )}
                        </div>

                        {/* Sidebar */}
                        <div className='space-y-6'>
                            {/* Event Details */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                            >
                                <Card className='p-6 bg-card/50 backdrop-blur-sm border-border/40'>
                                    <div className='flex items-center gap-2 mb-4'>
                                        <Calendar className='w-4 h-4 text-primary' />
                                        <h4 className='font-bold font-mono text-sm uppercase tracking-wide'>
                                            Event
                                        </h4>
                                    </div>
                                    <div className='space-y-3 text-sm'>
                                        <div>
                                            <p className='text-xs text-muted-foreground font-mono uppercase'>
                                                Start
                                            </p>
                                            <p className='font-mono font-semibold'>
                                                {order.event_start_date
                                                    ? new Date(
                                                        order.event_start_date
                                                    ).toLocaleDateString()
                                                    : 'N/A'}
                                            </p>
                                        </div>
                                        <div>
                                            <p className='text-xs text-muted-foreground font-mono uppercase'>
                                                End
                                            </p>
                                            <p className='font-mono font-semibold'>
                                                {order.event_end_date
                                                    ? new Date(
                                                        order.event_end_date
                                                    ).toLocaleDateString()
                                                    : 'N/A'}
                                            </p>
                                        </div>
                                    </div>
                                </Card>
                            </motion.div>

                            {/* Venue */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 }}
                            >
                                <Card className='p-6 bg-card/50 backdrop-blur-sm border-border/40'>
                                    <div className='flex items-center gap-2 mb-4'>
                                        <MapPin className='w-4 h-4 text-primary' />
                                        <h4 className='font-bold font-mono text-sm uppercase tracking-wide'>
                                            Venue
                                        </h4>
                                    </div>
                                    <div className='space-y-2 text-sm'>
                                        <p className='font-semibold'>
                                            {order.venue_name}
                                        </p>
                                        <p className='text-muted-foreground'>
                                            {order.venue_location?.city},{' '}
                                            {order.venue_location?.country}
                                        </p>
                                        <p className='text-xs text-muted-foreground leading-relaxed'>
                                            {order.venue_location?.address}
                                        </p>
                                    </div>
                                </Card>
                            </motion.div>

                            {/* Contact */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5 }}
                            >
                                <Card className='p-6 bg-card/50 backdrop-blur-sm border-border/40'>
                                    <div className='flex items-center gap-2 mb-4'>
                                        <User className='w-4 h-4 text-primary' />
                                        <h4 className='font-bold font-mono text-sm uppercase tracking-wide'>
                                            Contact
                                        </h4>
                                    </div>
                                    <div className='space-y-2 text-sm'>
                                        <div>
                                            <p className='text-xs text-muted-foreground font-mono uppercase'>
                                                Name
                                            </p>
                                            <p className='font-mono font-semibold'>
                                                {order.contact_name}
                                            </p>
                                        </div>
                                        <div>
                                            <p className='text-xs text-muted-foreground font-mono uppercase'>
                                                Email
                                            </p>
                                            <p className='font-mono font-semibold text-xs'>
                                                {order.contact_email}
                                            </p>
                                        </div>
                                        <div>
                                            <p className='text-xs text-muted-foreground font-mono uppercase'>
                                                Phone
                                            </p>
                                            <p className='font-mono font-semibold'>
                                                {order.contact_phone}
                                            </p>
                                        </div>
                                    </div>
                                </Card>
                            </motion.div>

                            {/* Special Instructions */}
                            {order.special_instructions && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.6 }}
                                >
                                    <Card className='p-6 bg-card/50 backdrop-blur-sm border-border/40'>
                                        <div className='flex items-center gap-2 mb-4'>
                                            <FileText className='w-4 h-4 text-primary' />
                                            <h4 className='font-bold font-mono text-sm uppercase tracking-wide'>
                                                Instructions
                                            </h4>
                                        </div>
                                        <p className='text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap'>
                                            {order.special_instructions}
                                        </p>
                                    </Card>
                                </motion.div>
                            )}
                        </div>
                    </div>

                    {/* Actions */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.7 }}
                        className='mt-8 flex gap-3'
                    >
                        <Button
                            variant='outline'
                            onClick={() => router.push('/my-orders')}
                            className='font-mono gap-2'
                        >
                            <ArrowLeft className='w-4 h-4' />
                            All Orders
                        </Button>
                        <Button
                            variant='outline'
                            onClick={() => router.push('/catalog')}
                            className='font-mono gap-2'
                        >
                            <Package className='w-4 h-4' />
                            Browse Catalog
                        </Button>
                    </motion.div>
                </div>

                {/* Approve Dialog */}
                <Dialog
                    open={approveDialogOpen}
                    onOpenChange={setApproveDialogOpen}
                >
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Approve Quote</DialogTitle>
                        </DialogHeader>
                        <div className='space-y-4'>
                            <p className='text-sm text-muted-foreground'>
                                Approved quote for order{' '}
                                <span className='font-mono font-semibold'>
                                    {order.order_id}
                                </span>
                                . This proceeds to invoicing and fulfillment.
                            </p>
                            <div className='border border-border rounded-md p-4 bg-muted/50'>
                                <div className='flex justify-between font-bold text-lg font-mono'>
                                    <span>Total Amount</span>
                                    <span>
                                        AED{' '}
                                        {order.final_pricing?.total_price
                                            ? parseFloat(
                                                order.final_pricing.total_price
                                            ).toFixed(2)
                                            : 'N/A'}
                                    </span>
                                </div>
                            </div>
                            <div>
                                <Label htmlFor='notes'>Notes (Optional)</Label>
                                <Textarea
                                    id='notes'
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                    placeholder='Add any notes...'
                                    rows={3}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button
                                variant='outline'
                                onClick={() => setApproveDialogOpen(false)}
                                disabled={approveQuote.isPending}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleApprove}
                                disabled={approveQuote.isPending}
                            >
                                {approveQuote.isPending
                                    ? 'Approving...'
                                    : 'Approve Quote'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Decline Dialog */}
                <Dialog
                    open={declineDialogOpen}
                    onOpenChange={setDeclineDialogOpen}
                >
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Decline Quote</DialogTitle>
                        </DialogHeader>
                        <div className='space-y-4'>
                            <p className='text-sm text-muted-foreground'>
                                Decline quote for order{' '}
                                <span className='font-mono font-semibold'>
                                    {order.order_id}
                                </span>
                                . Please provide a reason so we can better serve
                                you.
                            </p>
                            <div>
                                <Label htmlFor='declineReason'>
                                    Reason for Declining{' '}
                                    <span className='text-destructive'>*</span>
                                </Label>
                                <Textarea
                                    id='declineReason'
                                    value={declineReason}
                                    onChange={e =>
                                        setDeclineReason(e.target.value)
                                    }
                                    placeholder='e.g., Budget constraints, timeline changed...'
                                    rows={4}
                                />
                                <p className='text-xs text-muted-foreground mt-1'>
                                    Minimum 10 characters required
                                </p>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button
                                variant='outline'
                                onClick={() => setDeclineDialogOpen(false)}
                                disabled={declineQuote.isPending}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant='destructive'
                                onClick={handleDecline}
                                disabled={declineQuote.isPending}
                            >
                                {declineQuote.isPending
                                    ? 'Declining...'
                                    : 'Decline Quote'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </ClientNav>
    )
}

