'use client'

/**
 * Redesigned Catalog Page - Industrial Luxury Aesthetic
 *
 * Design Direction: Warehouse precision meets e-commerce elegance
 * - Clean, spacious layouts
 * - Smooth micro-interactions
 * - Real-time availability feedback
 * - Intuitive add-to-cart experience
 */

import { useState } from 'react'
import { useCatalog } from '@/hooks/use-catalog'
import { useBrands } from '@/hooks/use-brands'
import { useCart } from '@/contexts/cart-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import {
	Search,
	Package,
	Layers,
	Grid3x3,
	List,
	X,
	CheckCircle,
	AlertCircle,
	XCircle,
	Tag,
	Plus,
	Minus,
	ShoppingCart,
	Cuboid,
} from 'lucide-react'
import Image from 'next/image'
import type {
	CatalogAssetItem,
	CatalogCollectionItem,
} from '@/types/collection'
import { ClientNav } from '@/components/client-nav'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { CollectionItemsList } from '@/components/catalog/collection-items-list'
import { cn } from '@/lib/utils'

function CatalogPageInner() {
	const [searchQuery, setSearchQuery] = useState('')
	const [selectedBrand, setSelectedBrand] = useState<string>('')
	const [selectedCategory, setSelectedCategory] = useState<string>('')
	const [viewType, setViewType] = useState<'asset' | 'collection' | 'all'>(
		'all'
	)
	const [layoutMode, setLayoutMode] = useState<'grid' | 'list'>('grid')
	const [selectedItem, setSelectedItem] = useState<
		CatalogAssetItem | CatalogCollectionItem | null
	>(null)
	const [selectedQuantity, setSelectedQuantity] = useState(1)

	const { addItem, openCart } = useCart()

	// Fetch catalog data
	const { data: catalogData, isLoading } = useCatalog({
		search_term: searchQuery || undefined,
		brand:
			selectedBrand && selectedBrand !== '_all_'
				? selectedBrand
				: undefined,
		category:
			selectedCategory && selectedCategory !== '_all_'
				? selectedCategory
				: undefined,
		type: viewType,
		limit: 100,
	})

	console.log('catalogData........', catalogData);


	const { data: brandsData } = useBrands({ limit: '100' })

	const items = catalogData?.items || []
	const brands = brandsData?.brands || []

	// Extract unique categories
	const categories = Array.from(
		new Set(items.map(item => item.category).filter(Boolean) as string[])
	).sort()

	const clearFilters = () => {
		setSearchQuery('')
		setSelectedBrand('')
		setSelectedCategory('')
		setViewType('all')
	}

	const hasActiveFilters =
		searchQuery || selectedBrand || selectedCategory || viewType !== 'all'

	const handleAddToCart = async (
		item: CatalogAssetItem,
		quantity: number = 1
	) => {
		if (item.availableQuantity < quantity) {
			toast.error('Not enough quantity available')
			return
		}

		addItem(item.id, quantity, {
			assetName: item.name,
			availableQuantity: item.availableQuantity,
			volume: Number(item.volume),
			weight: Number(item.weight),
			dimensionLength: Number(item.dimensionLength),
			dimensionWidth: Number(item.dimensionWidth),
			dimensionHeight: Number(item.dimensionHeight),
			category: item.category,
			image: item.images[0],
		})
	}

	const handleAddCollectionToCart = async (
		collection: CatalogCollectionItem
	) => {
		// For now, open detail modal to show collection contents
		// User can then add entire collection from there
		setSelectedItem(collection)
	}

	return (
		<div className='min-h-screen bg-background'>
			{/* Enhanced Hero Header */}
			<div className='relative border-b border-border overflow-hidden bg-gradient-to-br from-background via-muted/20 to-background'>
				{/* Animated grid pattern */}
				<div
					className='absolute inset-0 opacity-[0.03]'
					style={{
						backgroundImage: `
              linear-gradient(hsl(var(--primary)) 1px, transparent 1px),
              linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)
            `,
						backgroundSize: '60px 60px',
						animation: 'grid-scroll 20s linear infinite',
					}}
				/>

				<div className='relative max-w-7xl mx-auto px-8 py-12'>
					<div className='max-w-3xl'>
						{/* Category Badge */}
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							className='inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6 border border-primary/20'
						>
							<Cuboid className='w-4 h-4' />
							<span className='font-mono uppercase tracking-wide'>
								Asset Catalog
							</span>
						</motion.div>

						{/* Title */}
						<motion.h1
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.1 }}
							className='text-5xl md:text-6xl font-bold tracking-tight mb-4'
						>
							Build Your
							<span className='block text-primary mt-1'>
								Event Setup
							</span>
						</motion.h1>

						{/* Description */}
						<motion.p
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.2 }}
							className='text-base text-muted-foreground max-w-2xl leading-relaxed'
						>
							Browse premium event assets from furniture to
							glassware. Select individual pieces or complete
							collections.
						</motion.p>

						{/* Quick Stats */}
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.3 }}
							className='flex items-center gap-6 mt-8 text-sm text-muted-foreground font-mono'
						>
							<div className='flex items-center gap-2'>
								<Package className='h-4 w-4 text-primary' />
								<span>
									{
										items.filter(i => i.type === 'asset')
											.length
									}{' '}
									Assets
								</span>
							</div>
							<div className='flex items-center gap-2'>
								<Layers className='h-4 w-4 text-primary' />
								<span>
									{
										items.filter(
											i => i.type === 'collection'
										).length
									}{' '}
									Collections
								</span>
							</div>
						</motion.div>
					</div>
				</div>

				<style jsx>{`
					@keyframes grid-scroll {
						0% {
							background-position: 0 0;
						}
						100% {
							background-position: 60px 60px;
						}
					}
				`}</style>
			</div>

			<div className='max-w-7xl mx-auto px-8 py-10'>
				{/* Search and Filters - Enhanced */}
				<div className='mb-10 space-y-6'>
					{/* Search Bar */}
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.4 }}
						className='relative max-w-2xl'
					>
						<div className='absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none'>
							<Search className='w-5 h-5 text-muted-foreground' />
						</div>
						<Input
							placeholder='Search assets, collections, categories...'
							value={searchQuery}
							onChange={e => setSearchQuery(e.target.value)}
							className='pl-12 h-12 text-base bg-card/50 backdrop-blur-sm border-border/50 focus:border-primary/50 transition-colors'
						/>
						{searchQuery && (
							<button
								onClick={() => setSearchQuery('')}
								className='absolute inset-y-0 right-0 flex items-center pr-4 text-muted-foreground hover:text-foreground transition-colors'
							>
								<X className='w-4 h-4' />
							</button>
						)}
					</motion.div>

					{/* Filter Bar */}
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.5 }}
						className='flex flex-wrap items-center gap-3'
					>
						{/* View Type Tabs */}
						<Tabs
							value={viewType}
							onValueChange={value =>
								setViewType(value as typeof viewType)
							}
						>
							<TabsList className='bg-muted/50 border border-border'>
								<TabsTrigger
									value='all'
									className='gap-2 font-mono data-[state=active]:bg-primary data-[state=active]:text-primary-foreground'
								>
									<Grid3x3 className='w-4 h-4' />
									All
								</TabsTrigger>
								<TabsTrigger
									value='asset'
									className='gap-2 font-mono data-[state=active]:bg-primary data-[state=active]:text-primary-foreground'
								>
									<Package className='w-4 h-4' />
									Assets
								</TabsTrigger>
								<TabsTrigger
									value='collection'
									className='gap-2 font-mono data-[state=active]:bg-primary data-[state=active]:text-primary-foreground'
								>
									<Layers className='w-4 h-4' />
									Collections
								</TabsTrigger>
							</TabsList>
						</Tabs>

						<div className='h-8 w-px bg-border' />

						{/* Brand Filter */}
						<Select
							value={selectedBrand}
							onValueChange={setSelectedBrand}
						>
							<SelectTrigger className='w-[200px] bg-card/50 border-border/50 font-mono'>
								<SelectValue placeholder='All brands' />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value='_all_'>
									All brands
								</SelectItem>
								{brands.map(brand => (
									<SelectItem
										key={brand.id}
										value={brand.id}
										className='font-mono'
									>
										{brand.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>

						{/* Category Filter */}
						<Select
							value={selectedCategory}
							onValueChange={setSelectedCategory}
						>
							<SelectTrigger className='w-[200px] bg-card/50 border-border/50 font-mono'>
								<SelectValue placeholder='All categories' />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value='_all_'>
									All categories
								</SelectItem>
								{categories.map(category => (
									<SelectItem
										key={category}
										value={category}
										className='font-mono'
									>
										{category}
									</SelectItem>
								))}
							</SelectContent>
						</Select>

						{hasActiveFilters && (
							<Button
								variant='ghost'
								size='sm'
								onClick={clearFilters}
								className='gap-2 text-muted-foreground hover:text-foreground font-mono'
							>
								<X className='w-4 h-4' />
								Clear
							</Button>
						)}

						<div className='flex-1' />

						{/* Layout Toggle */}
						<div className='flex border border-border/50 rounded-lg p-1 bg-card/50'>
							<button
								onClick={() => setLayoutMode('grid')}
								className={`p-2 rounded transition-all ${layoutMode === 'grid'
									? 'bg-primary text-primary-foreground shadow-sm'
									: 'hover:bg-muted text-muted-foreground'
									}`}
							>
								<Grid3x3 className='w-4 h-4' />
							</button>
							<button
								onClick={() => setLayoutMode('list')}
								className={`p-2 rounded transition-all ${layoutMode === 'list'
									? 'bg-primary text-primary-foreground shadow-sm'
									: 'hover:bg-muted text-muted-foreground'
									}`}
							>
								<List className='w-4 h-4' />
							</button>
						</div>
					</motion.div>
				</div>

				{/* Results */}
				{isLoading ? (
					<div
						className={
							layoutMode === 'grid'
								? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
								: 'space-y-4'
						}
					>
						{[...Array(6)].map((_, i) => (
							<Card
								key={i}
								className='overflow-hidden bg-card/50 border-border/50'
							>
								<div className='aspect-[4/3] bg-muted/50 animate-pulse' />
								<CardContent className='p-6 space-y-3'>
									<div className='h-6 bg-muted/50 rounded animate-pulse' />
									<div className='h-4 bg-muted/50 rounded w-2/3 animate-pulse' />
								</CardContent>
							</Card>
						))}
					</div>
				) : items.length === 0 ? (
					<Card className='p-20 text-center bg-card/50 border-border/50'>
						<div className='inline-flex items-center justify-center w-24 h-24 rounded-full bg-muted/50 mb-6'>
							<Search className='w-12 h-12 text-muted-foreground/50' />
						</div>
						<h3 className='text-2xl font-bold mb-3 text-foreground'>
							No items found
						</h3>
						<p className='text-muted-foreground mb-8 max-w-md mx-auto'>
							Try adjusting your search or filters to discover
							available assets
						</p>
						{hasActiveFilters && (
							<Button
								onClick={clearFilters}
								variant='outline'
								className='font-mono'
							>
								<X className='w-4 h-4 mr-2' />
								Clear all filters
							</Button>
						)}
					</Card>
				) : (
					<AnimatePresence mode='wait'>
						{/* Grid Layout */}
						{layoutMode === 'grid' && (
							<motion.div
								key='grid'
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								exit={{ opacity: 0 }}
								className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
							>
								{items.map((item, index) => (
									<motion.div
										key={item.id}
										initial={{ opacity: 0, y: 20 }}
										animate={{ opacity: 1, y: 0 }}
										transition={{
											delay: index * 0.05,
											duration: 0.3,
										}}
									>
										<Card className='overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer group border-border/50 bg-card/50 backdrop-blur-sm hover:border-primary/30 h-full'>
											{/* Image with Overlay */}
											<div
												className='aspect-[3/2] bg-muted relative overflow-hidden'
												onClick={() =>
													setSelectedItem(item)
												}
											>
												{item.images.length > 0 ? (
													<Image
														src={item.images[0]}
														alt={item.name}
														fill
														className='object-cover group-hover:scale-110 transition-transform duration-700'
													/>
												) : (
													<div className='absolute inset-0 flex items-center justify-center bg-gradient-to-br from-muted to-muted/50'>
														{item.type ===
															'collection' ? (
															<Layers className='w-20 h-20 text-muted-foreground/20' />
														) : (
															<Package className='w-20 h-20 text-muted-foreground/20' />
														)}
													</div>
												)}

												{/* Type Badge */}
												<div className='absolute top-3 left-3'>
													<Badge
														className={cn(
															'backdrop-blur-md bg-primary/80 border border-border/50 font-mono text-xs',
															item.type ===
															'asset' &&
															'bg-secondary',
															item.type ===
															'collection' &&
															'bg-primary'
														)}
													>
														{item.type ===
															'collection' ? (
															<>
																<Layers className='w-3 h-3 mr-1.5' />
																Collection
															</>
														) : (
															<>
																<Package className='w-3 h-3 mr-1.5' />
																Asset
															</>
														)}
													</Badge>
												</div>

												{/* Availability & Condition Badges */}
												{item.type === 'asset' && (
													<div className='absolute top-3 right-3 flex flex-col gap-2'>
														{/* Condition Badge */}
														{item.condition &&
															item.condition !==
															'GREEN' && (
																<Badge
																	variant={
																		item.condition ===
																			'RED'
																			? 'destructive'
																			: 'default'
																	}
																	className={`backdrop-blur-md border border-border/50 font-mono text-xs ${item.condition ===
																		'ORANGE'
																		? 'bg-orange-500 hover:bg-orange-600'
																		: ''
																		}`}
																>
																	{item.condition ===
																		'RED' ? (
																		<>
																			<AlertCircle className='w-3 h-3 mr-1.5' />
																			Damaged
																		</>
																	) : (
																		<>
																			<AlertCircle className='w-3 h-3 mr-1.5' />
																			Minor
																			Issues
																		</>
																	)}
																</Badge>
															)}
														{/* Availability Badge */}
														<Badge
															variant={
																item.availableQuantity >
																	0
																	? 'default'
																	: 'destructive'
															}
															className='backdrop-blur-md bg-primary border border-border/50 font-mono text-xs'
														>
															{item.availableQuantity >
																0 ? (
																<>
																	<CheckCircle className='w-3 h-3 mr-1.5' />
																	{
																		item.availableQuantity
																	}{' '}
																	Available
																</>
															) : (
																<>
																	<XCircle className='w-3 h-3 mr-1.5' />
																	Out of Stock
																</>
															)}
														</Badge>
													</div>
												)}

												{/* Item Count for Collections */}
												{item.type === 'collection' && (
													<div className='absolute bottom-3 left-3 right-3 flex justify-between items-center'>
														<Badge
															variant='secondary'
															className='backdrop-blur-md bg-background/90 border border-border/50 font-mono text-xs'
														>
															{item.itemCount}{' '}
															{item.itemCount ===
																1
																? 'item'
																: 'items'}
														</Badge>
														<Badge
															variant='outline'
															className='backdrop-blur-md bg-background/90 border border-border/50 font-mono text-xs'
														>
															Customizable
														</Badge>
													</div>
												)}

												{/* Hover Overlay with Quick Add */}
												{item.type === 'asset' &&
													item.availableQuantity >
													0 && (
														<div className='absolute inset-0 bg-gradient-to-t from-background/95 via-background/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-6'>
															<Button
																onClick={e => {
																	e.stopPropagation()
																	handleAddToCart(
																		item,
																		1
																	)
																}}
																className='font-mono uppercase tracking-wide gap-2 shadow-lg'
																size='sm'
															>
																<Plus className='w-4 h-4' />
																Quick Add
															</Button>
														</div>
													)}
											</div>

											{/* Content */}
											<CardContent className='p-4 space-y-2.5'>
												<div>
													<h3 className='text-lg font-semibold mb-2 group-hover:text-primary transition-colors line-clamp-1'>
														{item.name}
													</h3>
													{item.description && (
														<p className='text-sm text-muted-foreground line-clamp-2 leading-relaxed'>
															{item.description}
														</p>
													)}
												</div>

												{/* Tags & Condition Info */}
												<div className='space-y-2'>
													<div className='flex flex-wrap gap-2'>
														{item.brand && (
															<Badge
																variant='outline'
																className='gap-1.5 font-mono text-xs border-border/50'
															>
																<Tag className='w-3 h-3' />
																{
																	item.brand
																		.name
																}
															</Badge>
														)}
														<Badge
															variant='outline'
															className='font-mono text-xs border-border/50'
														>
															{item.category}
														</Badge>
													</div>

													{/* Refurb Estimate for Damaged Items */}
													{item.type === 'asset' &&
														item.refurbDaysEstimate && (
															<div className='text-xs text-muted-foreground font-mono bg-muted/50 px-2 py-1 rounded border border-border/30'>
																🔧 Refurb: ~
																{
																	item.refurbDaysEstimate
																}{' '}
																days
															</div>
														)}
												</div>

												{/* Dimensions (for assets) */}
												{item.type === 'asset' && (
													<div className='pt-2 mt-2 border-t border-border/30'>
														<div className='grid grid-cols-5 gap-1.5 text-xs'>
															<div className='text-center p-1.5 bg-muted/50 rounded-md border border-border/40'>
																<div className='text-[9px] text-muted-foreground uppercase font-mono mb-0.5'>
																	L
																</div>
																<div className='font-bold font-mono text-xs'>
																	{Number(
																		item.dimensionLength
																	).toFixed(
																		0
																	)}
																</div>
																<div className='text-[8px] text-muted-foreground'>
																	cm
																</div>
															</div>
															<div className='text-center p-1.5 bg-muted/50 rounded-md border border-border/40'>
																<div className='text-[9px] text-muted-foreground uppercase font-mono mb-0.5'>
																	W
																</div>
																<div className='font-bold font-mono text-xs'>
																	{Number(
																		item.dimensionWidth
																	).toFixed(
																		0
																	)}
																</div>
																<div className='text-[8px] text-muted-foreground'>
																	cm
																</div>
															</div>
															<div className='text-center p-1.5 bg-muted/50 rounded-md border border-border/40'>
																<div className='text-[9px] text-muted-foreground uppercase font-mono mb-0.5'>
																	H
																</div>
																<div className='font-bold font-mono text-xs'>
																	{Number(
																		item.dimensionHeight
																	).toFixed(
																		0
																	)}
																</div>
																<div className='text-[8px] text-muted-foreground'>
																	cm
																</div>
															</div>
															<div className='text-center p-1.5 bg-primary/10 rounded-md border border-primary/30'>
																<div className='text-[9px] text-muted-foreground uppercase font-mono mb-0.5'>
																	WT
																</div>
																<div className='font-bold font-mono text-xs text-primary'>
																	{Number(
																		item.weight
																	).toFixed(
																		1
																	)}
																</div>
																<div className='text-[8px] text-primary/70'>
																	kg
																</div>
															</div>
															<div className='text-center p-1.5 bg-secondary/10 rounded-md border border-secondary/30'>
																<div className='text-[9px] text-muted-foreground uppercase font-mono mb-0.5'>
																	VOL
																</div>
																<div className='font-bold font-mono text-xs text-secondary'>
																	{Number(
																		item.volume
																	).toFixed(
																		2
																	)}
																</div>
																<div className='text-[8px] text-secondary/70'>
																	m³
																</div>
															</div>
														</div>
													</div>
												)}

												{/* Actions */}
												<div className='pt-2'>
													{item.type === 'asset' ? (
														item.availableQuantity >
															0 ? (
															<Button
																onClick={e => {
																	e.stopPropagation()
																	setSelectedItem(
																		item
																	)
																}}
																variant='outline'
																className='w-full gap-2 font-mono hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all'
															>
																<ShoppingCart className='w-4 h-4' />
																Add to Cart
															</Button>
														) : (
															<Button
																disabled
																variant='outline'
																className='w-full gap-2 font-mono'
															>
																<XCircle className='w-4 h-4' />
																Out of Stock
															</Button>
														)
													) : (
														<Button
															onClick={e => {
																e.stopPropagation()
																setSelectedItem(
																	item
																)
															}}
															variant='outline'
															className='w-full gap-2 font-mono hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all'
														>
															<Layers className='w-4 h-4' />
															View Collection
														</Button>
													)}
												</div>
											</CardContent>
										</Card>
									</motion.div>
								))}
							</motion.div>
						)}

						{/* List Layout */}
						{layoutMode === 'list' && (
							<motion.div
								key='list'
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								exit={{ opacity: 0 }}
								className='space-y-4'
							>
								{items.map((item, index) => (
									<motion.div
										key={item.id}
										initial={{ opacity: 0, x: -20 }}
										animate={{ opacity: 1, x: 0 }}
										transition={{
											delay: index * 0.05,
											duration: 0.3,
										}}
									>
										<Card className='overflow-hidden hover:shadow-lg transition-all cursor-pointer group border-border/50 bg-card/50 backdrop-blur-sm hover:border-primary/30'>
											<CardContent className='p-6'>
												<div className='flex gap-6'>
													{/* Thumbnail */}
													<div
														className='w-40 h-40 rounded-lg overflow-hidden border border-border flex-shrink-0 bg-muted cursor-pointer'
														onClick={() =>
															setSelectedItem(
																item
															)
														}
													>
														{item.images.length >
															0 ? (
															<Image
																src={
																	item
																		.images[0]
																}
																alt={item.name}
																width={160}
																height={160}
																className='object-cover w-full h-full group-hover:scale-110 transition-transform duration-700'
															/>
														) : (
															<div className='w-full h-full bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center'>
																{item.type ===
																	'collection' ? (
																	<Layers className='w-16 h-16 text-muted-foreground/20' />
																) : (
																	<Package className='w-16 h-16 text-muted-foreground/20' />
																)}
															</div>
														)}
													</div>

													{/* Details */}
													<div className='flex-1 flex flex-col'>
														<div className='flex-1'>
															<div className='flex items-start justify-between mb-3'>
																<div className='flex-1 min-w-0'>
																	<h3
																		className='text-2xl font-bold mb-2 group-hover:text-primary transition-colors cursor-pointer'
																		onClick={() =>
																			setSelectedItem(
																				item
																			)
																		}
																	>
																		{
																			item.name
																		}
																	</h3>
																	{item.description && (
																		<p className='text-sm text-muted-foreground line-clamp-2 max-w-2xl leading-relaxed'>
																			{
																				item.description
																			}
																		</p>
																	)}
																</div>

																<Badge
																	variant={
																		item.type ===
																			'collection'
																			? 'default'
																			: 'secondary'
																	}
																	className='ml-4 font-mono'
																>
																	{item.type ===
																		'collection' ? (
																		<>
																			<Layers className='w-3 h-3 mr-1.5' />
																			Collection
																		</>
																	) : (
																		<>
																			<Package className='w-3 h-3 mr-1.5' />
																			Asset
																		</>
																	)}
																</Badge>
															</div>

															{/* Tags and Specs */}
															<div className='space-y-3 mt-4'>
																<div className='flex flex-wrap items-center gap-2'>
																	{item.brand && (
																		<Badge
																			variant='outline'
																			className='gap-1.5 font-mono border-border/50'
																		>
																			<Tag className='w-3 h-3' />
																			{
																				item
																					.brand
																					.name
																			}
																		</Badge>
																	)}
																	<Badge
																		variant='outline'
																		className='font-mono border-border/50'
																	>
																		{
																			item.category
																		}
																	</Badge>

																	{item.type ===
																		'asset' ? (
																		<Badge
																			variant={
																				item.availableQuantity >
																					0
																					? 'default'
																					: 'destructive'
																			}
																			className='font-mono'
																		>
																			{item.availableQuantity >
																				0 ? (
																				<>
																					<CheckCircle className='w-3 h-3 mr-1.5' />
																					{
																						item.availableQuantity
																					}{' '}
																					Available
																				</>
																			) : (
																				<>
																					<XCircle className='w-3 h-3 mr-1.5' />
																					Out
																					of
																					Stock
																				</>
																			)}
																		</Badge>
																	) : (
																		<Badge
																			variant='secondary'
																			className='font-mono'
																		>
																			{
																				item.itemCount
																			}{' '}
																			{item.itemCount ===
																				1
																				? 'item'
																				: 'items'}
																		</Badge>
																	)}
																</div>

																{/* Dimensions Grid (for assets) */}
																{item.type ===
																	'asset' && (
																		<div className='grid grid-cols-5 gap-2 max-w-md'>
																			<div className='text-center p-2 bg-muted/50 rounded border border-border/30'>
																				<div className='text-xs text-muted-foreground uppercase font-mono mb-0.5'>
																					Length
																				</div>
																				<div className='font-bold font-mono text-sm'>
																					{Number(
																						item.dimensionLength
																					).toFixed(
																						0
																					)}{' '}
																					cm
																				</div>
																			</div>
																			<div className='text-center p-2 bg-muted/50 rounded border border-border/30'>
																				<div className='text-xs text-muted-foreground uppercase font-mono mb-0.5'>
																					Width
																				</div>
																				<div className='font-bold font-mono text-sm'>
																					{Number(
																						item.dimensionWidth
																					).toFixed(
																						0
																					)}{' '}
																					cm
																				</div>
																			</div>
																			<div className='text-center p-2 bg-muted/50 rounded border border-border/30'>
																				<div className='text-xs text-muted-foreground uppercase font-mono mb-0.5'>
																					Height
																				</div>
																				<div className='font-bold font-mono text-sm'>
																					{Number(
																						item.dimensionHeight
																					).toFixed(
																						0
																					)}{' '}
																					cm
																				</div>
																			</div>
																			<div className='text-center p-2 bg-primary/10 rounded border border-primary/20'>
																				<div className='text-xs text-muted-foreground uppercase font-mono mb-0.5'>
																					Weight
																				</div>
																				<div className='font-bold font-mono text-sm text-primary'>
																					{Number(
																						item.weight
																					).toFixed(
																						1
																					)}{' '}
																					kg
																				</div>
																			</div>
																			<div className='text-center p-2 bg-secondary/10 rounded border border-secondary/20'>
																				<div className='text-xs text-muted-foreground uppercase font-mono mb-0.5'>
																					Volume
																				</div>
																				<div className='font-bold font-mono text-sm text-secondary'>
																					{Number(
																						item.volume
																					).toFixed(
																						2
																					)}{' '}
																					m³
																				</div>
																			</div>
																		</div>
																	)}
															</div>
														</div>

														{/* Action Button */}
														<div className='mt-4 flex gap-3'>
															<Button
																onClick={() =>
																	setSelectedItem(
																		item
																	)
																}
																variant='outline'
																className='flex-1 gap-2 font-mono'
															>
																View Details
															</Button>
															{item.type ===
																'asset' &&
																item.availableQuantity >
																0 && (
																	<Button
																		onClick={e => {
																			e.stopPropagation()
																			handleAddToCart(
																				item,
																				1
																			)
																		}}
																		className='gap-2 font-mono'
																	>
																		<Plus className='w-4 h-4' />
																		Add to
																		Cart
																	</Button>
																)}
														</div>
													</div>
												</div>
											</CardContent>
										</Card>
									</motion.div>
								))}
							</motion.div>
						)}
					</AnimatePresence>
				)}

				{/* Results Count */}
				{items.length > 0 && (
					<div className='mt-10 text-center'>
						<p className='text-sm text-muted-foreground font-mono'>
							Showing{' '}
							<span className='font-bold text-foreground'>
								{items.length}
							</span>{' '}
							{items.length === 1 ? 'item' : 'items'}
						</p>
					</div>
				)}
			</div>

			{/* Enhanced Detail Modal */}
			<Dialog
				open={!!selectedItem}
				onOpenChange={() => {
					setSelectedItem(null)
					setSelectedQuantity(1)
				}}
			>
				<DialogContent className='max-w-5xl max-h-[90vh] overflow-hidden flex flex-col bg-card border-border'>
					{selectedItem && (
						<>
							<DialogHeader>
								<div className='flex items-start justify-between gap-4'>
									<div className='flex-1'>
										<DialogTitle className='text-3xl font-bold mb-2'>
											{selectedItem.name}
										</DialogTitle>
										<div className='flex flex-wrap gap-2'>
											<Badge
												variant={
													selectedItem.type ===
														'collection'
														? 'default'
														: 'secondary'
												}
												className='font-mono'
											>
												{selectedItem.type ===
													'collection' ? (
													<>
														<Layers className='w-3 h-3 mr-1.5' />
														Collection
													</>
												) : (
													<>
														<Package className='w-3 h-3 mr-1.5' />
														Asset
													</>
												)}
											</Badge>

											{/* Condition Badge for Assets */}
											{selectedItem.type === 'asset' &&
												selectedItem.condition &&
												selectedItem.condition !==
												'GREEN' && (
													<Badge
														variant={
															selectedItem.condition ===
																'RED'
																? 'destructive'
																: 'default'
														}
														className={`font-mono ${selectedItem.condition ===
															'ORANGE'
															? 'bg-orange-500 hover:bg-orange-600'
															: ''
															}`}
													>
														{selectedItem.condition ===
															'RED' ? (
															<>
																<AlertCircle className='w-3 h-3 mr-1.5' />
																Damaged
															</>
														) : (
															<>
																<AlertCircle className='w-3 h-3 mr-1.5' />
																Minor Issues
															</>
														)}
													</Badge>
												)}

											{selectedItem.brand && (
												<Badge
													variant='outline'
													className='gap-1.5 font-mono'
												>
													<Tag className='w-3 h-3' />
													{selectedItem.brand.name}
												</Badge>
											)}
											<Badge
												variant='outline'
												className='font-mono'
											>
												{selectedItem.category}
											</Badge>
										</div>
									</div>
								</div>
							</DialogHeader>

							<div className='flex-1 overflow-y-auto py-6 space-y-6'>
								{/* Images Gallery */}
								{selectedItem.images.length > 0 && (
									<div className='grid grid-cols-2 gap-4'>
										{selectedItem.images
											.slice(0, 4)
											.map((image, index) => (
												<div
													key={index}
													className={`rounded-lg overflow-hidden border border-border relative ${index === 0 &&
														selectedItem.images
															.length > 1
														? 'col-span-2 aspect-[21/9]'
														: 'aspect-square'
														}`}
												>
													<Image
														src={image}
														alt={`${selectedItem.name} ${index + 1}`}
														fill
														className='object-cover'
													/>
												</div>
											))}
									</div>
								)}

								{/* Description */}
								{selectedItem.description && (
									<div>
										<h3 className='text-sm font-semibold mb-2 uppercase tracking-wide text-muted-foreground font-mono'>
											Description
										</h3>
										<p className='text-muted-foreground leading-relaxed'>
											{selectedItem.description}
										</p>
									</div>
								)}

								{/* Specifications */}
								{selectedItem.type === 'asset' && (
									<div className='space-y-4'>
										<div>
											<h4 className='text-xs font-semibold mb-3 uppercase tracking-wide text-muted-foreground font-mono'>
												Physical Dimensions
											</h4>
											<div className='grid grid-cols-3 md:grid-cols-5 gap-3'>
												<div className='bg-muted/50 rounded-lg p-4 border border-border/50'>
													<p className='text-xs font-mono text-muted-foreground uppercase tracking-wide mb-1'>
														Length
													</p>
													<p className='text-xl font-bold font-mono'>
														{Number(
															selectedItem.dimensionLength
														).toFixed(1)}{' '}
														<span className='text-sm text-muted-foreground'>
															cm
														</span>
													</p>
												</div>
												<div className='bg-muted/50 rounded-lg p-4 border border-border/50'>
													<p className='text-xs font-mono text-muted-foreground uppercase tracking-wide mb-1'>
														Width
													</p>
													<p className='text-xl font-bold font-mono'>
														{Number(
															selectedItem.dimensionWidth
														).toFixed(1)}{' '}
														<span className='text-sm text-muted-foreground'>
															cm
														</span>
													</p>
												</div>
												<div className='bg-muted/50 rounded-lg p-4 border border-border/50'>
													<p className='text-xs font-mono text-muted-foreground uppercase tracking-wide mb-1'>
														Height
													</p>
													<p className='text-xl font-bold font-mono'>
														{Number(
															selectedItem.dimensionHeight
														).toFixed(1)}{' '}
														<span className='text-sm text-muted-foreground'>
															cm
														</span>
													</p>
												</div>
												<div className='bg-primary/10 rounded-lg p-4 border border-primary/20'>
													<p className='text-xs font-mono text-muted-foreground uppercase tracking-wide mb-1'>
														Weight
													</p>
													<p className='text-xl font-bold font-mono text-primary'>
														{Number(
															selectedItem.weight
														).toFixed(1)}{' '}
														<span className='text-sm'>
															kg
														</span>
													</p>
												</div>
												<div className='bg-secondary/10 rounded-lg p-4 border border-secondary/20'>
													<p className='text-xs font-mono text-muted-foreground uppercase tracking-wide mb-1'>
														Volume
													</p>
													<p className='text-xl font-bold font-mono text-secondary'>
														{Number(
															selectedItem.volume
														).toFixed(3)}{' '}
														<span className='text-sm'>
															m³
														</span>
													</p>
												</div>
											</div>
										</div>

										<div>
											<h4 className='text-xs font-semibold mb-3 uppercase tracking-wide text-muted-foreground font-mono'>
												Availability & Condition
											</h4>
											<div className='grid grid-cols-2 gap-3'>
												<div className='bg-muted/30 rounded-lg p-4 border border-border/50'>
													<p className='text-xs font-mono text-muted-foreground uppercase tracking-wide mb-1'>
														Available
													</p>
													<p className='text-xl font-bold font-mono'>
														{
															selectedItem.availableQuantity
														}
													</p>
												</div>
												<div className='bg-muted/30 rounded-lg p-4 border border-border/50'>
													<p className='text-xs font-mono text-muted-foreground uppercase tracking-wide mb-1'>
														Total Stock
													</p>
													<p className='text-xl font-bold font-mono'>
														{
															selectedItem.totalQuantity
														}
													</p>
												</div>

												{/* Refurb Estimate for Damaged Items */}
												{selectedItem.refurbDaysEstimate &&
													(selectedItem.condition ===
														'ORANGE' ||
														selectedItem.condition ===
														'RED') && (
														<div className='col-span-2 bg-amber-500/10 rounded-lg p-4 border border-amber-500/20'>
															<p className='text-xs font-mono text-muted-foreground uppercase tracking-wide mb-1'>
																Estimated Refurb
																Time
															</p>
															<p className='text-xl font-bold font-mono text-amber-600'>
																~
																{
																	selectedItem.refurbDaysEstimate
																}{' '}
																days
															</p>
															<p className='text-xs font-mono text-muted-foreground mt-2'>
																This item
																requires
																refurbishment.
																Factor this time
																into your event
																planning.
															</p>
														</div>
													)}
											</div>
										</div>
									</div>
								)}

								{selectedItem.type === 'collection' && (
									<div>
										<h3 className='text-sm font-semibold mb-4 uppercase tracking-wide text-muted-foreground font-mono'>
											Collection Contents (
											{selectedItem.itemCount} items)
										</h3>
										<CollectionItemsList
											collectionId={selectedItem.id}
										/>
									</div>
								)}
							</div>

							{/* Footer Actions */}
							{selectedItem.type === 'asset' &&
								selectedItem.availableQuantity > 0 && (
									<div className='border-t border-border pt-6 space-y-4'>
										{/* Quantity Selector */}
										<div className='flex items-center gap-4'>
											<label className='text-sm font-medium font-mono uppercase tracking-wide'>
												Quantity
											</label>
											<div className='flex items-center border border-border rounded-lg overflow-hidden'>
												<Button
													variant='ghost'
													size='sm'
													onClick={() =>
														setSelectedQuantity(
															Math.max(
																1,
																selectedQuantity -
																1
															)
														)
													}
													className='h-10 w-10 p-0 rounded-none border-r border-border'
												>
													<Minus className='h-4 w-4' />
												</Button>
												<div className='px-6 font-mono text-lg font-bold min-w-[4ch] text-center'>
													{selectedQuantity}
												</div>
												<Button
													variant='ghost'
													size='sm'
													onClick={() =>
														setSelectedQuantity(
															Math.min(
																selectedItem.availableQuantity,
																selectedQuantity +
																1
															)
														)
													}
													disabled={
														selectedQuantity >=
														selectedItem.availableQuantity
													}
													className='h-10 w-10 p-0 rounded-none border-l border-border'
												>
													<Plus className='h-4 w-4' />
												</Button>
											</div>
											<span className='text-sm text-muted-foreground font-mono'>
												of{' '}
												{selectedItem.availableQuantity}{' '}
												available
											</span>
										</div>

										{/* Add to Cart Button */}
										<Button
											onClick={() => {
												handleAddToCart(
													selectedItem as CatalogAssetItem,
													selectedQuantity
												)
												setSelectedItem(null)
												setSelectedQuantity(1)
											}}
											className='w-full h-14 gap-2 font-mono uppercase tracking-wide text-base'
											size='lg'
										>
											<ShoppingCart className='w-5 h-5' />
											Add {selectedQuantity} to Cart
										</Button>
									</div>
								)}
						</>
					)}
				</DialogContent>
			</Dialog>
		</div>
	)
}

export default function CatalogPage() {
	return (
		<ClientNav>
			<CatalogPageInner />
		</ClientNav>
	)
}
