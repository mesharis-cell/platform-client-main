/**
 * Order Helper Functions (Client)
 * Utility functions for client order operations
 */

import type { OrderStatus, FinancialStatus } from '@/types/order'

/**
 * Check if order can be modified
 */
export function canModifyOrder(status: OrderStatus): boolean {
  return status === 'DRAFT'
}

/**
 * Check if quote can be accepted
 */
export function canAcceptQuote(status: OrderStatus): boolean {
  return status === 'QUOTED'
}

/**
 * Check if quote can be declined
 */
export function canDeclineQuote(status: OrderStatus): boolean {
  return status === 'QUOTED'
}

/**
 * Get status display text
 */
export function getStatusDisplayText(status: OrderStatus): string {
  const map: Record<OrderStatus, string> = {
    DRAFT: 'Draft',
    SUBMITTED: 'Submitted',
    PRICING_REVIEW: 'Under Review',
    PENDING_APPROVAL: 'Pending Approval',
    QUOTED: 'Quote Ready',
    DECLINED: 'Quote Declined',
    CONFIRMED: 'Confirmed',
    AWAITING_FABRICATION: 'Awaiting Fabrication',
    IN_PREPARATION: 'In Preparation',
    READY_FOR_DELIVERY: 'Ready for Delivery',
    IN_TRANSIT: 'In Transit',
    DELIVERED: 'Delivered',
    IN_USE: 'In Use',
    AWAITING_RETURN: 'Awaiting Return',
    CLOSED: 'Completed',
    CANCELLED: 'Cancelled',
  }
  return map[status] || status
}

/**
 * Get financial status display text
 */
export function getFinancialStatusText(status: FinancialStatus): string {
  const map: Record<FinancialStatus, string> = {
    PENDING_QUOTE: 'Pending Quote',
    QUOTE_SENT: 'Quote Sent',
    QUOTE_ACCEPTED: 'Quote Accepted',
    PENDING_INVOICE: 'Pending Invoice',
    INVOICED: 'Invoiced',
    PAID: 'Paid',
    CANCELLED: 'Cancelled',
  }
  return map[status] || status
}

/**
 * Check if order is in a terminal state
 */
export function isTerminalStatus(status: OrderStatus): boolean {
  return ['CLOSED', 'DECLINED', 'CANCELLED'].includes(status)
}

/**
 * Check if order is active (can be tracked)
 */
export function isActiveOrder(status: OrderStatus): boolean {
  return !isTerminalStatus(status)
}

/**
 * Get status progress percentage (rough estimate)
 */
export function getStatusProgress(status: OrderStatus): number {
  const progress: Record<string, number> = {
    DRAFT: 0,
    SUBMITTED: 5,
    PRICING_REVIEW: 10,
    PENDING_APPROVAL: 15,
    QUOTED: 20,
    CONFIRMED: 30,
    AWAITING_FABRICATION: 35,
    IN_PREPARATION: 40,
    READY_FOR_DELIVERY: 50,
    IN_TRANSIT: 60,
    DELIVERED: 70,
    IN_USE: 80,
    AWAITING_RETURN: 85,
    CLOSED: 100,
    DECLINED: 0,
    CANCELLED: 0,
  }
  return progress[status] || 0
}
