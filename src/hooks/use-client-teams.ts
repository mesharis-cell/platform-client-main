"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/api-client";

export type ClientTeam = {
    id: string;
    name: string;
    description: string | null;
    can_other_teams_see: boolean;
    can_other_teams_book: boolean;
    members: Array<{
        id: string;
        user_id: string;
        user: { id: string; name: string; email: string };
    }>;
};

export function useClientTeams() {
    return useQuery({
        queryKey: ["client-teams"],
        queryFn: async (): Promise<ClientTeam[]> => {
            const response = await apiClient.get("/client/v1/team");
            return response.data.data as ClientTeam[];
        },
        staleTime: 5 * 60 * 1000,
    });
}
