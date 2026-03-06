import { toast } from "sonner";
import { InferResponseType } from "hono";
import { useMutation, useQueryClient } from "@tanstack/react-query";


import { client } from "@/lib/hono";

type ResponseType = InferResponseType<typeof client.api.categories[":id"]["$delete"]>;

export const useDeleteCategory = (id?: string) => {
    const queryClient = useQueryClient();

    const mutation = useMutation<ResponseType, Error, void>
    ({
        mutationFn: async () => {
            const response = await client.api.categories[":id"].$delete({ param: { id } });
            if (!response.ok) {
                throw new Error("Failed to delete category");
            }
            return response.json();
        },
        onSuccess: () => {
            toast.success("Category deleted successfully!");
            queryClient.invalidateQueries({ queryKey: ["categories", {id}] });
            queryClient.invalidateQueries({ queryKey: ["categories"] });
            //TODO: Invalidate transactions query if we are on the category details page
        },
        onError: () => {
            toast.error("Failed to delete category. Please try again.");
        },
    });
    return mutation;
};