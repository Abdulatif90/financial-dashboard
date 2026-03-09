import { toast } from "sonner";
import { InferRequestType, InferResponseType } from "hono";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { client } from "@/lib/hono";

type ResponseType = InferResponseType<typeof client.api.transactions[":id"]["$patch"]>;
type RequestType = InferRequestType<typeof client.api.transactions[":id"]["$patch"]>["json"];

export const useEditTransaction = (id?: string) => {
    const queryClient = useQueryClient();

    const mutation = useMutation<ResponseType, Error, RequestType>
    ({
        mutationFn: async (data) => {
            const response = await client.api.transactions[":id"].$patch({ json: data, param: { id } });
            if (!response.ok) {
                throw new Error("Failed to edit transaction");
            }
            return response.json();
        },
        onSuccess: () => {
            toast.success("Transaction edited successfully!");
            queryClient.invalidateQueries({ queryKey: ["transactions", {id}] });
            queryClient.invalidateQueries({ queryKey: ["transactions"] });
            queryClient.invalidateQueries({ queryKey: ["summary"] });
            
        },
        onError: () => {
            toast.error("Failed to edit transaction. Please try again.");
        },
    });
    return mutation;
};