/**
 * Cart Helper Functions
 * Helper functions for cart management with rebrand support
 */

export interface CartItem {
  assetId: string
  assetName: string
  quantity: number
  volumePerUnit: number
  // Rebrand fields
  isReskinRequest?: boolean
  reskinTargetBrandId?: string
  reskinTargetBrandCustom?: string
  reskinNotes?: string
}

export interface CartState {
  items: CartItem[]
  tripType: 'ONE_WAY' | 'ROUND_TRIP'
}

/**
 * Add item to cart with optional rebrand
 */
export function addToCart(
  currentCart: CartItem[],
  asset: { id: string; name: string; volumePerUnit: number },
  quantity: number,
  rebrandData?: {
    isReskinRequest: boolean
    reskinTargetBrandId?: string
    reskinTargetBrandCustom?: string
    reskinNotes?: string
  }
): CartItem[] {
  const newItem: CartItem = {
    assetId: asset.id,
    assetName: asset.name,
    quantity,
    volumePerUnit: asset.volumePerUnit,
    ...rebrandData,
  }

  return [...currentCart, newItem]
}

/**
 * Update rebrand data for cart item
 */
export function updateItemRebrand(
  currentCart: CartItem[],
  assetId: string,
  rebrandData: {
    isReskinRequest: boolean
    reskinTargetBrandId?: string
    reskinTargetBrandCustom?: string
    reskinNotes?: string
  }
): CartItem[] {
  return currentCart.map((item) =>
    item.assetId === assetId ? { ...item, ...rebrandData } : item
  )
}

/**
 * Remove rebrand request from cart item
 */
export function removeItemRebrand(currentCart: CartItem[], assetId: string): CartItem[] {
  return currentCart.map((item) =>
    item.assetId === assetId
      ? {
          ...item,
          isReskinRequest: false,
          reskinTargetBrandId: undefined,
          reskinTargetBrandCustom: undefined,
          reskinNotes: undefined,
        }
      : item
  )
}

/**
 * Calculate total volume
 */
export function calculateTotalVolume(cart: CartItem[]): number {
  return cart.reduce((sum, item) => sum + item.volumePerUnit * item.quantity, 0)
}

/**
 * Check if cart has any rebrand requests
 */
export function hasRebrandRequests(cart: CartItem[]): boolean {
  return cart.some((item) => item.isReskinRequest)
}
