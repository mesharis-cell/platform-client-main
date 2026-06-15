/**
 * Self-Pickups Layout
 *
 * Force dynamic rendering for all self-pickup pages to prevent static-generation
 * issues — the detail page reads useSearchParams (?company=1), which fails the
 * production build without a force-dynamic boundary (mirrors orders/layout.tsx).
 */

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function SelfPickupsLayout({ children }: { children: React.ReactNode }) {
    return children;
}
