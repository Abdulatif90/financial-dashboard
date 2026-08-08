import { z } from "zod";
import { useNewCategory } from "@/features/categories/hooks/use-new-category";
import { CategoryForm } from "@/features/categories/components/category-form";
import { insertCategorySchema } from "@/db/schema";

import { 
    Sheet,
    SheetContent,
    SheetTitle,
    SheetHeader,
    SheetDescription
} from "@/components/ui/sheet"
import { useCreateCategory } from "../api/use-create-category";

// Only the type is needed here -- CategoryForm owns the actual runtime schema/resolver -- so
// this derives FormValues from insertCategorySchema's inferred input type instead of creating
// an unused runtime `formSchema` binding (BUG-019).
type FormValues = Pick<z.input<typeof insertCategorySchema>, "name">;

export const NewCategorySheet = () => {
    const { isOpen, onClose } = useNewCategory();
    const mutation = useCreateCategory();

    const onSubmit = (values: FormValues) => {
        mutation.mutate(values, {
            onSuccess: () => {
                onClose();
            },
        });
    };
    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent className="space-y-4 p-4">
                <SheetHeader className="flex flex-col items-center">
                    <SheetTitle>
                        Create New Category
                    </SheetTitle>
                <SheetDescription>
                    Create a new category to organize your transactions.
                </SheetDescription>
                </SheetHeader>
                <CategoryForm 
                onSubmit={onSubmit}
                disabled={mutation.isPending}
                defaultValues={{ name: "" }}
                />
            </SheetContent>
        </Sheet> 
    );
};           

