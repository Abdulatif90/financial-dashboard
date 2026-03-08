import { format } from "date-fns";
import {
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    CartesianGrid,  
} from "recharts";

import { CustomTooltip } from "@/components/custom-tooltip";

type Props = {
    data?: {
        date: string;
        income: number;
        expenses: number;
    }[];
};

export const BarVariant = ({ data = [] }: Props) => {
    return (
        <ResponsiveContainer width="100%" height={300} >
            <BarChart data={data} >
                <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                    axisLine={false}
                    tickLine={false}
                    dataKey="date"
                    tickFormatter={(value) => format(new Date(value), "LLL dd")}
                    style={{ fontSize: "0.75rem" }}
                    tickMargin={16} 
                    />     
                    <Tooltip content={<CustomTooltip />} />
                    <Bar
                    dataKey="income"
                    fill="#4ade80"    
                    stackId="income"
                    />
                    <Bar
                    dataKey="expenses"
                    fill="#f87171"
                    stackId="expenses"
                    />
            </BarChart>
        </ResponsiveContainer>
     );
}
