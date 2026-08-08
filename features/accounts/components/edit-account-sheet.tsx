import { z } from "zod";
import { useOpenAccount } from "@/features/accounts/hooks/use-open-account";
import { AccountForm } from "@/features/accounts/components/account-form";
import { insertAccountSchema } from "@/db/schema";

import { 
    Sheet,
    SheetContent,
    SheetTitle,
    SheetHeader,
    SheetDescription
} from "@/components/ui/sheet"
import { useGetAccount } from "../api/use-get-account";
import { useDeleteAccount } from "../api/use-delete-account";
import { useEditAccount } from "../api/use-edit-account";
import { useConfirm } from "@/hooks/use-confirm";
import { Loader2 } from "lucide-react";

// Only the type is needed here -- AccountForm owns the actual runtime schema/resolver -- so
// this derives FormValues from insertAccountSchema's inferred input type instead of creating
// an unused runtime `formSchema` binding (BUG-019).
type FormValues = Pick<z.input<typeof insertAccountSchema>, "name">;

export const EditAccountSheet = () => {
    const { isOpen, onClose, id } = useOpenAccount();

    const [ConfirmDialog, confirm] = useConfirm(
        "Are you sure?",
        "You are about to delete this account."
    );
         

    const accountQuery = useGetAccount(id);
    const editMutation = useEditAccount(id);
    const deleteMutation = useDeleteAccount(id);

    const isPending = editMutation.isPending || deleteMutation.isPending; 
    const isLoading = accountQuery.isLoading;

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

    const defaultValues = accountQuery.data ? 
    { name: accountQuery.data.name } : { name: "" };


    return (
        <>
        <ConfirmDialog />
            <Sheet open={isOpen} onOpenChange={onClose}>
                <SheetContent className="space-y-4 p-4">
                    <SheetHeader className="flex flex-col items-center">
                        <SheetTitle>
                            Edit Account
                        </SheetTitle>
                    <SheetDescription>
                        Edit your account details.
                    </SheetDescription>
                    </SheetHeader>
                    {isLoading ? (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Loader2 className="animate-spin size-4 text-muted-foreground" />
                        </div>
                    ) : (
                        <AccountForm 
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

