import { useQuery } from "@tanstack/react-query";
import { client } from "@/lib/hono";

export const useGetPlaidStatus = () => {
    const query = useQuery({
        queryKey: ["plaid-status"],
        queryFn: async () => {
            const response = await client.api.plaid.status.$get();

            if (!response.ok) {
                throw new Error("Failed to fetch bank connection status");
            }

            const { data } = await response.json();
            return data;
        },
    });
    return query;
};
