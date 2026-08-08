import { toast } from "sonner";
import { InferResponseType } from "hono";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { client } from "@/lib/hono";

type ResponseType = InferResponseType<typeof client.api.plaid.sync["$post"], 200>;

export const useSyncTransactions = () => {
    const queryClient = useQueryClient();

    const mutation = useMutation<ResponseType, Error, void>
    ({
        mutationFn: async () => {
            const response = await client.api.plaid.sync.$post();

            if (!response.ok) {
                throw new Error("Failed to sync transactions");
            }

            return await response.json();
        },
        onSuccess: (response) => {
            const { added, modified, removed } = response.data;

            toast.success(
                `Synced: ${added} added, ${modified} updated, ${removed} removed`
            );

            // A sync writes transactions (and possibly new accounts/categories), so every
            // view derived from them has to refetch.
            queryClient.invalidateQueries({ queryKey: ["transactions"] });
            queryClient.invalidateQueries({ queryKey: ["summary"] });
            queryClient.invalidateQueries({ queryKey: ["accounts"] });
            queryClient.invalidateQueries({ queryKey: ["categories"] });
        },
        onError: () => {
            toast.error("Failed to sync transactions. Please try again.");
        },
    });
    return mutation;
};
