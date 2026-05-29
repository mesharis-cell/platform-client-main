import { User } from "@/types/auth";

/**
 * The persisted client user comes from the API login response, which is
 * snake_case (`is_active`), while the `User` type models `isActive`. Accept
 * EITHER, and treat a missing flag as active — the API only issues a session
 * for an active user, so absence means "field not present", not "inactive".
 *
 * Load-bearing: `hasPermission` previously read only `user.isActive`, which is
 * `undefined` on the real localStorage object, so EVERY permission check
 * returned false. The Company Back Office gate depends on this working.
 */
export function isUserActive(user: User | null): user is User {
    if (!user) return false;
    const active =
        (user as { isActive?: boolean; is_active?: boolean }).isActive ??
        (user as { is_active?: boolean }).is_active;
    return active !== false;
}

/**
 * Check if user has a specific permission
 * Supports wildcard permissions (e.g., "users:*" matches "users:create", "users:read", etc.)
 */
export function hasPermission(user: User | null, requiredPermission: string): boolean {
    if (!isUserActive(user)) return false;

    // Check for exact permission match
    if (user.permissions.includes(requiredPermission)) return true;

    // Check for wildcard permissions
    const [resource, action] = requiredPermission.split(":");
    if (action && user.permissions.includes(`${resource}:*`)) return true;

    return false;
}

/**
 * Check if user has ALL of the specified permissions
 */
export function hasAllPermissions(user: User | null, requiredPermissions: string[]): boolean {
    if (!isUserActive(user)) return false;
    return requiredPermissions.every((permission) => hasPermission(user, permission));
}

/**
 * Check if user has ANY of the specified permissions
 */
export function hasAnyPermission(user: User | null, requiredPermissions: string[]): boolean {
    if (!isUserActive(user)) return false;
    return requiredPermissions.some((permission) => hasPermission(user, permission));
}

/**
 * Check if user has access to a specific company
 */
export function hasCompanyAccess(user: User | null, companyId: string): boolean {
    if (!isUserActive(user)) return false;

    // Check for wildcard access (all companies)
    if (user.companies.includes("*")) return true;

    // Check for specific company access
    return user.companies.includes(companyId);
}

/**
 * Get list of company IDs user has access to
 * Returns null if user has access to all companies (wildcard)
 */
export function getUserCompanyScope(user: User | null): string[] | null {
    if (!isUserActive(user)) return [];

    // Wildcard access
    if (user.companies.includes("*")) return null;

    return user.companies;
}

/**
 * Filter query by user's company scope
 * Returns company filter for SQL WHERE clause
 */
export function getCompanyScopeFilter(user: User | null): {
    type: "all" | "specific" | "none";
    companyIds?: string[];
} {
    if (!isUserActive(user)) {
        return { type: "none" };
    }

    if (user.companies.includes("*")) {
        return { type: "all" };
    }

    return {
        type: "specific",
        companyIds: user.companies,
    };
}
