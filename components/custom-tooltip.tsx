import { format } from "date-fns";
import type { TooltipContentProps } from "recharts";
import { formatCurrency } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

// Recharts clones this element and injects the tooltip props at render time, so none of
// them are actually present on the `<CustomTooltip />` JSX in the chart components -- hence
// `Partial<...>` rather than the (all-required) `TooltipContentProps` directly.
type CustomTooltipProps = Partial<TooltipContentProps<number, string>>;

export const CustomTooltip = ({ active, payload}: CustomTooltipProps) => {
    if( !active || !payload || payload.length === 0 ) {
        return null;
    }
    const date = payload[0].payload.date;
    const income = Number(payload[0]?.value ?? 0);
    const expenses = Number(payload[1]?.value ?? 0);

    return (
        <div className="bg-white p-3 rounded-md shadow-md border overflow-hidden" >
            <div className="text-sm text-muted-foreground p-2 px-3" >
                {format(date, "MMM dd, yyyy")}
            </div>
            <Separator  />
            <div className= "my-2 px-3 space-y-1" >
                 <div className="flex items-center justify-between gap-x-5 lg:flex-row lg:gap-x-3">
                    <div className="flex items-center gap-x-2">
                        <div className="size-2 bg-blue-500 rounded-full" />
                        
                        <p className="text-sm text-muted-foreground">
                        Income
                        </p>
                    </div>

                    <p className="text-sm text-right font-medium">
                        {formatCurrency(income)}
                    </p>

                    </div>
                 <div className="flex items-center justify-between gap-x-5 lg:flex-row lg:gap-x-3">
                    <div className="flex items-center gap-x-2">
                        <div className="size-1.5 bg-red-500 rounded-full" />
                        
                        <p className="text-sm text-muted-foreground">
                            Expenses                        
                        </p>
                    </div>    
                        <p className="text-sm text-right font-medium" >
                            {formatCurrency(expenses * -1)}
                        </p>
                 </div>
            </div>
        </div>
    )
}


    