
import {
    Cell,
    Legend,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
} from "recharts";

import { formatPercentage, getCategoryColor } from "@/lib/utils";
import { CategoryTooltip } from "./category-tooltip";

    type Props = {
        data?: {
            name: string;
            value: number;
        }[]
    }

    type LegendEntry = {
        value: string;
        payload: {
            name: string;
            value: number;
        };
    };

    export const PieVariant = ({ data = [] }: Props) => {
        return (
            <ResponsiveContainer width="100%" height={300} >
                <PieChart>
                    <Legend 
                        layout="horizontal"
                        verticalAlign="bottom"
                        align="center"
                        iconType="circle"
                        formatter={(value) => <span className="text-sm" >{value}</span>}
                        content = {({ payload }) => {
                            const legendPayload = (payload ?? []) as ReadonlyArray<LegendEntry>;

                            return (
                                <ul className="flex flex-wrap gap-4 justify-center" >
                                    {legendPayload.map((entry, index: number) => {
                                        const label = entry.value ?? entry.payload.name;

                                        return (
                                        <li key={`item-${index}`} className="flex items-center gap-x-2" >
                                           <span className="size-3 rounded-full" style={{ backgroundColor: getCategoryColor(label, index) }} /> 
                                           <span className="text-sm" >{label}</span> 
                                           <span className="text-sm text-blue-500" >({formatPercentage(entry.payload.value)})</span> 
                                         
                                        </li>
                                    )})}
                                </ul>
                            );

                        }}
                    />
                        <Tooltip content={<CategoryTooltip />} />
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={80}
                            innerRadius={40}
                            paddingAngle={5}
                            fill="#8884d8"
                            dataKey="value"
                        >
                        {data.map((_entry, index) => (
                            <Cell key={`cell-${index}`} fill={getCategoryColor(_entry.name, index)} />
                        ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatPercentage(value as number)} />
                </PieChart>
            </ResponsiveContainer>
        );
    }