/**
 * Company Back Office Layout
 *
 * Force dynamic rendering for all company-office pages (auth + permission
 * gated, never statically generated). The per-section permission gate lives
 * in CompanyGate, applied inside each page alongside ClientNav.
 */

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function CompanyLayout({ children }: { children: React.ReactNode }) {
    return children;
}
