import { toast } from "sonner";
import { InferResponseType, InferRequestType } from "hono";
import { useMutation, useQueryClient } from "@tanstack/react-query";


import { client } from "@/lib/hono";

type ResponseType = InferResponseType<typeof client.api.plaid["exchange-public-token"]["$post"], 200>;
type RequestType = InferRequestType<typeof client.api.plaid["exchange-public-token"]["$post"]>["json"]

export const useExchangePublicToken = () => {
    const queryClient = useQueryClient();

    const mutation = useMutation<ResponseType, Error, RequestType>
    ({
        mutationFn: async (json) => {
            const response = await client.api.plaid["exchange-public-token"].$post({json});

            if (!response.ok) {
                throw new Error("Failed to  exchange puclic link token");
            }

            return await response.json();
        },
        onSuccess: () => {
            toast.success("Public Link token created successfully!");
            // TODO
        },
        onError: () => {
            toast.error("Failed to public link token. Please try again.");
        },
    });
    return mutation;
};