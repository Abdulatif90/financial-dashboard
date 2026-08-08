import { toast } from "sonner";
import { InferResponseType } from "hono";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { client } from "@/lib/hono";

type ResponseType = InferResponseType<typeof client.api.plaid.disconnect["$post"], 200>;

export const useDisconnectBank = () => {
    const queryClient = useQueryClient();

    const mutation = useMutation<ResponseType, Error, void>
    ({
        mutationFn: async () => {
            const response = await client.api.plaid.disconnect.$post();

            if (!response.ok) {
                throw new Error("Failed to disconnect bank");
            }

            return await response.json();
        },
        onSuccess: () => {
            toast.success("Bank disconnected successfully!");
            queryClient.invalidateQueries({ queryKey: ["plaid-status"] });
        },
        onError: () => {
            toast.error("Failed to disconnect bank. Please try again.");
        },
    });
    return mutation;
};
