"use client";

/**
 * React Query hooks for client order tracking operations
 * Phase 13: Client Order Tracking Dashboard
 */

import { apiClient } from '@/lib/api/api-client';
import { throwApiError } from '@/lib/utils/throw-api-error';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Types for client order operations
interface ClientOrderListParams {
  status?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  brand?: string;
  page?: number;
  limit?: number;
}

interface ClientOrder {
  id: string;
  orderId: string;
  company: { id: string; name: string };
  brand: { id: string; name: string } | null;
  eventStartDate: string;
  eventEndDate: string;
  venueName: string;
  venueCity: string;
  status: string;
  finalTotalPrice: number;
  createdAt: string;
}

interface ClientOrderDetail {
  id: string;
  order_id: string;
  company: { id: string; name: string };
  brand: { id: string; name: string } | null;
  user: { id: string; name: string; email: string };
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  event_start_date: string;
  event_end_date: string;
  venue_name: string;
  venue_location: {
    city: string;
    address: string;
    country: string;
    access_notes: string | null;
  };
  delivery_window: { start: string; end: string } | null;
  pickup_window: { start: string; end: string } | null;
  delivery_photos: string[];
  special_instructions: string | null;
  calculated_totals: {
    volume: string;
    weight: string;
    total_price?: number;
  };
  final_pricing: { total: number } | null;
  quote_sent_at: string | null;
  invoice_id: string | null;
  invoice_generated_at: string | null;
  invoice_paid_at: string | null;
  invoice_pdf_url?: string | null;
  order_status: string;
  items: {
    order_item: {
      id: string;
      asset_name: string;
      quantity: number;
      volume_per_unit: string;
      weight_per_unit: string;
      total_volume: string;
      total_weight: string;
    };
    asset: {
      id: string;
      name: string;
      condition: string;
      dimension_length?: number;
      dimension_width?: number;
      dimension_height?: number;
    };
  }[];
  order_status_history: any[];
  created_at: string;
  updated_at: string;
  a2_adjusted_price?: boolean;
  a2_adjusted_reason?: string;
  pmg_review_notes?: string;
}

interface CalendarEvent {
  id: string;
  orderId: string;
  title: string;
  eventStartDate: string;
  eventEndDate: string;
  venueName: string;
  venueCity: string;
  status: string;
  brand: { id: string; name: string } | null;
}

interface DashboardSummary {
  summary: {
    activeOrders: number;
    pendingQuotes: number;
    upcomingEvents: number;
    awaitingReturn: number;
  };
  recentOrders: ClientOrder[];
}

/**
 * Hook to fetch client's orders with filtering
 */
export function useClientOrders(params: ClientOrderListParams = {}) {
  return useQuery({
    queryKey: ['client-orders', params],
    queryFn: async () => {
      try {
        const queryParams = new URLSearchParams();
        if (params.status) queryParams.append('order_status', params.status);
        if (params.search) queryParams.append('search_term', params.search);
        if (params.dateFrom) queryParams.append('dateFrom', params.dateFrom);
        if (params.dateTo) queryParams.append('dateTo', params.dateTo);
        if (params.brand) queryParams.append('brand', params.brand);
        if (params.page) queryParams.append('page', params.page.toString());
        if (params.limit) queryParams.append('limit', params.limit.toString());

        const response = await apiClient.get(`/client/v1/order/my?${queryParams.toString()}`);
        return response.data;
    } catch (error) {
      throwApiError(error);
    }
    },
  });
}

/**
 * Hook to fetch single order detail
 */
export function useClientOrderDetail(orderId: string | null) {
  return useQuery({
    queryKey: ['client-order-detail', orderId],
    queryFn: async () => {
      try {
      if (!orderId) return null;
      const response = await apiClient.get(`/client/v1/order/${orderId}`);
      return response.data;
    } catch (error) {
      throwApiError(error);
    }
    },
    enabled: !!orderId,
  });
}

/**
 * Hook to approve a quote
 */
export function useApproveQuote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderId: string) => {
      const response = await fetch(`/api/client/orders/${orderId}/quote/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to approve quote');
      }
      return response.json();
    },
    onSuccess: (data, orderId) => {
      // Invalidate order detail and list queries
      queryClient.invalidateQueries({ queryKey: ['client-order-detail', data?.data?.order_id] });
      queryClient.invalidateQueries({ queryKey: ['client-orders'] });
      queryClient.invalidateQueries({ queryKey: ['client-dashboard-summary'] });
    },
  });
}

/**
 * Hook to decline a quote
 */
export function useDeclineQuote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orderId, reason }: { orderId: string; reason?: string }) => {
      const response = await fetch(`/api/client/orders/${orderId}/quote/decline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to decline quote');
      }
      return response.json();
    },
    onSuccess: (data, { orderId }) => {
      // Invalidate order detail and list queries
      queryClient.invalidateQueries({ queryKey: ['client-order-detail', data?.data?.order_id] });
      queryClient.invalidateQueries({ queryKey: ['client-orders'] });
      queryClient.invalidateQueries({ queryKey: ['client-dashboard-summary'] });
    },
  });
}

/**
 * Hook to fetch calendar events
 */
export function useClientCalendar(params: { month?: string; year?: string } = {}) {
  return useQuery({
    queryKey: ['client-calendar', params],
    queryFn: async () => {
      try {
      const queryParams = new URLSearchParams();
      if (params.month) queryParams.append('month', params.month);
      if (params.year) queryParams.append('year', params.year);

      const response = await apiClient.get(`/client/v1/calendar?${queryParams.toString()}`);
      return response.data;
    } catch (error) {
      throwApiError(error);
    }
    },
  });
}

/**
 * Hook to fetch dashboard summary
 */
export function useClientDashboardSummary() {
  return useQuery({
    queryKey: ['client-dashboard-summary'],
    queryFn: async () => {
      try {
      const response = await apiClient.get('/client/v1/order/dashboard-summary');
      return response.data;
    } catch (error) {
      throwApiError(error);
    }
    },
  });
}

/**
 * Hook to download invoice PDF
 */
export function useDownloadInvoice() {
  return useMutation({
    mutationFn: async ({ invoiceNumber, platformId }: { invoiceNumber: string; platformId: string }) => {
      try {
        const response = await apiClient.get(`/client/v1/invoice/download-pdf/${invoiceNumber}?pid=${platformId}`, {
          responseType: 'blob',
        });
        return response.data;
      } catch (error) {
        throwApiError(error);
      }
    },
  });
}

/**
 * Hook to download cost estimate PDF
 */
export function useDownloadCostEstimate() {
  return useMutation({
    mutationFn: async ({ orderId, platformId }: { orderId: string, platformId: string }) => {
      try {
        const response = await apiClient.get(
          `/client/v1/invoice/download-cost-estimate-pdf/${orderId}?pid=${platformId}`,
          { responseType: 'blob' }
        );
        return response.data;
      } catch (error) {
        throwApiError(error);
      }
    },
  });
}
