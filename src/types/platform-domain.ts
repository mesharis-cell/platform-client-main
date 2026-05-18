export interface PlatformDomain {
    platform_id: string;
    company_id: string;
    company_name: string;
    logo_url: string;
    primary_color: string;
    secondary_color: string;
    currency: string;
    features?: Record<string, boolean>;
    platform_features?: Record<string, boolean>;
    company_features?: Record<string, boolean>;
    maintenance?: {
        enabled: boolean;
        raw_enabled: boolean;
        message: string | null;
        until: string | null;
        updated_at: string | null;
        updated_by: string | null;
    };
}
