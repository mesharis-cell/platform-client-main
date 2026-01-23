'use client'

/**
 * Cart Item Display with Rebrand Support
 * Shows cart items with optional rebrand badge
 */

import { Button } from '@/components/ui/button'
import { RebrandItemBadge } from '@/components/rebrand/RebrandItemBadge'
import { X, Minus, Plus } from 'lucide-react'

interface CartItemWithRebrandProps {
  item: {
    assetId: string
    assetName: string
    quantity: number
    volumePerUnit: number
    isReskinRequest?: boolean
    reskinTargetBrandId?: string
    reskinTargetBrandCustom?: string
    reskinNotes?: string
  }
  targetBrandName?: string
  onQuantityChange: (assetId: string, newQuantity: number) => void
  onRemove: (assetId: string) => void
  onEditRebrand?: (assetId: string) => void
  onRemoveRebrand?: (assetId: string) => void
}

export function CartItemWithRebrand({
  item,
  targetBrandName,
  onQuantityChange,
  onRemove,
  onEditRebrand,
  onRemoveRebrand,
}: CartItemWithRebrandProps) {
  return (
    <div className="border border-border rounded-lg p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h4 className="font-semibold">{item.assetName}</h4>
          <p className="text-sm text-muted-foreground">
            Volume: {item.volumePerUnit} m³ per unit × {item.quantity} = {(item.volumePerUnit * item.quantity).toFixed(1)} m³
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => onRemove(item.assetId)}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onQuantityChange(item.assetId, Math.max(1, item.quantity - 1))}
        >
          <Minus className="h-4 w-4" />
        </Button>
        <span className="w-12 text-center">{item.quantity}</span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onQuantityChange(item.assetId, item.quantity + 1)}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {item.isReskinRequest && (
        <RebrandItemBadge
          targetBrandName={targetBrandName || item.reskinTargetBrandCustom || 'Unknown Brand'}
          clientNotes={item.reskinNotes || ''}
          showActions={true}
          onEdit={onEditRebrand ? () => onEditRebrand(item.assetId) : undefined}
          onRemove={onRemoveRebrand ? () => onRemoveRebrand(item.assetId) : undefined}
        />
      )}
    </div>
  )
}
