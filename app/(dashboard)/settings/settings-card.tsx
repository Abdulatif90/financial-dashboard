"use client";

import { Loader2 } from "lucide-react";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PlaidConnect } from "@/features/plaid/components/plaid-connect";
import { useGetPlaidStatus } from "@/features/plaid/api/use-get-plaid-status";
import { useDisconnectBank } from "@/features/plaid/api/use-disconnect-bank";
import { useSyncTransactions } from "@/features/plaid/api/use-sync-transactions";

export const SettingsCard = () => {
    const plaidStatus = useGetPlaidStatus();
    const disconnectBank = useDisconnectBank();
    const syncTransactions = useSyncTransactions();

    const connectBank = plaidStatus.data?.connected ?? false;

    return (
        <Card className="border-none drop-shadow-sm">
            <CardHeader>
                <CardTitle className="text-xl line-clamp-1">
                    Settings
                </CardTitle>
            </CardHeader>
            <CardContent>
                <Separator/>
                <div className="flex flex-col gap-y-4 lg:flex-row items-center py-4" >
                    <p className="text-sm  font-medium w-full lg:w-16.5rem" >
                        Bank account
                    </p>
                    <div className={cn(
                        "text-sm truncate flex itmes-center",
                        !connectBank && "text-muted-foreground"
                    )}>
                        {connectBank ? "Bank account connected" : "No bank account connected"}
                    </div>
                    {plaidStatus.isLoading ? (
                        // Don't render the disconnected state (and mount PlaidConnect, which
                        // creates a Plaid link token on mount) while we don't actually know
                        // the connection status yet -- an already-connected user would
                        // otherwise briefly see "Connect" and generate an unused link token
                        // on every Settings visit.
                        <Loader2 className="size-4 animate-spin text-muted-foreground" />
                    ) : connectBank ? (
                        <div className="flex items-center gap-x-2">
                            <Button
                                size="sm"
                                variant="outline"
                                disabled={syncTransactions.isPending || disconnectBank.isPending}
                                onClick={() => syncTransactions.mutate()}
                            >
                                {syncTransactions.isPending ? "Syncing..." : "Sync transactions"}
                            </Button>
                            <Button
                                size="sm"
                                variant="ghost"
                                disabled={disconnectBank.isPending || syncTransactions.isPending}
                                onClick={() => disconnectBank.mutate()}
                            >
                                Disconnect
                            </Button>
                        </div>
                    ) : (
                        <PlaidConnect/>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
