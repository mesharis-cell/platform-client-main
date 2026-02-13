import { OrderPricing } from "@/types/hybrid-pricing";

const roundCurrency = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

const applyMargin = (baseValue: number, marginPercent: number) =>
    roundCurrency(baseValue * (1 + marginPercent / 100));

export const getOrderPrice = (
    orderPricing: Partial<OrderPricing> | null | undefined,
    overrideMarginPercent?: number
) => {
    const marginPercent = Number(overrideMarginPercent ?? orderPricing?.margin?.percent ?? 0);
    const baseBase = Number(orderPricing?.base_ops_total ?? 0);
    const transportBase = Number(orderPricing?.transport?.final_rate ?? 0);
    const catalogBase = Number(orderPricing?.line_items?.catalog_total ?? 0);
    const customBase = Number(orderPricing?.line_items?.custom_total ?? 0);

    const basePrice = applyMargin(baseBase, marginPercent);
    const transportPrice = applyMargin(transportBase, marginPercent);
    const catalogPrice = applyMargin(catalogBase, marginPercent);
    const customPrice = applyMargin(customBase, marginPercent);
    const servicePrice = roundCurrency(catalogPrice + customPrice);
    const baseSubtotal = roundCurrency(baseBase + transportBase + catalogBase + customBase);
    const total = roundCurrency(basePrice + transportPrice + servicePrice);
    const marginAmount = roundCurrency(total - baseSubtotal);

    return {
        marginPercent,
        marginAmount,
        basePrice,
        transportPrice,
        catalogPrice,
        customPrice,
        servicePrice,
        total,
    };
};
