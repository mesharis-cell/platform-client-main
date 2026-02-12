import { OrderPricing } from "@/types/hybrid-pricing";

export const getOrderPrice = (orderPricing: Partial<OrderPricing> | null | undefined) => {
    const marginAmount = orderPricing?.margin?.percent ?? 0;

    const basePrice =
        Number(orderPricing?.base_ops_total ?? 0) +
        Number(orderPricing?.base_ops_total ?? 0) * (marginAmount / 100);
    const transportPrice =
        Number(orderPricing?.transport?.final_rate ?? 0) +
        Number(orderPricing?.transport?.final_rate ?? 0) * (marginAmount / 100);
    const catalogPrice =
        Number(orderPricing?.line_items?.catalog_total ?? 0) +
        Number(orderPricing?.line_items?.catalog_total ?? 0) * (marginAmount / 100);
    const customPrice = Number(orderPricing?.line_items?.custom_total ?? 0);

    const servicePrice = catalogPrice + customPrice;
    const total = basePrice + transportPrice + servicePrice;

    return {
        marginAmount,
        basePrice,
        transportPrice,
        catalogPrice,
        customPrice,
        servicePrice,
        total,
    };
};
