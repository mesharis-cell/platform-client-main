"use client";

/**
 * Invoice domain is intentionally disabled in pre-alpha.
 * Hooks are kept as stubs to preserve import contracts.
 */

import { useMutation, useQuery } from "@tanstack/react-query";
import {
    ConfirmPaymentRequest,
    ConfirmPaymentResponse,
    GenerateInvoiceRequest,
    GenerateInvoiceResponse,
    InvoiceListParams,
    InvoiceListResponse,
    InvoiceMetadata,
    SendInvoiceEmailRequest,
    SendInvoiceEmailResponse,
} from "@/types/order";

const INVOICE_DOMAIN_DISABLED_MESSAGE =
    "Invoice domain is disabled in pre-alpha. Re-enable after invoice redesign.";

const invoiceDomainDisabled = <T>(): T => {
    throw new Error(INVOICE_DOMAIN_DISABLED_MESSAGE);
};

export const invoiceKeys = {
    all: ["invoices"] as const,
    lists: () => [...invoiceKeys.all, "list"] as const,
    list: (params: InvoiceListParams) => [...invoiceKeys.lists(), params] as const,
    details: () => [...invoiceKeys.all, "detail"] as const,
    detail: (orderId: string) => [...invoiceKeys.details(), orderId] as const,
};

export function useInvoice(orderId: string) {
    return useQuery({
        queryKey: invoiceKeys.detail(orderId),
        queryFn: async (): Promise<InvoiceMetadata> => invoiceDomainDisabled<InvoiceMetadata>(),
        enabled: false,
    });
}

export function useInvoices(params: InvoiceListParams = {}) {
    return useQuery({
        queryKey: invoiceKeys.list(params),
        queryFn: async (): Promise<InvoiceListResponse> =>
            invoiceDomainDisabled<InvoiceListResponse>(),
        enabled: false,
    });
}

export function useGenerateInvoice() {
    return useMutation({
        mutationFn: async (_data: GenerateInvoiceRequest): Promise<GenerateInvoiceResponse> =>
            invoiceDomainDisabled<GenerateInvoiceResponse>(),
    });
}

export function useSendInvoiceEmail() {
    return useMutation({
        mutationFn: async (_data: SendInvoiceEmailRequest): Promise<SendInvoiceEmailResponse> =>
            invoiceDomainDisabled<SendInvoiceEmailResponse>(),
    });
}

export function useDownloadInvoice() {
    return useMutation({
        mutationFn: async (_invoiceNumber: string): Promise<{ success: boolean }> =>
            invoiceDomainDisabled<{ success: boolean }>(),
    });
}

export function useConfirmPayment() {
    return useMutation({
        mutationFn: async (_args: {
            orderId: string;
            data: ConfirmPaymentRequest;
        }): Promise<ConfirmPaymentResponse> => invoiceDomainDisabled<ConfirmPaymentResponse>(),
    });
}
