import { toast } from "sonner";
import { InferRequestType, InferResponseType } from "hono";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { client } from "@/lib/hono";

type ResponseType = InferResponseType<typeof client.api.transactions["bulk-create"]["$post"]>;
type RequestType = InferRequestType<typeof client.api.transactions["bulk-create"]["$post"]>["json"];

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

export const useBulkCreateTransaction = () => {
    const queryClient = useQueryClient();

    const mutation = useMutation<ResponseType, Error, RequestType>
    ({
        mutationFn: async (data) => {
            const response = await client.api.transactions["bulk-create"]["$post"]({ json: data });
            if (!response.ok) {
                throw new Error(await getResponseErrorMessage(response, "Failed to create transactions"));
            }
            return response.json();
        },
        onSuccess: () => {
            toast.success("Transactions created successfully!");
            queryClient.invalidateQueries({ queryKey: ["transactions"] });
            queryClient.invalidateQueries({ queryKey: ["summary"] });
        },
        onError: (error) => {
            toast.error(error.message);
        },
    });
    return mutation;
};