import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { client } from "@/lib/hono";

export const useGetTransactions = () => {
    const params = useSearchParams();
    const accountId = params.get("accountId");
    const from = params.get("from") || "";
    const to = params.get("to") || "";

    const query = useQuery ({
        //TODO: check if from and to are valid dates
        queryKey: ["transactions",{from, to, accountId}],
        queryFn: async () => {
            const response = await client.api.transactions.$get({
                query: {
                    from: from || undefined,
                    to: to || undefined,
                    accountId: accountId || undefined,
                }
            });
            
            if (!response.ok) {
                throw new Error("Failed to fetch transactions")
            }

            const { data } = await response.json();
            return data;
        }
    });
    return query;
}
