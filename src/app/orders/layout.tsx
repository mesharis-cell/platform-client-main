/**
 * Orders Layout
 *
 * Force dynamic rendering for all order pages to prevent static generation issues
 */

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function OrdersLayout({ children }: { children: React.ReactNode }) {
	return children;
}
