import { format } from "date-fns";
import {
    Tooltip,
    ResponsiveContainer,
    LineChart,
    Line,
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

export const LineVariant = ({ data  }: Props) => {
    return (
        <ResponsiveContainer width="100%" height={300} >
            <LineChart data={data} >
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
                    <Line
                    dot={false}
                    dataKey="income"
                    stroke="#4ade80"    
                    strokeWidth={2}
                    className="drop-shadow-sm"
                    />
                    <Line
                    dot={false}
                    dataKey="expenses"
                    stroke="#f87171"
                    strokeWidth={2}
                    className="drop-shadow-sm"
                    />
            </LineChart>
        </ResponsiveContainer>
     );
}
