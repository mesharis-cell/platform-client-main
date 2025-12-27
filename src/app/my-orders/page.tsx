'use client';

/**
 * Phase 13: Client Orders List Page
 * Professional order list interface with filtering and search
 */

import { useState } from 'react';
import Link from 'next/link';
import { useClientOrders } from '@/hooks/use-client-orders';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Package, Calendar, MapPin, ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';
import { ClientNav } from '@/components/client-nav';

// Order status display configuration
const ORDER_STATUS_CONFIG = {
	DRAFT: { label: 'Draft', color: 'bg-gray-100 text-gray-700 border-gray-300' },
	SUBMITTED: { label: 'Submitted', color: 'bg-blue-100 text-blue-700 border-blue-300' },
	PRICING_REVIEW: { label: 'Pricing Review', color: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
	PENDING_APPROVAL: { label: 'Pending Approval', color: 'bg-amber-100 text-amber-700 border-amber-300' },
	QUOTED: { label: 'Quoted', color: 'bg-purple-100 text-purple-700 border-purple-300' },
	DECLINED: { label: 'Declined', color: 'bg-red-100 text-red-700 border-red-300' },
	CONFIRMED: { label: 'Confirmed', color: 'bg-green-100 text-green-700 border-green-300' },
	IN_PREPARATION: { label: 'In Preparation', color: 'bg-cyan-100 text-cyan-700 border-cyan-300' },
	READY_FOR_DELIVERY: { label: 'Ready', color: 'bg-sky-100 text-sky-700 border-sky-300' },
	IN_TRANSIT: { label: 'In Transit', color: 'bg-violet-100 text-violet-700 border-violet-300' },
	DELIVERED: { label: 'Delivered', color: 'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-300' },
	IN_USE: { label: 'In Use', color: 'bg-pink-100 text-pink-700 border-pink-300' },
	AWAITING_RETURN: { label: 'Awaiting Return', color: 'bg-rose-100 text-rose-700 border-rose-300' },
	CLOSED: { label: 'Closed', color: 'bg-slate-100 text-slate-700 border-slate-300' },
};

export default function MyOrdersPage() {
	// Filters state
	const [page, setPage] = useState(1);
	const [limit] = useState(10);
	const [status, setStatus] = useState<string>('');
	const [search, setSearch] = useState<string>('');
	const [searchInput, setSearchInput] = useState<string>('');

	// Data fetching
	const { data, isLoading, error } = useClientOrders({
		page,
		limit,
		status: status || undefined,
		search: search || undefined,
	});

	// Handle search
	const handleSearch = () => {
		setSearch(searchInput);
		setPage(1);
	};

	const handleKeyPress = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter') {
			handleSearch();
		}
	};

	// Clear filters
	const clearFilters = () => {
		setStatus('');
		setSearch('');
		setSearchInput('');
		setPage(1);
	};

	const activeFiltersCount = (status ? 1 : 0) + (search ? 1 : 0);

	return (
		<ClientNav>
			<div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
				{/* Header */}
				<div className="border-b border-border/40 bg-card/80 backdrop-blur-sm sticky top-0 z-10">
					<div className="container mx-auto px-6 py-6">
						<div className="flex items-center justify-between">
							<div>
								<h1 className="text-3xl font-bold text-foreground tracking-tight">My Orders</h1>
								<p className="text-sm text-muted-foreground mt-1">
									View and track all your order requests
								</p>
							</div>
							<Link href="/catalog">
								<Button className="gap-2">
									<Plus className="h-4 w-4" />
									New Order
								</Button>
							</Link>
						</div>
					</div>
				</div>

				<div className="container mx-auto px-6 py-8">
					{/* Filters Bar */}
					<Card className="bg-card/80 backdrop-blur-sm border-border/40 mb-6">
						<CardContent className="pt-6">
							<div className="flex flex-col md:flex-row gap-4">
								{/* Search */}
								<div className="flex-1 flex gap-2">
									<Input
										placeholder="Search by order ID or venue name..."
										value={searchInput}
										onChange={(e) => setSearchInput(e.target.value)}
										onKeyPress={handleKeyPress}
										className="flex-1"
									/>
									<Button onClick={handleSearch} size="icon" variant="secondary">
										<Search className="h-4 w-4" />
									</Button>
								</div>

								{/* Status Filter */}
								<Select value={status} onValueChange={(val) => { setStatus(val === 'all' ? '' : val); setPage(1); }}>
									<SelectTrigger className="w-full md:w-[200px]">
										<SelectValue placeholder="All Statuses" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="all">All Statuses</SelectItem>
										{Object.entries(ORDER_STATUS_CONFIG).map(([key, config]) => (
											<SelectItem key={key} value={key}>
												{config.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>

								{/* Clear Filters */}
								{activeFiltersCount > 0 && (
									<Button onClick={clearFilters} variant="outline" size="icon" className="shrink-0">
										<X className="h-4 w-4" />
									</Button>
								)}
							</div>
						</CardContent>
					</Card>

					{/* Orders List */}
					{isLoading ? (
						<div className="space-y-4">
							{[...Array(5)].map((_, i) => (
								<Skeleton key={i} className="h-40 w-full" />
							))}
						</div>
					) : error ? (
						<Card className="bg-card/80 backdrop-blur-sm border-border/40">
							<CardContent className="p-12 text-center">
								<p className="text-destructive font-medium">Failed to load orders. Please try again.</p>
							</CardContent>
						</Card>
					) : !data || data?.data?.length === 0 ? (
						<Card className="bg-card/80 backdrop-blur-sm border-border/40">
							<CardContent className="p-12 text-center">
								<Package className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
								<p className="text-foreground font-medium text-lg mb-2">No orders found</p>
								<p className="text-sm text-muted-foreground mb-6">
									{activeFiltersCount > 0
										? 'Try adjusting your filters to see more results'
										: 'Get started by creating your first order'}
								</p>
								<Link href="/catalog">
									<Button className="gap-2">
										<Plus className="h-4 w-4" />
										Create New Order
									</Button>
								</Link>
							</CardContent>
						</Card>
					) : (
						<>
							<div className="flex flex-col space-y-4">
								{data?.data.map((order) => (
									<Link key={order.id} href={`/orders/${order.orderId}`}>
										<Card className="bg-card/80 backdrop-blur-sm border-border/40 hover:shadow-lg transition-all duration-200 group cursor-pointer">
											<CardContent className="p-6">
												<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
													<div className="flex-1 min-w-0 space-y-3">
														{/* Order ID and Brand */}
														<div className="flex items-center gap-3">
															<p className="font-mono text-lg font-bold text-foreground">
																{order.order_id}
															</p>
															{order?.brand && (
																<Badge variant="outline" className="text-xs">
																	{order.brand.name}
																</Badge>
															)}
														</div>

														{/* Venue */}
														<div className="flex items-start gap-2">
															<MapPin className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
															<div className="min-w-0">
																<p className="font-semibold text-foreground text-base truncate">
																	{order.venue_name}
																</p>
																<p className="text-sm text-muted-foreground">
																	{order.venue_city}
																</p>
															</div>
														</div>

														{/* Event Date */}
														<div className="flex items-center gap-2">
															<Calendar className="h-5 w-5 text-muted-foreground" />
															<p className="text-sm text-muted-foreground">
																Event: <span className="font-medium text-foreground font-mono">
																	{new Date(order.event_start_date).toLocaleDateString()}
																</span>
															</p>
														</div>
													</div>

													{/* Status Badge */}
													<div className="flex flex-col items-end gap-3">
														<Badge
															variant="outline"
															className={`${(ORDER_STATUS_CONFIG as any)[order.order_status]?.color || 'bg-gray-100 text-gray-700 border-gray-300'} font-medium border whitespace-nowrap px-4 py-1.5 text-sm`}
														>
															{(ORDER_STATUS_CONFIG as any)[order.order_status]?.label || order.order_status}
														</Badge>
														<Button
															variant="ghost"
															size="sm"
															className="opacity-0 group-hover:opacity-100 transition-opacity"
														>
															View Details →
														</Button>
													</div>
												</div>
											</CardContent>
										</Card>
									</Link>
								))}
							</div>

							{/* Pagination */}
							{data?.meta && data?.meta?.total > 10 && (
								<Card className="bg-card/80 backdrop-blur-sm border-border/40 mt-6">
									<CardContent className="py-4">
										<div className="flex items-center justify-between">
											<p className="text-sm text-muted-foreground">
												Showing {(page - 1) * limit + 1} to{' '}
												{Math.min(page * limit, data.meta.total)} of{' '}
												{data.meta.total} orders
											</p>
											<div className="flex gap-2">
												<Button
													onClick={() => setPage((p) => Math.max(1, p - 1))}
													disabled={page === 1}
													variant="outline"
													size="sm"
													className="gap-1"
												>
													<ChevronLeft className="h-4 w-4" />
													Previous
												</Button>
												<Button
													onClick={() => setPage((p) => Math.min(data.meta.page, p + 1))}
													disabled={page === data.meta.page}
													variant="outline"
													size="sm"
													className="gap-1"
												>
													Next
													<ChevronRight className="h-4 w-4" />
												</Button>
											</div>
										</div>
									</CardContent>
								</Card>
							)}
						</>
					)}
				</div>
			</div>
		</ClientNav>
	);
}
