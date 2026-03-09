import { toast } from "sonner";
import { InferResponseType } from "hono";
import { useMutation, useQueryClient } from "@tanstack/react-query";


import { client } from "@/lib/hono";

type ResponseType = InferResponseType<typeof client.api.transactions[":id"]["$delete"]>;

const getResponseErrorMessage = async (response: Response, fallbackMessage: string) => {
    try {
        const payload = await response.json();

        if (typeof payload?.message === "string" && payload.message.trim()) {
            return payload.message;
        }

        if (typeof payload?.error === "string" && payload.error.trim()) {
            return payload.error;
        }
    } catch {
        // Ignore non-JSON responses and keep the fallback message.
    }

    return fallbackMessage;
};

export const useDeleteTransaction = (id?: string) => {
    const queryClient = useQueryClient();

    const mutation = useMutation<ResponseType, Error, void>
    ({
        mutationFn: async () => {
            const response = await client.api.transactions[":id"].$delete({ param: { id } });
            if (!response.ok) {
                throw new Error(await getResponseErrorMessage(response, "Failed to delete transaction"));
            }
            return response.json();
        },
        onSuccess: () => {
            toast.success("Transaction deleted successfully!");
            queryClient.invalidateQueries({ queryKey: ["transactions", {id}] });
            queryClient.invalidateQueries({ queryKey: ["transactions"] });
            queryClient.invalidateQueries({ queryKey: ["summary"] });
        },
        onError: (error) => {
            toast.error(error.message);
        },
    });
    return mutation;
};