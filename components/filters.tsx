import { AccountFilter } from "@/components/account-filter";
import { DataFilter } from "@/components/data-filter";

export const Filters = () => {
    return (
        <div className="flex flex-col lg:flex-row items-center gap-y-4 lg:gap-x-6 mt-8" >
            <AccountFilter />
            <DataFilter/>
        </div>
        );
}