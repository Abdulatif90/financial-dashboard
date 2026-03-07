import { z } from "zod";
import { useNewTransaction } from "@/features/transactions/hooks/use-new-transaction";
import { insertTransactionSchema } from "@/db/schema";
import { Loader2 } from "lucide-react";

import { 
    Sheet,
    SheetContent,
    SheetTitle,
    SheetHeader,
    SheetDescription
} from "@/components/ui/sheet"
import { useCreateTransaction } from "@/features/transactions/api/use-create-transaction";
import { useCreateCategory } from "@/features/categories/api/use-create-category";
import { useGetCategories } from "@/features/categories/api/use-get-categories";
import { useCreateAccount } from "@/features/accounts/api/use-create-account";
import { useGetAccounts } from "@/features/accounts/api/use-get-accounts";
import { TransactionForm } from "@/features/transactions/components/transaction-form";

const formSchema = insertTransactionSchema.omit({
    id: true,
});

type FormValues = z.input<typeof formSchema>;

export const NewTransactionSheet = () => {
    const { isOpen, onClose } = useNewTransaction();
    const createMutation = useCreateTransaction();
    const categoryQuery = useGetCategories();
    const categoryMutation = useCreateCategory();
    const onCreateCategory = (name: string) => categoryMutation.mutate({ name });
    const categoryOptions = (categoryQuery.data ?? []).map((category) => ({ 
        label: category.name, 
        value: category.id 
    })) || [];

    const accountQuery = useGetAccounts();
    const accountMutation = useCreateAccount();
    const onCreateAccount = (name: string) => accountMutation.mutate({ name });
    const accountOptions = (accountQuery.data ?? []).map((account) => ({ 
        label: account.name, 
        value: account.id 
    })) || [];

    const isPending = 
    createMutation.isPending ||
    categoryMutation.isPending ||
    accountMutation.isPending;

    const isLoading =
    categoryQuery.isLoading ||
    accountQuery.isLoading;

    const onSubmit = (values: FormValues) => {
        createMutation.mutate(values, {
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
                        Create New Transaction  
                    </SheetTitle>
                <SheetDescription>
                    Create a new transaction to track your transactions.
                </SheetDescription>
                </SheetHeader>
                {isLoading ? (
                    <div className="w-full h-125 flex items-center justify-center">
                        <Loader2 className="size-8 animate-spin text-slate-400" />
                    </div>
                ) : (
                <TransactionForm 
                onSubmit={onSubmit}
                disabled={isPending}
                onCreateCategory={onCreateCategory}
                onCreateAccount={onCreateAccount}
                categoryOptions={categoryOptions}
                accountOptions={accountOptions}
                />
                )}
            </SheetContent>
        </Sheet> 
    );
};           

