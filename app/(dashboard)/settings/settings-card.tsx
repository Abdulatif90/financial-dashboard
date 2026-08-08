"use client";

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

export const SettingsCard = () => {
    const plaidStatus = useGetPlaidStatus();
    const disconnectBank = useDisconnectBank();

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
                    {connectBank ? (
                        <Button
                            size="sm"
                            variant="ghost"
                            disabled={disconnectBank.isPending}
                            onClick={() => disconnectBank.mutate()}
                        >
                            Disconnect
                        </Button>
                    ) : (
                        <PlaidConnect/>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
