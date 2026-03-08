import { format } from "date-fns";
import { 
    Area,
    AreaChart,
    XAxis,
    ResponsiveContainer,
    CartesianGrid,
    Tooltip,
} from "recharts";

import { CustomTooltip } from "@/components/custom-tooltip";

type Props = {
    data: {
        date: string;
        income: number;
        expenses: number;
    }[];
};

export const AreaVariant = ({ data }: Props) => {
    return (
        <ResponsiveContainer width="100%" height={300} >
            <AreaChart data={data} >
                <CartesianGrid strokeDasharray="3 3" />
                    <defs>
                         <linearGradient id="income" x1="0" y1="0" x2="0" y2="1" >
                            <stop offset="5%" stopColor="#4ade80" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#4ade80" stopOpacity={0} />
                        </linearGradient>   
                        <linearGradient id="expenses" x1="0" y1="0" x2="0" y2="1" >
                            <stop offset="5%" stopColor="#f87171" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <XAxis 
                    axisLine={false}
                    tickLine={false}
                    dataKey="date" 
                    tickFormatter={(value) => format(new Date(value), "LLL dd")}
                    style={{ fontSize: "0.75rem" }}
                    tickMargin={16} 
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                    type="monotone"
                    dataKey="income"
                    stroke="#4ade80"    
                    fillOpacity="1"
                    fill="url(#income)"
                    stackId="income"
                    strokeWidth={2}
                    />
                    <Area
                    type="monotone"
                    dataKey="expenses"
                    stroke="#f87171"    
                    fillOpacity={1}
                    fill="url(#expenses)"
                    stackId="expense"
                    strokeWidth={2}
                    />
            </AreaChart>
        </ResponsiveContainer>
        );
}
        