"use client";


import { Loader2, Plus } from "lucide-react";
import { useNewAccount } from "@/features/accounts/hooks/use-new-account";
import { useGetAccounts } from "@/features/accounts/api/use-get-accounts";
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
import { useBulkDeleteAccount } from "@/features/accounts/api/use-bulk-delete";


const AccountsPage = () => {
    const newAccount = useNewAccount();
    const deleteAccounts = useBulkDeleteAccount();
    const accountsQuery = useGetAccounts();
    const accounts = accountsQuery.data || [];

    const isDisable = 
    accountsQuery.isLoading || deleteAccounts.isPending

    if (accountsQuery.isLoading) {
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
                    Accounts Page
                </CardTitle>
                <Button size="sm" onClick={newAccount.onOpen}>
                    <Plus className="size-4 mr-2"/>
                    Add Account
                </Button>   
            </CardHeader>
            <CardContent>
                <DataTable 
                columns={columns}
                data={accounts}
                filterKey="name"
                onDelete={(row) => {
                    const ids = row.map((r) => r.id);
                    deleteAccounts.mutate({ ids });
                }}
                disable={isDisable}
             />
            </CardContent>
        </Card>
    </div>
  );
};

export default AccountsPage;