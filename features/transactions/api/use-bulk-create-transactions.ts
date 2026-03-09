import { toast } from "sonner";
import { InferRequestType, InferResponseType } from "hono";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { client } from "@/lib/hono";

type ResponseType = InferResponseType<typeof client.api.transactions["bulk-create"]["$post"]>;
type RequestType = InferRequestType<typeof client.api.transactions["bulk-create"]["$post"]>["json"];

export const useBulkCreateTransaction = () => {
    const queryClient = useQueryClient();

    const mutation = useMutation<ResponseType, Error, RequestType>
    ({
        mutationFn: async (data) => {
            const response = await client.api.transactions["bulk-create"]["$post"]({ json: data });
            if (!response.ok) {
                throw new Error("Failed to create transactions");
            }
            return response.json();
        },
        onSuccess: () => {
            toast.success("Transactions created successfully!");
            queryClient.invalidateQueries({ queryKey: ["transactions"] });
            queryClient.invalidateQueries({ queryKey: ["summary"] });
        },
        onError: () => {
            toast.error("Failed to create transactions. Please try again.");
        },
    });
    return mutation;
};