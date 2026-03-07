"use client";

import { InferResponseType } from "hono";
import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { client } from "@/lib/hono";

import { Actions } from "./actions";
import { AccountColumn } from "./account-column";
import { CategoryColumn } from "./category-column";

export type ResponseType = InferResponseType<typeof client.api.transactions.$get, 200>["data"][0];

const amountFormatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
});

const renderSortableHeader = (
    label: string,
    column: {
        toggleSorting: (desc?: boolean) => void;
        getIsSorted: () => false | "asc" | "desc";
    }
) => {
    return (
        <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
            {label}
            <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
    );
};

export const columns: ColumnDef<ResponseType>[] = [
    {
        id: "select",
        header: ({ table }) => (
            <Checkbox
                checked={
                    table.getIsAllPageRowsSelected() ||
                    (table.getIsSomePageRowsSelected() && "indeterminate")
                }
                onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                aria-label="Select all"
            />
        ),
        cell: ({ row }) => (
            <Checkbox
                checked={row.getIsSelected()}
                onCheckedChange={(value) => row.toggleSelected(!!value)}
                aria-label="Select row"
            />
        ),
        enableSorting: false,
        enableHiding: false,
    },
    {
        accessorKey: "date",
        header: ({ column }) => renderSortableHeader("Date", column),
        cell: ({ row }) => {
            const value = row.getValue("date");
            const date = value instanceof Date ? value : new Date(String(value));

            return <div>{format(date, "dd MMM yyyy")}</div>;
        },
    },
    {
        accessorKey: "payee",
        header: ({ column }) => renderSortableHeader("Payee", column),
        cell: ({ row }) => <div className="font-medium">{row.getValue("payee")}</div>,
    },
    {
        accessorKey: "account",
        header: ({ column }) => renderSortableHeader("Account", column),
        cell: ({ row }) => 
        <AccountColumn 
        id={row.original.id}
        account={row.original.account} 
        accountId={row.original.accountId} />,
    },
    {
        accessorKey: "category",
        header: ({ column }) => renderSortableHeader("Category", column),
        cell: ({ row }) => 
        <CategoryColumn 
        id={row.original.id}
        category={row.original.category} 
        categoryId={row.original.categoryId}  
        />,
    },
    {
        accessorKey: "amount",
        header: ({ column }) => renderSortableHeader("Amount", column),
        cell: ({ row }) => {
            const amount = Number(row.getValue("amount"));

            return (
                <div className={amount < 0 ? "text-red-600" : "text-emerald-600"}>
                    {amountFormatter.format(amount)}
                </div>
            );
        },
    },
    {
        accessorKey: "notes",
        header: "Notes",
        cell: ({ row }) => {
            const notes = row.original.notes;

            return (
                <div className="max-w-60 truncate text-muted-foreground">
                    {notes || "-"}
                </div>
            );
        },
    },
    {
        id: "actions",
        cell: ({ row }) => <Actions id={row.original.id} />,
        enableHiding: false,
    },
];