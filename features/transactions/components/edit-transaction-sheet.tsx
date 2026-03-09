import { useOpenTransaction } from "@/features/transactions/hooks/use-open-transaction";
import { TransactionForm, type TransactionFormValues } from "@/features/transactions/components/transaction-form";

import { 
    Sheet,
    SheetContent,
    SheetTitle,
    SheetHeader,
    SheetDescription
} from "@/components/ui/sheet"
import { useGetTransaction } from "../api/use-get-transaction";
import { useDeleteTransaction } from "../api/use-delete-transaction";
import { useEditTransaction } from "../api/use-edit-transaction";
import { useConfirm } from "@/hooks/use-confirm";
import { Loader2 } from "lucide-react";
import { useCreateCategory } from "@/features/categories/api/use-create-category";
import { useGetCategories } from "@/features/categories/api/use-get-categories";
import { useCreateAccount } from "@/features/accounts/api/use-create-account";
import { useGetAccounts } from "@/features/accounts/api/use-get-accounts";

type TransactionFormProps = Parameters<typeof TransactionForm>[0];

export const EditTransactionSheet = () => {
    const { isOpen, onClose, id } = useOpenTransaction();

    const [ConfirmDialog, confirm] = useConfirm(
        "Are you sure?",
        "You are about to delete this transaction."
    );
         

    const transactionQuery = useGetTransaction(id);
    const editMutation = useEditTransaction(id);
    const deleteMutation = useDeleteTransaction(id);
    const categoryQuery = useGetCategories();
    const categoryMutation = useCreateCategory();
    const onCreateCategory = (name: string) => categoryMutation.mutate({ name });
    const categoryOptions = (categoryQuery.data ?? []).map((category) => ({
        label: category.name,
        value: category.id,
    }));

    const accountQuery = useGetAccounts();
    const accountMutation = useCreateAccount();
    const onCreateAccount = (name: string) => accountMutation.mutate({ name });
    const accountOptions = (accountQuery.data ?? []).map((account) => ({
        label: account.name,
        value: account.id,
    }));

    const isPending =
        editMutation.isPending ||
        deleteMutation.isPending ||
        transactionQuery.isLoading ||
        categoryMutation.isPending ||
        accountMutation.isPending;
    const isLoading =
        transactionQuery.isLoading ||
        categoryQuery.isLoading ||
        accountQuery.isLoading;

    const onSubmit: TransactionFormProps["onSubmit"] = (values) => {
        editMutation.mutate({
            date: values.date,
            accountId: values.accountId,
            payee: values.payee,
            amount: values.amount,
            categoryId: values.categoryId ?? null,
            notes: values.notes ?? null,
        }, {
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

    const defaultValues: TransactionFormValues = transactionQuery.data ? 
    { 
        date: new Date(transactionQuery.data.date),
        accountId: transactionQuery.data.accountId,
        categoryId: transactionQuery.data.categoryId ?? null,
        payee: transactionQuery.data.payee,
        amount: transactionQuery.data.amount,
        notes: transactionQuery.data.notes ?? null,
    } : { 
        date: new Date(),
        accountId: "",
        categoryId: null,
        payee: "",
        amount: 0,
        notes: null,
    };


    return (
        <>
        <ConfirmDialog />
            <Sheet open={isOpen} onOpenChange={onClose}>
                <SheetContent className="space-y-4 p-4">
                    <SheetHeader className="flex flex-col items-center">
                        <SheetTitle>
                            Edit Transaction
                        </SheetTitle>
                    <SheetDescription>
                        Edit your transaction details.
                    </SheetDescription>
                    </SheetHeader>
                    {isLoading ? (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Loader2 className="animate-spin size-4 text-muted-foreground" />
                        </div>
                    ) : (
                        <TransactionForm 
                            id={id}
                            onSubmit={onSubmit}
                            disabled={isPending}
                            defaultValues={defaultValues}
                            onDelete={onDelete}
                            onCreateCategory={onCreateCategory}
                            onCreateAccount={onCreateAccount}
                            categoryOptions={categoryOptions}
                            accountOptions={accountOptions}
                        />
                    )}
                </SheetContent>
            </Sheet> 
        </>
    );
};           

