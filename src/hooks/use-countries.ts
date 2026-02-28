"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/api-client";
import { throwApiError } from "@/lib/utils/throw-api-error";
import type { CountryResponse } from "@/types/country";

export const countryKeys = {
    all: ["countries"] as const,
};

export const useCountries = () => {
    return useQuery<CountryResponse, Error>({
        queryKey: countryKeys.all,
        queryFn: async () => {
            try {
                const response = await apiClient.get("/operations/v1/country");
                return response.data;
            } catch (error) {
                throwApiError(error);
            }
        },
    });
};
