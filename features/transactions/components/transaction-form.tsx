import { useEffect, useMemo } from "react";
import { z } from "zod";
import { Trash } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Select } from "@/components/select";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/date-picker";
import { Textarea } from "@/components/ui/textarea";
import { AmountInput } from "@/components/amount-input";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage 
} from "@/components/ui/form";

const formSchema = z.object({
    date: z.date().refine((value) => value <= new Date(), {
        message: "Date cannot be in the future",
    }),
    accountId: z.string().trim().min(1, "Account is required"),
    categoryId: z.string().trim().nullable().optional(),
    payee: z.string().trim().min(1, "Payee is required"),
    amount: z.number().finite(),
    notes: z.string().trim().nullable().optional(),
});

export type TransactionFormValues = z.output<typeof formSchema>;

type Props = {
    id?: string;
    defaultValues?: TransactionFormValues;
    onSubmit: (values: TransactionFormValues) => void;
    onDelete?: () => void;
    disabled?: boolean;
    accountOptions: { label: string; value: string }[];
    categoryOptions: { label: string; value: string }[];
    onCreateAccount: (name: string) => void;
    onCreateCategory: (name: string) => void;
};

const emptyDefaultValues: TransactionFormValues = {
    date: new Date(),
    accountId: "",
    categoryId: null,
    payee: "",
    amount: 0,
    notes: null,
};

export const TransactionForm = ({
    id,
    defaultValues,
    onSubmit,
    onDelete,
    disabled,
    accountOptions,
    categoryOptions,
    onCreateAccount,
    onCreateCategory,
}: Props) => {
    const mergedDefaultValues = useMemo(
        () => ({ ...emptyDefaultValues, ...defaultValues }),
        [defaultValues]
    );

    const form = useForm<TransactionFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: mergedDefaultValues,
    });

    useEffect(() => {
        form.reset(mergedDefaultValues);
    }, [form, mergedDefaultValues]);

    const handleSubmit = (values: TransactionFormValues) => {
        onSubmit(values);
    }

    const handleDelete = () => {
        if (onDelete) {
            onDelete();
        }
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 p-4">
                 <FormField 
                    name="date"
                    control={form.control}
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Date</FormLabel>
                            <FormControl>
                                <DatePicker
                                    value={field.value}
                                    onChange={field.onChange}
                                    disable={disabled}
                                    disabledDates={{ after: new Date() }}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField 
                    name="accountId"
                    control={form.control}
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Account</FormLabel>
                            <FormControl>
                                <Select
                                placeholder="Select account"
                                options={accountOptions}
                                onCreate={onCreateAccount}
                                value={field.value ?? ""}
                                onChange={field.onChange}
                                disabled={disabled}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField 
                    name="categoryId"
                    control={form.control}
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Category</FormLabel>
                            <FormControl>
                                <Select
                                placeholder="Select category"
                                options={categoryOptions}
                                onCreate={onCreateCategory}
                                value={field.value ?? null}
                                onChange={field.onChange}
                                disabled={disabled}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField 
                    name="payee"
                    control={form.control}
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Payee</FormLabel>
                            <FormControl>
                                <input 
                                    placeholder="Payee"
                                    disabled={disabled}
                                    {...field}
                                    value={field.value ?? ""}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField 
                    name="amount"
                    control={form.control}
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Amount</FormLabel>
                            <FormControl>
                                <AmountInput 
                                    placeholder="Amount"
                                    disabled={disabled}
                                    value={field.value?.toString() ?? ""}
                                    onChange={(value) => {
                                        const nextValue = value?.replace(/,/g, "");
                                        field.onChange(nextValue ? Number(nextValue) : undefined);
                                    }}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField 
                    name="notes"
                    control={form.control}
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Notes</FormLabel>
                            <FormControl>
                                <Textarea 
                                    {...field}
                                    value={field.value || ""}
                                    placeholder="Notes"
                                    disabled={disabled}
                                    
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <Button type="submit" disabled={disabled} className="w-full">
                    {id ? "Update Transaction" : "Create Transaction"}
                </Button>
                   {onDelete && (
                    <Button
                        type="button"
                        variant="destructive"
                        onClick={handleDelete}
                        disabled={disabled}
                        className="w-full"
                    >
                        <Trash className="mr-2 h-4 w-4" />
                        Delete transaction
                    </Button>
                )}
            </form>
        </Form>
    );
};
