"use client";

import { useSearchParams } from "next/navigation";
import { formatDateRange } from "@/lib/utils";
import { DataCard, DataCardLoading } from "@/components/data-card";
import { useGetSummary } from "@/features/summary/api/use-get-summary";

export const DataGrid = () => {
    const { data, isLoading } = useGetSummary();
    const params = useSearchParams();
    const to = params.get("to") || undefined;
    const from = params.get("from") || undefined;

    const dateRange = formatDateRange({from, to});

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb- mb-8">
                <DataCardLoading />
                <DataCardLoading />
                <DataCardLoading />   
            </div>
        )
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb- mb-8">
            <DataCard
                title="Remaining"
                value={data?.remainingAmount}
                percentage={data?.remainingChange}
                dataRange={dateRange}                
            />
            <DataCard
                title="Income"
                value={data?.incomeAmount}
                percentage={data?.incomeChange}
                dataRange={dateRange}                
            />
            <DataCard
                title="expenses"
                value={data?.expensesAmount}
                percentage={data?.expensesChange}
                trend="inverse"
                dataRange={dateRange}
            />
                
        </div>
    )
}


