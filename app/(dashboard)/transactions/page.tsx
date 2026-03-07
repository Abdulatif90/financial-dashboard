"use client";


import { Loader2, Plus } from "lucide-react";
import { useNewTransaction } from "@/features/transactions/hooks/use-new-transaction";
import { useGetTransactions } from "@/features/transactions/api/use-get-transactions";
import { useBulkDeleteTransactions } from "@/features/transactions/api/use-bulk-delete-transactions";
import { columns } from "./columns";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table";
import { Skeleton } from "@/components/ui/skeleton";


const TransactionsPage = () => {
    const newTransaction = useNewTransaction();
    const deleteTransactions = useBulkDeleteTransactions();
    const transactionsQuery = useGetTransactions();
    const transactions = transactionsQuery.data || [];

    const isDisable = 
    transactionsQuery.isLoading || deleteTransactions.isPending

    if (transactionsQuery.isLoading) {
        return (
            <Card className="border-none drop-shadow-sm">
                <CardHeader >
                    <Skeleton className="h-6 w-32" />
                </CardHeader>
                <CardContent>
                    <div className="w-full h-125 flex items-center justify-center">
                        <Loader2 className="size-8 animate-spin text-slate-400" />
                    </div>
                </CardContent>
            </Card>
        );
    }

  return (
    <div className="max-w-screen-2xl mx-auto w-full pb-10 -mt-24">
        <Card className="border-none drop-shadow-sm">
            <CardHeader className="gap-y-2 lg:flex-row lg:items-center lg:justify-between">
                <CardTitle>
                    Transactions history
                </CardTitle>
                <Button size="sm" onClick={newTransaction.onOpen}>
                    <Plus className="size-4 mr-2"/>
                    Add transaction
                </Button>   
            </CardHeader>
            <CardContent>
                <DataTable 
                columns={columns}
                data={transactions}
                filterKey="payee"
                onDelete={(row) => {
                    const ids = row.map((r) => r.id);
                    deleteTransactions.mutate({ ids });
                }}
                disable={isDisable}
             />
            </CardContent>
        </Card>
    </div>
  );
};

export default TransactionsPage;