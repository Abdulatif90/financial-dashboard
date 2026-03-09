import { formatCurrency, getCategoryColor } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

interface CategoryTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; payload: { name: string } }>;
}

export const CategoryTooltip = ({ active, payload }: CategoryTooltipProps) => {
    if( !active || !payload || payload.length === 0 ) {
        return null;
    }
    const name = payload[0].payload.name;
    const value = payload[0].value;
    const color = getCategoryColor(name);

    return (
        <div className="bg-white p-3 rounded-md shadow-md border overflow-hidden" >
            <div className="text-sm text-muted-foreground p-2 px-3" >
                {name}
            </div>
            <Separator  />
            <div className= "my-2 px-3 space-y-1" >
                
                 <div className="flex items-center justify-between gap-x-5 lg:flex-row lg:gap-x-3">
                    <div className="flex items-center gap-x-2">
                        <div className="size-1.5 rounded-full" style={{ backgroundColor: color }} />
                        
                        <p className="text-sm text-muted-foreground">
                            expenses                        
                        </p>
                    </div>    
                        <p className="text-sm text-right font-medium" >
                            {formatCurrency(value * -1)}
                        </p>
                 </div>
            </div>
        </div>
    )
}


    