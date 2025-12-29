'use client'

/**
 * Phase 13: Client Dashboard Home
 * Professional client dashboard with summary statistics and recent orders
 */

import {
	useClientDashboardSummary,
	useClientOrders,
} from '@/hooks/use-client-orders'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
	Package,
	FileText,
	Calendar,
	Clock,
	ShoppingCart,
	MapPin,
	ArrowRight,
} from 'lucide-react'
import Link from 'next/link'
import { ClientNav } from '@/components/client-nav'

// Order status display configuration
const ORDER_STATUS_CONFIG = {
	SUBMITTED: {
		label: 'Submitted',
		color: 'bg-blue-100 text-blue-700 border-blue-300',
	},
	PRICING_REVIEW: {
		label: 'Pricing Review',
		color: 'bg-yellow-100 text-yellow-700 border-yellow-300',
	},
	QUOTED: {
		label: 'Quoted',
		color: 'bg-purple-100 text-purple-700 border-purple-300',
	},
	APPROVED: {
		label: 'Approved',
		color: 'bg-green-100 text-green-700 border-green-300',
	},
	INVOICED: {
		label: 'Invoiced',
		color: 'bg-indigo-100 text-indigo-700 border-indigo-300',
	},
	PAID: {
		label: 'Paid',
		color: 'bg-emerald-100 text-emerald-700 border-emerald-300',
	},
	CONFIRMED: {
		label: 'Confirmed',
		color: 'bg-teal-100 text-teal-700 border-teal-300',
	},
	IN_PREPARATION: {
		label: 'In Preparation',
		color: 'bg-cyan-100 text-cyan-700 border-cyan-300',
	},
	READY_FOR_DELIVERY: {
		label: 'Ready',
		color: 'bg-sky-100 text-sky-700 border-sky-300',
	},
	IN_TRANSIT: {
		label: 'In Transit',
		color: 'bg-violet-100 text-violet-700 border-violet-300',
	},
	DELIVERED: {
		label: 'Delivered',
		color: 'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-300',
	},
	IN_USE: {
		label: 'In Use',
		color: 'bg-pink-100 text-pink-700 border-pink-300',
	},
	AWAITING_RETURN: {
		label: 'Awaiting Return',
		color: 'bg-rose-100 text-rose-700 border-rose-300',
	},
	CLOSED: {
		label: 'Closed',
		color: 'bg-slate-100 text-slate-700 border-slate-300',
	},
}

