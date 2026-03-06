import { toast } from "sonner";
import { InferResponseType } from "hono";
import { useMutation, useQueryClient } from "@tanstack/react-query";


import { client } from "@/lib/hono";

type ResponseType = InferResponseType<typeof client.api.transactions[":id"]["$delete"]>;

export const useDeleteTransaction = (id?: string) => {
    const queryClient = useQueryClient();

    const mutation = useMutation<ResponseType, Error, void>
    ({
        mutationFn: async () => {
            const response = await client.api.transactions[":id"].$delete({ param: { id } });
            if (!response.ok) {
                throw new Error("Failed to delete transaction");
            }
            return response.json();
        },
        onSuccess: () => {
            toast.success("Transaction deleted successfully!");
            queryClient.invalidateQueries({ queryKey: ["transactions", {id}] });
            queryClient.invalidateQueries({ queryKey: ["transactions"] });
            //TODO: Invalidate transactions query if we are on the account details page
        },
        onError: () => {
            toast.error("Failed to delete transaction. Please try again.");
        },
    });
    return mutation;
};