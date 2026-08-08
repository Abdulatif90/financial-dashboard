import { z } from "zod";
import { useOpenCategory } from "@/features/categories/hooks/use-open-category";
import { CategoryForm } from "@/features/categories/components/category-form";
import { insertCategorySchema } from "@/db/schema";

import { 
    Sheet,
    SheetContent,
    SheetTitle,
    SheetHeader,
    SheetDescription
} from "@/components/ui/sheet"
import { useGetCategory } from "../api/use-get-category";
import { useDeleteCategory } from "../api/use-delete-category";
import { useEditCategory } from "../api/use-edit-category";
import { useConfirm } from "@/hooks/use-confirm";
import { Loader2 } from "lucide-react";

// Only the type is needed here -- CategoryForm owns the actual runtime schema/resolver -- so
// this derives FormValues from insertCategorySchema's inferred input type instead of creating
// an unused runtime `formSchema` binding (BUG-019).
type FormValues = Pick<z.input<typeof insertCategorySchema>, "name">;

export const EditCategorySheet = () => {
    const { isOpen, onClose, id } = useOpenCategory();

    const [ConfirmDialog, confirm] = useConfirm(
        "Are you sure?",
        "You are about to delete this category."
    );
         

    const categoryQuery = useGetCategory(id);
    const editMutation = useEditCategory(id);
    const deleteMutation = useDeleteCategory(id);

    const isPending = editMutation.isPending || deleteMutation.isPending; 
    const isLoading = categoryQuery.isLoading;

    const onSubmit = (values: FormValues) => {
        editMutation.mutate(values, {
            onSuccess: () => {
                onClose();
            },
        });
    };

    const onDelete = async () => {
        const confirmed = await confirm();
        if (confirmed) {
            deleteMutation.mutate(
                undefined,
                {
                    onSuccess: () => {  onClose(); },
                }
            );
        }
    };

    const defaultValues = categoryQuery.data ? 
    { name: categoryQuery.data.name } : { name: "" };


    return (
        <>
        <ConfirmDialog />
            <Sheet open={isOpen} onOpenChange={onClose}>
                <SheetContent className="space-y-4 p-4">
                    <SheetHeader className="flex flex-col items-center">
                        <SheetTitle>
                            Edit Category
                        </SheetTitle>
                    <SheetDescription>
                        Edit your category details.
                    </SheetDescription>
                    </SheetHeader>
                    {isLoading ? (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Loader2 className="animate-spin size-4 text-muted-foreground" />
                        </div>
                    ) : (
                        <CategoryForm 
                            id={id}
                            onSubmit={onSubmit}
                            disabled={isPending}
                            defaultValues={defaultValues}
                            onDelete={onDelete}
                        />
                    )}
                </SheetContent>
            </Sheet> 
        </>
    );
};           

