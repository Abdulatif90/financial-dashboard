import { toast } from "sonner";
import { InferResponseType } from "hono";
import { useMutation, useQueryClient } from "@tanstack/react-query";


import { client } from "@/lib/hono";

type ResponseType = InferResponseType<typeof client.api.accounts[":id"]["$delete"]>;

export const useDeleteAccount = (id?: string) => {
    const queryClient = useQueryClient();

    const mutation = useMutation<ResponseType, Error, void>
    ({
        mutationFn: async () => {
            const response = await client.api.accounts[":id"].$delete({ param: { id } });
            if (!response.ok) {
                throw new Error("Failed to delete account");
            }
            return response.json();
        },
        onSuccess: () => {
            toast.success("Account deleted successfully!");
            queryClient.invalidateQueries({ queryKey: ["account", { id }] });
            queryClient.invalidateQueries({ queryKey: ["accounts"] });
            queryClient.invalidateQueries({ queryKey: ["transactions"] });
            queryClient.invalidateQueries({ queryKey: ["summary"] });
        },
        onError: () => {
            toast.error("Failed to delete account. Please try again.");
        },
    });
    return mutation;
};