export default function ClientDashboardPage() {
	// Fetch dashboard data
	const { data: summaryData, isLoading: summaryLoading } =
		useClientDashboardSummary()
	const { data: ordersData, isLoading: ordersLoading } = useClientOrders({
		limit: 5,
	})

	const summary = summaryData?.summary
	const recentOrders = ordersData?.orders || []

	return (
		<ClientNav>
			<div className='min-h-screen bg-linear-to-br from-background via-muted/30 to-background'>
				{/* Header */}
				<div className='border-b border-border/40 bg-card/80 backdrop-blur-sm sticky top-0 z-10'>
					<div className='container mx-auto px-6 py-6'>
						<div>
							<h1 className='text-3xl font-bold text-foreground tracking-tight'>
								Dashboard
							</h1>
							<p className='text-sm text-muted-foreground mt-1'>
								Welcome back! Here's an overview of your orders
								and upcoming events.
							</p>
						</div>
					</div>
				</div>

				<div className='container mx-auto px-6 py-8'>
					{/* Summary Statistics */}
					<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8'>
						{summaryLoading ? (
							<>
								{[...Array(4)].map((_, i) => (
									<Card
										key={i}
										className='bg-card/80 backdrop-blur-sm border-border/40'
									>
										<CardContent className='pt-6'>
											<Skeleton className='h-20 w-full' />
										</CardContent>
									</Card>
								))}
							</>
						) : (
							<>
								<Card className='bg-card/80 backdrop-blur-sm border-border/40 hover:shadow-lg transition-shadow'>
									<CardContent className='pt-6'>
										<div className='flex items-center justify-between'>
											<div>
												<p className='text-xs font-medium text-muted-foreground uppercase tracking-wide'>
													Active Orders
												</p>
												<p className='text-3xl font-bold text-foreground mt-1 font-mono'>
													{summary?.activeOrders || 0}
												</p>
												<p className='text-xs text-muted-foreground mt-1'>
													In progress
												</p>
											</div>
											<Package className='h-10 w-10 text-blue-500/80' />
										</div>
									</CardContent>
								</Card>

								<Card className='bg-card/80 backdrop-blur-sm border-border/40 hover:shadow-lg transition-shadow'>
									<CardContent className='pt-6'>
										<div className='flex items-center justify-between'>
											<div>
												<p className='text-xs font-medium text-muted-foreground uppercase tracking-wide'>
													Pending Quotes
												</p>
												<p className='text-3xl font-bold text-foreground mt-1 font-mono'>
													{summary?.pendingQuotes ||
														0}
												</p>
												<p className='text-xs text-muted-foreground mt-1'>
													Awaiting approval
												</p>
											</div>
											<FileText className='h-10 w-10 text-purple-500/80' />
										</div>
									</CardContent>
								</Card>

								<Card className='bg-card/80 backdrop-blur-sm border-border/40 hover:shadow-lg transition-shadow'>
									<CardContent className='pt-6'>
										<div className='flex items-center justify-between'>
											<div>
												<p className='text-xs font-medium text-muted-foreground uppercase tracking-wide'>
													Upcoming Events
												</p>
												<p className='text-3xl font-bold text-foreground mt-1 font-mono'>
													{summary?.upcomingEvents ||
														0}
												</p>
												<p className='text-xs text-muted-foreground mt-1'>
													Next 30 days
												</p>
											</div>
											<Calendar className='h-10 w-10 text-green-500/80' />
										</div>
									</CardContent>
								</Card>

								<Card className='bg-card/80 backdrop-blur-sm border-border/40 hover:shadow-lg transition-shadow'>
									<CardContent className='pt-6'>
										<div className='flex items-center justify-between'>
											<div>
												<p className='text-xs font-medium text-muted-foreground uppercase tracking-wide'>
													Awaiting Return
												</p>
												<p className='text-3xl font-bold text-foreground mt-1 font-mono'>
													{summary?.awaitingReturn ||
														0}
												</p>
												<p className='text-xs text-muted-foreground mt-1'>
													Post-event
												</p>
											</div>
											<Clock className='h-10 w-10 text-amber-500/80' />
										</div>
									</CardContent>
								</Card>
							</>
						)}
					</div>

					<div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
						{/* Recent Orders */}
						<Card className='lg:col-span-2 bg-card/80 backdrop-blur-sm border-border/40'>
							<CardHeader className='border-b border-border/40'>
								<div className='flex items-center justify-between'>
									<CardTitle className='text-xl font-semibold'>
										Recent Orders
									</CardTitle>
									<Link href='/my-orders'>
										<Button
											variant='ghost'
											size='sm'
											className='gap-2'
										>
											View All
											<ArrowRight className='h-4 w-4' />
										</Button>
									</Link>
								</div>
							</CardHeader>
							<CardContent className='p-0'>
								{ordersLoading ? (
									<div className='p-6 space-y-4'>
										{[...Array(3)].map((_, i) => (
											<Skeleton
												key={i}
												className='h-24 w-full'
											/>
										))}
									</div>
								) : recentOrders.length === 0 ? (
									<div className='p-12 text-center'>
										<Package className='h-12 w-12 mx-auto text-muted-foreground/50 mb-4' />
										<p className='text-muted-foreground font-medium'>
											No orders yet
										</p>
										<p className='text-sm text-muted-foreground/70 mt-1'>
											Start by browsing the catalog and
											creating your first order
										</p>
										<Link href='/catalog'>
											<Button className='mt-4 gap-2'>
												<ShoppingCart className='h-4 w-4' />
												Browse Catalog
											</Button>
										</Link>
									</div>
								) : (
									<div className='divide-y divide-border/40'>
										{recentOrders.map(order => (
											<Link
												key={order.id}
												href={`/orders/${order.orderId}`}
											>
												<div className='p-6 hover:bg-muted/30 transition-colors cursor-pointer group'>
													<div className='flex items-start justify-between gap-4'>
														<div className='flex-1 min-w-0'>
															<div className='flex items-center gap-3 mb-2'>
																<p className='font-mono text-sm font-bold text-foreground'>
																	{
																		order.orderId
																	}
																</p>
																{order.brand && (
																	<Badge
																		variant='outline'
																		className='text-xs'
																	>
																		{
																			order
																				.brand
																				.name
																		}
																	</Badge>
																)}
															</div>
															<div className='flex items-start gap-2 mb-1'>
																<MapPin className='h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0' />
																<div className='min-w-0'>
																	<p className='font-medium text-foreground text-sm truncate'>
																		{
																			order.venueName
																		}
																	</p>
																	<p className='text-xs text-muted-foreground'>
																		{
																			order.venueCity
																		}
																	</p>
																</div>
															</div>
															<div className='flex items-center gap-2 mt-2'>
																<Calendar className='h-4 w-4 text-muted-foreground' />
																<p className='text-xs text-muted-foreground'>
																	Event:{' '}
																	{new Date(
																		order.eventStartDate
																	).toLocaleDateString()}
																</p>
															</div>
														</div>
														<div className='flex flex-col items-end gap-2'>
															<Badge
																variant='outline'
																className={`${(ORDER_STATUS_CONFIG as any)[order.status]?.color || 'bg-gray-100 text-gray-700 border-gray-300'} font-medium border whitespace-nowrap text-xs`}
															>
																{(
																	ORDER_STATUS_CONFIG as any
																)[order.status]
																	?.label ||
																	order.status}
															</Badge>
															<ArrowRight className='h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity' />
														</div>
													</div>
												</div>
											</Link>
										))}
									</div>
								)}
							</CardContent>
						</Card>

						{/* Quick Actions */}
						<div className='space-y-6'>
							<Card className='bg-card/80 backdrop-blur-sm border-border/40'>
								<CardHeader className='border-b border-border/40'>
									<CardTitle className='text-xl font-semibold'>
										Quick Actions
									</CardTitle>
								</CardHeader>
								<CardContent className='pt-6 flex flex-col gap-y-3'>
									<Link href='/my-orders'>
										<Button
											variant='outline'
											className='w-full justify-start gap-3 h-auto py-4'
										>
											<Package className='h-5 w-5 text-blue-500' />
											<div className='text-left'>
												<p className='font-semibold'>
													All Orders
												</p>
												<p className='text-xs text-muted-foreground'>
													View and track all your
													orders
												</p>
											</div>
										</Button>
									</Link>

									<Link href='/event-calendar'>
										<Button
											variant='outline'
											className='w-full justify-start gap-3 h-auto py-4'
										>
											<Calendar className='h-5 w-5 text-green-500' />
											<div className='text-left'>
												<p className='font-semibold'>
													Event Calendar
												</p>
												<p className='text-xs text-muted-foreground'>
													View upcoming event schedule
												</p>
											</div>
										</Button>
									</Link>

									<Link href='/catalog'>
										<Button
											variant='outline'
											className='w-full justify-start gap-3 h-auto py-4'
										>
											<ShoppingCart className='h-5 w-5 text-purple-500' />
											<div className='text-left'>
												<p className='font-semibold'>
													Browse Catalog
												</p>
												<p className='text-xs text-muted-foreground'>
													Explore available assets
												</p>
											</div>
										</Button>
									</Link>
								</CardContent>
							</Card>
						</div>
					</div>
				</div>
			</div>
		</ClientNav>
	)
}
