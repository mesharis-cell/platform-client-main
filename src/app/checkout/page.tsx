'use client'

/**
 * Checkout Flow - Multi-Step Order Creation
 *
 * Design: Linear progress with clear validation and feedback
 * Steps: Review Cart → Event Details → Venue Info → Contact → Review & Submit
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCart } from '@/contexts/cart-context'
import { useSubmitOrderFromCart } from '@/hooks/use-orders'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import {
	Check,
	ChevronLeft,
	ChevronRight,
	ShoppingCart,
	Calendar,
	MapPin,
	User,
	FileText,
	Package,
	AlertCircle,
	TrendingUp,
	Cuboid,
	Divide,
} from 'lucide-react'
import Image from 'next/image'
import { ClientNav } from '@/components/client-nav'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { useBrands } from '@/hooks/use-brands'
import { apiClient } from '@/lib/api/api-client'
import { usePricingTierLocations } from '@/hooks/use-pricing-tiers'
import { useToken } from '@/lib/auth/use-token'

type Step = 'cart' | 'event' | 'venue' | 'contact' | 'review'

const STEPS: { key: Step; label: string; icon: any }[] = [
	{ key: 'cart', label: 'Order Review', icon: ShoppingCart },
	{ key: 'event', label: 'Event Details', icon: Calendar },
	{ key: 'venue', label: 'Venue Info', icon: MapPin },
	{ key: 'contact', label: 'Contact', icon: User },
	{ key: 'review', label: 'Review', icon: FileText },
]

function CheckoutPageInner() {
	const router = useRouter()
	const {
		items,
		itemCount,
		totalVolume,
		totalWeight,
		clearCart,
		isInitialized,
	} = useCart()
	const [currentStep, setCurrentStep] = useState<Step>('cart')
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [availabilityIssues, setAvailabilityIssues] = useState<string[]>([])
	const [useCustomLocation, setUseCustomLocation] = useState(false)
	const [estimatedPrice, setEstimatedPrice] = useState<number | null>(null)
	const { user } = useToken()

	// Mutations
	const submitMutation = useSubmitOrderFromCart();
	const { data: brandsData } = useBrands(user?.company_id ? { company: user?.company_id } : undefined)

	// Form state
	const [formData, setFormData] = useState({
		brand_id: undefined,
		event_start_date: '',
		event_end_date: '',
		venue_name: '',
		venue_country: '',
		venue_city: '',
		venue_address: '',
		venue_access_notes: '',
		contact_name: '',
		contact_email: '',
		contact_phone: '',
		special_instructions: '',
	})

	// Fetch pricing tier locations (public endpoint, no pricing details)
	const { data: locationsData } = usePricingTierLocations();

	const countries = locationsData?.data?.countries || []
	const cities = formData.venue_country
		? locationsData?.data?.locations_by_country?.[formData.venue_country] || []
		: []

	// Validate cart availability before review step
	useEffect(() => {
		const validateAvailability = async () => {
			if (items.length === 0 || currentStep !== 'review') return

			try {
				const assetIds = items.map(i => i.assetId)
				const response = await apiClient.post('/operations/v1/asset/batch-availability', {
					asset_ids: assetIds,
				})

				if (!response.data.success) {
					console.error('Failed to validate availability')
					return
				}

				const assets = response.data.data
				const issues: string[] = []

				items.forEach(item => {
					const asset = assets.find((a: any) => a.id === item.assetId)

					if (!asset || asset.status !== 'AVAILABLE') {
						issues.push(`${item.assetName} is no longer available`)
					} else if (item.quantity > asset.available_quantity) {
						issues.push(
							`${item.assetName}: only ${asset.available_quantity} available (you have ${item.quantity})`
						)
					}
				})

				setAvailabilityIssues(issues)
			} catch (error) {
				console.error('Error validating availability:', error)
			}
		}

		validateAvailability()
	}, [items, currentStep])

	// Calculate price estimate when country/city changes
	useEffect(() => {
		const calculatePrice = async () => {
			if (
				!formData.venue_country ||
				!formData.venue_city ||
				useCustomLocation ||
				totalVolume === 0
			) {
				setEstimatedPrice(null)
				return
			}

			try {
				const params = new URLSearchParams({
					country: formData.venue_country,
					city: formData.venue_city,
					volume: totalVolume.toFixed(3),
				})

				const response = await apiClient.get(`/operations/v1/pricing-tier/calculate?${params}`)
				const data = await response.data

				if (!data.success) {
					setEstimatedPrice(null)
					return
				}
				// Use estimatedTotal (flat rate + margin), not basePrice × volume
				if (data.data.estimated_total) {
					setEstimatedPrice(parseFloat(data.data.estimated_total))
				} else {
					setEstimatedPrice(null)
				}
			} catch (error) {
				console.error('Error calculating price:', error)
				setEstimatedPrice(null)
			}
		}

		calculatePrice()
	}, [
		formData.venue_country,
		formData.venue_city,
		totalVolume,
		useCustomLocation,
	])

	// Redirect if cart is empty
	useEffect(() => {
		if (items.length === 0 && currentStep !== 'cart') {
			router.push('/catalog')
		}
	}, [items.length, currentStep, router])

	const currentStepIndex = STEPS.findIndex(s => s.key === currentStep)

	const canProceed = () => {
		switch (currentStep) {
			case 'cart':
				return items.length > 0
			case 'event':
				return (
					formData.event_start_date &&
					formData.event_end_date &&
					new Date(formData.event_start_date) <
					new Date(formData.event_end_date)
				)
			case 'venue':
				return (
					formData.venue_name &&
					formData.venue_country &&
					formData.venue_city &&
					formData.venue_address
				)
			case 'contact':
				return (
					formData.contact_name &&
					formData.contact_email &&
					formData.contact_phone
				)
			case 'review':
				return true
			default:
				return false
		}
	}

	const handleNext = () => {
		if (!canProceed()) {
			toast.error('Please fill all required fields')
			return
		}

		const nextIndex = currentStepIndex + 1
		if (nextIndex < STEPS.length) {
			setCurrentStep(STEPS[nextIndex].key)
		}
	}

	const handleBack = () => {
		const prevIndex = currentStepIndex - 1
		if (prevIndex >= 0) {
			setCurrentStep(STEPS[prevIndex].key)
		}
	}

	const handleSubmit = async () => {
		if (availabilityIssues.length > 0) {
			toast.error('Please resolve availability issues before submitting')
			return
		}

		if (items.length === 0) {
			toast.error('Cart is empty')
			return
		}

		setIsSubmitting(true)
		try {
			const submitData = {
				items: items.map(item => ({
					asset_id: item.assetId,
					quantity: item.quantity,
					from_collection_id: item.fromCollection,
				})),
				...formData,
			}

			const result = await submitMutation.mutateAsync(submitData)

			toast.success('Order submitted successfully!', {
				description: `Order ID: ${result.orderId}`,
			})

			clearCart()
			router.push(`/orders/${result.orderId}`)
		} catch (error) {
			toast.error(
				error instanceof Error
					? error.message
					: 'Failed to submit order'
			)
		} finally {
			setIsSubmitting(false)
		}
	}

	// Show loading while cart initializes
	if (!isInitialized) {
		return (
			<div className='min-h-screen bg-background flex items-center justify-center'>
				<div className='text-center'>
					<div className='h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4' />
					<p className='text-sm text-muted-foreground font-mono'>
						Loading cart...
					</p>
				</div>
			</div>
		)
	}

	if (items.length === 0) {
		return (
			<div className='min-h-screen bg-background flex items-center justify-center p-8'>
				<Card className='max-w-md w-full p-10 text-center'>
					<div className='h-20 w-20 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-6'>
						<ShoppingCart className='h-10 w-10 text-muted-foreground/50' />
					</div>
					<h2 className='text-2xl font-bold mb-3'>
						Your cart is empty
					</h2>
					<p className='text-muted-foreground mb-6'>
						Add items to your cart before proceeding to checkout
					</p>
					<Button
						onClick={() => router.push('/catalog')}
						className='gap-2 font-mono'
					>
						<Package className='h-4 w-4' />
						Browse Catalog
					</Button>
				</Card>
			</div>
		)
	}

	return (
		<div className='min-h-screen bg-linear-to-br from-background via-muted/10 to-background'>
			{/* Progress Header */}
			<div className='border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10'>
				<div className='max-w-5xl mx-auto px-8 py-6'>
					<div className='flex items-center justify-between'>
						{STEPS.map((step, index) => {
							const isActive = step.key === currentStep
							const isCompleted = index < currentStepIndex
							const Icon = step.icon

							return (
								<div
									key={step.key}
									className='flex items-center flex-1'
								>
									<div className='flex items-center gap-3'>
										<div
											className={`h-10 w-10 rounded-full flex items-center justify-center border-2 transition-all ${isCompleted
												? 'bg-primary border-primary text-primary-foreground'
												: isActive
													? 'bg-primary/10 border-primary text-primary'
													: 'bg-muted border-border text-muted-foreground'
												}`}
										>
											{isCompleted ? (
												<Check className='h-5 w-5' />
											) : (
												<Icon className='h-5 w-5' />
											)}
										</div>
										<div
											className={`hidden sm:block ${index < STEPS.length - 1 ? '' : ''}`}
										>
											<p
												className={`text-sm font-medium font-mono uppercase tracking-wide ${isActive
													? 'text-foreground'
													: 'text-muted-foreground'
													}`}
											>
												{step.label}
											</p>
											<p className='text-xs text-muted-foreground font-mono'>
												Step {index + 1} of{' '}
												{STEPS.length}
											</p>
										</div>
									</div>
									{index < STEPS.length - 1 && (
										<div
											className={`flex-1 h-0.5 mx-4 transition-colors ${isCompleted
												? 'bg-primary'
												: 'bg-border'
												}`}
										/>
									)}
								</div>
							)
						})}
					</div>
				</div>
			</div>

			{/* Content */}
			<div className='max-w-5xl mx-auto px-8 py-10'>
				<AnimatePresence mode='wait'>
					{/* Step 1: Cart Review */}
					{currentStep === 'cart' && (
						<motion.div
							key='cart'
							initial={{ opacity: 0, x: 20 }}
							animate={{ opacity: 1, x: 0 }}
							exit={{ opacity: 0, x: -20 }}
							transition={{ duration: 0.3 }}
							className='space-y-6'
						>
							<div>
								<h2 className='text-3xl font-bold mb-2'>
									Review Your Order
								</h2>
								<p className='text-muted-foreground'>
									Verify your items before proceeding to event
									details
								</p>
							</div>

							<Card className='p-6 bg-card/50 border-border/50'>
								<div className='space-y-4'>
									{items.map(item => (
										<div
											key={item.assetId}
											className='flex gap-4 pb-4 border-b border-border last:border-0 last:pb-0'
										>
											<div className='w-24 h-24 rounded-lg overflow-hidden border border-border shrink-0 bg-muted'>
												{item.image ? (
													<Image
														src={item.image}
														alt={item.assetName}
														width={96}
														height={96}
														className='object-cover w-full h-full'
													/>
												) : (
													<div className='w-full h-full flex items-center justify-center'>
														<Package className='h-10 w-10 text-muted-foreground/30' />
													</div>
												)}
											</div>

											<div className='flex-1'>
												<h4 className='font-semibold mb-1'>
													{item.assetName}
												</h4>
												<div className='flex items-center gap-3 text-sm text-muted-foreground font-mono mb-2'>
													<span>
														Qty: {item.quantity}
													</span>
													<span>•</span>
													<span>
														{item.volume} m³ each
													</span>
													<span>•</span>
													<span>
														{item.weight} kg each
													</span>
												</div>
												{item.fromCollectionName && (
													<p className='text-xs text-muted-foreground font-mono'>
														From collection:{' '}
														{
															item.fromCollectionName
														}
													</p>
												)}
											</div>
										</div>
									))}
								</div>
							</Card>

							{/* Totals Card */}
							<Card className='p-6 bg-primary/5 border-primary/20'>
								<div className='grid grid-cols-3 gap-6'>
									<div>
										<p className='text-xs font-mono text-muted-foreground uppercase tracking-wide mb-1'>
											Total Items
										</p>
										<p className='text-2xl font-bold font-mono'>
											{itemCount}
										</p>
									</div>
									<div>
										<p className='text-xs font-mono text-muted-foreground uppercase tracking-wide mb-1'>
											Total Volume
										</p>
										<p className='text-2xl font-bold font-mono text-primary'>
											{totalVolume.toFixed(2)} m³
										</p>
									</div>
									<div>
										<p className='text-xs font-mono text-muted-foreground uppercase tracking-wide mb-1'>
											Total Weight
										</p>
										<p className='text-2xl font-bold font-mono'>
											{totalWeight.toFixed(1)} kg
										</p>
									</div>
								</div>
							</Card>
						</motion.div>
					)}

					{/* Step 2: Event Details */}
					{currentStep === 'event' && (
						<motion.div
							key='event'
							initial={{ opacity: 0, x: 20 }}
							animate={{ opacity: 1, x: 0 }}
							exit={{ opacity: 0, x: -20 }}
							transition={{ duration: 0.3 }}
							className='space-y-6'
						>
							<div>
								<h2 className='text-3xl font-bold mb-2'>
									Event Details
								</h2>
								<p className='text-muted-foreground'>
									When do you need these assets?
								</p>
							</div>

							<Card className='p-8 bg-card/50 border-border/50 space-y-6'>
								{/* <div>
									<Label
										htmlFor='brand'
										className='font-mono uppercase text-xs tracking-wide'
									>
										Brand (Optional)
									</Label>
									<Select>
										<SelectTrigger>
											<SelectValue placeholder='Select Brand' />
										</SelectTrigger>
										<SelectContent>
											{brandsData?.data?.map((brand: Brand) => (
												<SelectItem key={brand.id} value={brand.id}>{brand.name}</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div> */}
								<div className='space-y-6'>
									<div className='grid grid-cols-2 gap-6'>
										<div className='space-y-2'>
											<Label
												htmlFor='eventStartDate'
												className='font-mono uppercase text-xs tracking-wide'
											>
												Event Start Date *
											</Label>
											<Input
												id='eventStartDate'
												type='date'
												value={formData.event_start_date}
												onChange={e =>
													setFormData({
														...formData,
														event_start_date:
															e.target.value,
													})
												}
												required
												className='h-12 font-mono'
											/>
										</div>

										<div className='space-y-2'>
											<Label
												htmlFor='eventEndDate'
												className='font-mono uppercase text-xs tracking-wide'
											>
												Event End Date *
											</Label>
											<Input
												id='eventEndDate'
												type='date'
												value={formData.event_end_date}
												onChange={e =>
													setFormData({
														...formData,
														event_end_date:
															e.target.value,
													})
												}
												required
												min={formData.event_start_date}
												className='h-12 font-mono'
											/>
										</div>
									</div>

									{formData.event_start_date &&
										formData.event_end_date && (
											<div className='bg-primary/5 border border-primary/20 rounded-lg p-4'>
												<div className='flex items-center gap-3'>
													<Calendar className='h-5 w-5 text-primary' />
													<div>
														<p className='text-sm font-medium'>
															Event Duration
														</p>
														<p className='text-xs text-muted-foreground font-mono'>
															{Math.ceil(
																(new Date(
																	formData.event_end_date
																).getTime() -
																	new Date(
																		formData.event_start_date
																	).getTime()) /
																(1000 *
																	60 *
																	60 *
																	24)
															)}{' '}
															days
														</p>
													</div>
												</div>
											</div>
										)}
								</div>
							</Card>
						</motion.div>
					)}

					{/* Step 3: Venue Information */}
					{currentStep === 'venue' && (
						<motion.div
							key='venue'
							initial={{ opacity: 0, x: 20 }}
							animate={{ opacity: 1, x: 0 }}
							exit={{ opacity: 0, x: -20 }}
							transition={{ duration: 0.3 }}
							className='space-y-6'
						>
							<div>
								<h2 className='text-3xl font-bold mb-2'>
									Venue Information
								</h2>
								<p className='text-muted-foreground'>
									Where will the event take place?
								</p>
							</div>

							<Card className='p-8 bg-card/50 border-border/50'>
								<div className='space-y-6'>
									<div className='space-y-2'>
										<Label
											htmlFor='venueName'
											className='font-mono uppercase text-xs tracking-wide'
										>
											Venue Name *
										</Label>
										<Input
											id='venueName'
											value={formData.venue_name}
											onChange={e =>
												setFormData({
													...formData,
													venue_name: e.target.value,
												})
											}
											placeholder='e.g., Dubai Festival City'
											required
											className='h-12'
										/>
									</div>

									<div className='grid grid-cols-2 gap-6'>
										<div className='space-y-2'>
											<Label
												htmlFor='venueCountry'
												className='font-mono uppercase text-xs tracking-wide'
											>
												Country *
											</Label>
											{!useCustomLocation ? (
												<Select
													value={
														formData.venue_country
													}
													onValueChange={value => {
														if (
															value === '_custom_'
														) {
															setUseCustomLocation(
																true
															)
															setFormData({
																...formData,
																venue_country:
																	'',
																venue_city: '',
															})
														} else {
															setFormData({
																...formData,
																venue_country:
																	value,
																venue_city: '',
															})
														}
													}}
												>
													<SelectTrigger className='h-12 font-mono'>
														<SelectValue placeholder='Select country' />
													</SelectTrigger>
													<SelectContent>
														{countries.map(
															country => (
																<SelectItem
																	key={
																		country
																	}
																	value={
																		country
																	}
																	className='font-mono'
																>
																	{country}
																</SelectItem>
															)
														)}
														<SelectItem
															value='_custom_'
															className='font-mono text-primary'
														>
															+ Enter custom
															location
														</SelectItem>
													</SelectContent>
												</Select>
											) : (
												<div className='flex gap-2'>
													<Input
														id='venueCountry'
														value={
															formData.venue_country
														}
														onChange={e =>
															setFormData({
																...formData,
																venue_country:
																	e.target
																		.value,
															})
														}
														placeholder='e.g., UAE'
														required
														className='h-12'
													/>
													<Button
														variant='outline'
														onClick={() => {
															setUseCustomLocation(
																false
															)
															setFormData({
																...formData,
																venue_country:
																	'',
																venue_city: '',
															})
														}}
														className='h-12 px-4'
													>
														Cancel
													</Button>
												</div>
											)}
										</div>

										<div className='space-y-2'>
											<Label
												htmlFor='venueCity'
												className='font-mono uppercase text-xs tracking-wide'
											>
												City *
											</Label>
											{!useCustomLocation ? (
												<Select
													value={formData.venue_city}
													onValueChange={value => {
														if (
															value === '_custom_'
														) {
															setUseCustomLocation(
																true
															)
															setFormData({
																...formData,
																venue_city: '',
															})
														} else {
															setFormData({
																...formData,
																venue_city:
																	value,
															})
														}
													}}
													disabled={
														!formData.venue_country
													}
												>
													<SelectTrigger className='h-12 font-mono'>
														<SelectValue
															placeholder={
																formData.venue_country
																	? 'Select city'
																	: 'Select country first'
															}
														/>
													</SelectTrigger>
													<SelectContent>
														{cities.map(city => (
															<SelectItem
																key={city}
																value={city}
																className='font-mono'
															>
																{city}
															</SelectItem>
														))}
														{cities.length > 0 && (
															<SelectItem
																value='_custom_'
																className='font-mono text-primary'
															>
																+ Enter custom
																location
															</SelectItem>
														)}
													</SelectContent>
												</Select>
											) : (
												<Input
													id='venueCity'
													value={formData.venue_city}
													onChange={e =>
														setFormData({
															...formData,
															venue_city:
																e.target.value,
														})
													}
													placeholder='e.g., Dubai'
													required
													className='h-12'
												/>
											)}
										</div>
									</div>

									<div className='space-y-2'>
										<Label
											htmlFor='venueAddress'
											className='font-mono uppercase text-xs tracking-wide'
										>
											Full Address *
										</Label>
										<Textarea
											id='venueAddress'
											value={formData.venue_address}
											onChange={e =>
												setFormData({
													...formData,
													venue_address:
														e.target.value,
												})
											}
											placeholder='Complete venue address'
											required
											rows={3}
											className='font-mono text-sm'
										/>
									</div>

									<div className='space-y-2'>
										<Label
											htmlFor='venueAccessNotes'
											className='font-mono uppercase text-xs tracking-wide'
										>
											Access Notes (Optional)
										</Label>
										<Textarea
											id='venueAccessNotes'
											value={formData.venue_access_notes}
											onChange={e =>
												setFormData({
													...formData,
													venue_access_notes:
														e.target.value,
												})
											}
											placeholder='Loading dock information, access codes, etc.'
											rows={2}
											className='font-mono text-sm'
										/>
									</div>
								</div>
							</Card>
						</motion.div>
					)}

					{/* Step 4: Contact Information */}
					{currentStep === 'contact' && (
						<motion.div
							key='contact'
							initial={{ opacity: 0, x: 20 }}
							animate={{ opacity: 1, x: 0 }}
							exit={{ opacity: 0, x: -20 }}
							transition={{ duration: 0.3 }}
							className='space-y-6'
						>
							<div>
								<h2 className='text-3xl font-bold mb-2'>
									Contact Information
								</h2>
								<p className='text-muted-foreground'>
									Who should we contact about this order?
								</p>
							</div>

							<Card className='p-8 bg-card/50 border-border/50'>
								<div className='space-y-6'>
									<div className='space-y-2'>
										<Label
											htmlFor='contactName'
											className='font-mono uppercase text-xs tracking-wide'
										>
											Contact Person Name *
										</Label>
										<Input
											id='contactName'
											value={formData.contact_name}
											onChange={e =>
												setFormData({
													...formData,
													contact_name: e.target.value,
												})
											}
											placeholder='e.g., John Smith'
											required
											className='h-12'
										/>
									</div>

									<div className='grid grid-cols-2 gap-6'>
										<div className='space-y-2'>
											<Label
												htmlFor='contactEmail'
												className='font-mono uppercase text-xs tracking-wide'
											>
												Email Address *
											</Label>
											<Input
												id='contactEmail'
												type='email'
												value={formData.contact_email}
												onChange={e =>
													setFormData({
														...formData,
														contact_email:
															e.target.value,
													})
												}
												placeholder='john@company.com'
												required
												className='h-12'
											/>
										</div>

										<div className='space-y-2'>
											<Label
												htmlFor='contactPhone'
												className='font-mono uppercase text-xs tracking-wide'
											>
												Phone Number *
											</Label>
											<Input
												id='contactPhone'
												type='tel'
												value={formData.contact_phone}
												onChange={e =>
													setFormData({
														...formData,
														contact_phone:
															e.target.value,
													})
												}
												placeholder='+971 50 123 4567'
												required
												className='h-12'
											/>
										</div>
									</div>

									<div className='space-y-2'>
										<Label
											htmlFor='specialInstructions'
											className='font-mono uppercase text-xs tracking-wide'
										>
											Special Instructions (Optional)
										</Label>
										<Textarea
											id='specialInstructions'
											value={formData.special_instructions}
											onChange={e =>
												setFormData({
													...formData,
													special_instructions:
														e.target.value,
												})
											}
											placeholder='Any special handling requirements, setup preferences, or branding requests...'
											rows={4}
											className='font-mono text-sm'
										/>
										<p className='text-xs text-muted-foreground'>
											Include details about setup,
											branding, or any special
											requirements
										</p>
									</div>
								</div>
							</Card>
						</motion.div>
					)}

					{/* Step 5: Review & Submit */}
					{currentStep === 'review' && (
						<motion.div
							key='review'
							initial={{ opacity: 0, x: 20 }}
							animate={{ opacity: 1, x: 0 }}
							exit={{ opacity: 0, x: -20 }}
							transition={{ duration: 0.3 }}
							className='space-y-6'
						>
							<div>
								<h2 className='text-3xl font-bold mb-2'>
									Review & Submit
								</h2>
								<p className='text-muted-foreground'>
									Double-check all details before submitting
									your order
								</p>
							</div>

							{/* Order Summary */}
							<div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
								{/* Items */}
								<Card className='p-6 bg-card/50 border-border/50'>
									<h3 className='text-lg font-semibold mb-4 font-mono uppercase tracking-wide'>
										Order Items
									</h3>
									<div className='space-y-3'>
										{items.map(item => (
											<div
												key={item.assetId}
												className='flex items-center gap-3 text-sm'
											>
												<div className='w-12 h-12 rounded border border-border overflow-hidden shrink-0'>
													{item.image ? (
														<Image
															src={item.image}
															alt={item.assetName}
															width={48}
															height={48}
															className='object-cover'
														/>
													) : (
														<div className='w-full h-full bg-muted flex items-center justify-center'>
															<Package className='h-5 w-5 text-muted-foreground/30' />
														</div>
													)}
												</div>
												<div className='flex-1 min-w-0'>
													<p className='font-medium truncate'>
														{item.assetName}
													</p>
													<p className='text-xs text-muted-foreground font-mono'>
														Qty: {item.quantity}
													</p>
												</div>
											</div>
										))}
									</div>

									<Separator className='my-4' />

									<div className='space-y-2 text-sm font-mono'>
										<div className='flex justify-between'>
											<span className='text-muted-foreground'>
												Total Items:
											</span>
											<span className='font-bold'>
												{itemCount}
											</span>
										</div>
										<div className='flex justify-between'>
											<span className='text-muted-foreground'>
												Total Volume:
											</span>
											<span className='font-bold text-primary'>
												{totalVolume.toFixed(2)} m³
											</span>
										</div>
										<div className='flex justify-between'>
											<span className='text-muted-foreground'>
												Total Weight:
											</span>
											<span className='font-bold'>
												{totalWeight.toFixed(1)} kg
											</span>
										</div>
									</div>
								</Card>

								{/* Details Summary */}
								<div className='space-y-6'>
									{/* Event Info */}
									<Card className='p-6 bg-card/50 border-border/50'>
										<h3 className='text-lg font-semibold mb-4 font-mono uppercase tracking-wide'>
											Event
										</h3>
										<div className='space-y-3 text-sm'>
											<div>
												<p className='text-xs text-muted-foreground font-mono uppercase tracking-wide mb-1'>
													Start Date
												</p>
												<p className='font-medium'>
													{new Date(
														formData.event_start_date
													).toLocaleDateString(
														'en-US',
														{
															weekday: 'long',
															year: 'numeric',
															month: 'long',
															day: 'numeric',
														}
													)}
												</p>
											</div>
											<div>
												<p className='text-xs text-muted-foreground font-mono uppercase tracking-wide mb-1'>
													End Date
												</p>
												<p className='font-medium'>
													{new Date(
														formData.event_end_date
													).toLocaleDateString(
														'en-US',
														{
															weekday: 'long',
															year: 'numeric',
															month: 'long',
															day: 'numeric',
														}
													)}
												</p>
											</div>
										</div>
									</Card>

									{/* Venue Info */}
									<Card className='p-6 bg-card/50 border-border/50'>
										<h3 className='text-lg font-semibold mb-4 font-mono uppercase tracking-wide'>
											Venue
										</h3>
										<div className='space-y-3 text-sm'>
											<div>
												<p className='text-xs text-muted-foreground font-mono uppercase tracking-wide mb-1'>
													Venue Name
												</p>
												<p className='font-medium'>
													{formData.venue_name}
												</p>
											</div>
											<div>
												<p className='text-xs text-muted-foreground font-mono uppercase tracking-wide mb-1'>
													Location
												</p>
												<p className='font-medium'>
													{formData.venue_city},{' '}
													{formData.venue_country}
												</p>
											</div>
											<div>
												<p className='text-xs text-muted-foreground font-mono uppercase tracking-wide mb-1'>
													Address
												</p>
												<p className='font-medium leading-relaxed'>
													{formData.venue_address}
												</p>
											</div>
											{formData.venue_access_notes && (
												<div>
													<p className='text-xs text-muted-foreground font-mono uppercase tracking-wide mb-1'>
														Access Notes
													</p>
													<p className='font-medium leading-relaxed'>
														{
															formData.venue_access_notes
														}
													</p>
												</div>
											)}
										</div>
									</Card>

									{/* Contact Info */}
									<Card className='p-6 bg-card/50 border-border/50'>
										<h3 className='text-lg font-semibold mb-4 font-mono uppercase tracking-wide'>
											Contact
										</h3>
										<div className='space-y-3 text-sm'>
											<div>
												<p className='text-xs text-muted-foreground font-mono uppercase tracking-wide mb-1'>
													Name
												</p>
												<p className='font-medium'>
													{formData.contact_name}
												</p>
											</div>
											<div>
												<p className='text-xs text-muted-foreground font-mono uppercase tracking-wide mb-1'>
													Email
												</p>
												<p className='font-medium'>
													{formData.contact_email}
												</p>
											</div>
											<div>
												<p className='text-xs text-muted-foreground font-mono uppercase tracking-wide mb-1'>
													Phone
												</p>
												<p className='font-medium'>
													{formData.contact_phone}
												</p>
											</div>
											{formData.special_instructions && (
												<div>
													<p className='text-xs text-muted-foreground font-mono uppercase tracking-wide mb-1'>
														Special Instructions
													</p>
													<p className='font-medium leading-relaxed'>
														{
															formData.special_instructions
														}
													</p>
												</div>
											)}
										</div>
									</Card>
								</div>
							</div>

							{/* Availability Issues Banner */}
							{availabilityIssues.length > 0 && (
								<Card className='border-destructive/50 bg-destructive/5 p-6'>
									<div className='flex items-start gap-3'>
										<AlertCircle className='h-5 w-5 text-destructive shrink-0 mt-0.5' />
										<div className='flex-1'>
											<p className='text-sm font-semibold text-destructive mb-2'>
												Availability Issues
											</p>
											<ul className='text-sm text-muted-foreground space-y-1 mb-4'>
												{availabilityIssues.map(
													(issue, i) => (
														<li
															key={i}
															className='flex items-start gap-2'
														>
															<span className='text-destructive'>
																•
															</span>
															<span>{issue}</span>
														</li>
													)
												)}
											</ul>
											<Button
												variant='outline'
												size='sm'
												onClick={() =>
													router.push('/catalog')
												}
											>
												Return to Catalog
											</Button>
										</div>
									</div>
								</Card>
							)}

							{/* Price Estimate */}
							{availabilityIssues.length === 0 &&
								estimatedPrice && (
									<Card className='p-8 bg-linear-to-br from-primary/10 to-primary/5 border-primary/20'>
										<div className='flex items-center justify-between'>
											<div>
												<p className='text-sm font-mono uppercase tracking-wide text-muted-foreground mb-2'>
													Estimated Total
												</p>
												<p className='text-4xl font-bold font-mono text-primary mb-2'>
													AED{' '}
													{estimatedPrice.toLocaleString(
														undefined,
														{
															minimumFractionDigits: 2,
															maximumFractionDigits: 2,
														}
													)}
												</p>
												<p className='text-xs text-muted-foreground font-mono'>
													Based on{' '}
													{totalVolume.toFixed(2)} m³
													• {formData.venue_city},{' '}
													{formData.venue_country}
												</p>
											</div>
											<Cuboid className='h-16 w-16 text-primary/30' />
										</div>
										<div className='mt-6 pt-6 border-t border-primary/10'>
											<div className='flex items-start gap-3'>
												<AlertCircle className='h-5 w-5 text-primary shrink-0 mt-0.5' />
												<p className='text-xs text-muted-foreground leading-relaxed'>
													This is an estimate based on
													standard logistics pricing.
													The final price will be
													provided after our team
													reviews your order and
													logistics requirements.
												</p>
											</div>
										</div>
									</Card>
								)}

							{/* No Pricing Tier Note */}
							{availabilityIssues.length === 0 &&
								!estimatedPrice &&
								formData.venue_country &&
								formData.venue_city && (
									<Card className='p-6 bg-muted/30 border-border'>
										<div className='flex items-start gap-3'>
											<AlertCircle className='h-5 w-5 text-muted-foreground shrink-0 mt-0.5' />
											<div className='flex-1'>
												<p className='text-sm font-medium mb-1'>
													Custom Quote Required
												</p>
												<p className='text-xs text-muted-foreground leading-relaxed'>
													No standard pricing
													available for{' '}
													{formData.venue_city},{' '}
													{formData.venue_country}. You
													will receive a custom quote
													via email within 24-48 hours
													after submitting your order.
												</p>
											</div>
										</div>
									</Card>
								)}
						</motion.div>
					)}
				</AnimatePresence>

				{/* Navigation Buttons */}
				<div className='flex items-center justify-between gap-4 mt-10'>
					<Button
						variant='outline'
						onClick={handleBack}
						disabled={currentStepIndex === 0}
						className='gap-2 font-mono'
						size='lg'
					>
						<ChevronLeft className='h-4 w-4' />
						Back
					</Button>

					<div className='text-sm text-muted-foreground font-mono'>
						Step {currentStepIndex + 1} of {STEPS.length}
					</div>

					{currentStep === 'review' ? (
						<Button
							onClick={handleSubmit}
							disabled={isSubmitting}
							className='gap-2 font-mono uppercase tracking-wide'
							size='lg'
						>
							{isSubmitting ? 'Submitting...' : 'Submit Order'}
							<Check className='h-4 w-4' />
						</Button>
					) : (
						<Button
							onClick={handleNext}
							disabled={!canProceed()}
							className='gap-2 font-mono'
							size='lg'
						>
							Continue
							<ChevronRight className='h-4 w-4' />
						</Button>
					)}
				</div>
			</div>
		</div>
	)
}

export default function CheckoutPage() {
	return (
		<ClientNav>
			<CheckoutPageInner />
		</ClientNav>
	)
}
