"use client";

import { useSearchParams } from "next/navigation";
import { formatDateRange } from "@/lib/utils";
import { DataCard, DataCardLoading } from "@/components/data-card";
import { FaPiggyBank } from "react-icons/fa";
import { FaArrowTrendUp, FaArrowTrendDown } from "react-icons/fa6";
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
                icon={FaPiggyBank}
                variant="success"
                dataRange={dateRange}                
            />
            <DataCard
                title="Income"
                value={data?.incomeAmount}
                percentage={data?.incomeChange}
                icon={FaArrowTrendUp}
                variant="success"
                dataRange={dateRange}                
            />
            <DataCard
                title="expenses"
                value={data?.expensesAmount}
                percentage={data?.expensesChange}
                icon={FaArrowTrendDown}
                variant="danger"
                trend="inverse"
                dataRange={dateRange}
            />
                
        </div>
    )
}


