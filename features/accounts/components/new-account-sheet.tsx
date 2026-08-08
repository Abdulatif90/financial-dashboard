import { z } from "zod";
import { useNewAccount } from "@/features/accounts/hooks/use-new-account";
import { AccountForm } from "@/features/accounts/components/account-form";
import { insertAccountSchema } from "@/db/schema";

import { 
    Sheet,
    SheetContent,
    SheetTitle,
    SheetHeader,
    SheetDescription
} from "@/components/ui/sheet"
import { useCreateAccount } from "../api/use-create-account";

// Only the type is needed here -- AccountForm owns the actual runtime schema/resolver -- so
// this derives FormValues from insertAccountSchema's inferred input type instead of creating
// an unused runtime `formSchema` binding (BUG-019).
type FormValues = Pick<z.input<typeof insertAccountSchema>, "name">;

export const NewAccountSheet = () => {
    const { isOpen, onClose } = useNewAccount();
    const mutation = useCreateAccount();

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
                        Create New Account
                    </SheetTitle>
                <SheetDescription>
                    Create a new account to track your transactions.
                </SheetDescription>
                </SheetHeader>
                <AccountForm 
                onSubmit={onSubmit}
                disabled={mutation.isPending}
                defaultValues={{ name: "" }}
                />
            </SheetContent>
        </Sheet> 
    );
};           

