import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { client } from "@/lib/hono";

export const useGetSummary = () => {
    const params = useSearchParams();
    const accountId = params.get("accountId");
    const from = params.get("from") || "";
    const to = params.get("to") || "";

    const query = useQuery ({
        //TODO: check if from and to are valid dates
        queryKey: ["summary",{from, to, accountId}],
        queryFn: async () => {
            const response = await client.api.summary.$get({
                query: {
                    from: from || undefined,
                    to: to || undefined,
                    accountId: accountId || undefined,
                }
            });
            
            if (!response.ok) {
                throw new Error("Failed to fetch summary")
            }

            const { data } = await response.json();
            return {
                ...data,
                incomeAmount: Math.abs(data.incomeAmount),
                expensesAmount: data.expensesAmount,
                remainingAmount: Math.abs( data.remainingAmount),
                categories: data.categories.map((category: {name: string; value: number}) => ({
                    ...category,
                    value: Math.abs(category.value),
                })),
                days: data.days.map((day: {date: string; income: number; expenses: number}) => ({
                    ...day,
                    date: day.date,
                    income: Math.abs(day.income),
                    expenses: day.expenses,
                }))
                
            };
        }
    });
    return query;
}
