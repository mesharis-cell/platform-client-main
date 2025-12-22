/**
 * Catalog Layout
 *
 * Force dynamic rendering for catalog pages to prevent static generation issues
 */

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function CatalogLayout({ children }: { children: React.ReactNode }) {
	return children;
}
