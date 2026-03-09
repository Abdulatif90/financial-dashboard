"use client";

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useGetAccounts } from "@/features/accounts/api/use-get-accounts";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export const AccountFilter = () => {
    const { data: accounts } = useGetAccounts();
    const params = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();
    const accountId = params.get("accountId") ?? "all";

    const onAccountChange = (nextAccountId: string) => {
        const nextParams = new URLSearchParams(params.toString());

        if (nextAccountId === "all") {
            nextParams.delete("accountId");
        } else {
            nextParams.set("accountId", nextAccountId);
        }

        const query = nextParams.toString();
        router.replace(query ? `${pathname}?${query}` : pathname);
    };

    return (
        <Select 
        value={accountId}
        onValueChange={onAccountChange} 
        disabled={!accounts || accounts.length === 0} 
        >
            <SelectTrigger className="lg:w-auto h-9 rounded-md px-3 font-normal bg-white/10 hover:bg-white/20 focus:ring-transparent hover:text-white border-none focus:ring-offset-0 outline-none text-white focus:bg-white/30 transition" >
                <SelectValue placeholder="Filter by account" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="all" >
                    <p className="line-clamp-1" >
                        All Accounts
                    </p>
                </SelectItem>
                {accounts?.map(account => (
                    <SelectItem key={account.id} value={account.id} >
                        <p className="line-clamp-1" >
                            {account.name}
                        </p>
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    )
}