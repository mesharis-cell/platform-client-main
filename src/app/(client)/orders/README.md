# Client Orders - Integration Guide

## Components Ready for Integration

### ✅ QuoteReviewSection
**When**: order.status === 'QUOTED'

**Usage**:
```typescript
import { QuoteReviewSection } from '@/components/orders/QuoteReviewSection'

<QuoteReviewSection
  orderId={order.id}
  pricing={order.pricing}
  lineItems={order.lineItems}
  hasReskinRequests={order.items?.some(i => i.isReskinRequest)}
  onApprove={async () => {
    await approveQuote(order.id)
  }}
  onDecline={async (reason) => {
    await declineQuote(order.id, reason)
  }}
/>
```

**Includes**:
- Full itemized pricing breakdown
- Quote expiry notice
- Rebrand notification
- Accept/decline dialogs
- Validation

### ✅ OrderStatusBanner
**When**: order.status === 'AWAITING_FABRICATION' or 'CANCELLED'

**Usage**:
```typescript
import { OrderStatusBanner } from '@/components/orders/OrderStatusBanner'

<OrderStatusBanner
  status={order.status}
  cancellationReason={order.cancellationReason}
  cancellationNotes={order.cancellationNotes}
  cancelledAt={order.cancelledAt}
  pendingReskinCount={order.reskinRequests?.filter(r => r.status === 'pending').length}
/>
```

### ✅ PricingBreakdown
**When**: Any order with pricing data

**Usage**:
```typescript
import { PricingBreakdown } from '@/components/orders/PricingBreakdown'

<PricingBreakdown
  pricing={order.pricing}
  lineItems={order.lineItems}
  showTitle={true}
/>
```

## Integration Steps

1. **Import components** into order detail page
2. **Add status-based conditionals** 
3. **Pass order data** as props
4. **Wire approve/decline** actions to existing hooks

All components are self-contained with validation!
