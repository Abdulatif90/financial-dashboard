
import {
    RadialBar,
    RadialBarChart,
    Legend,
    ResponsiveContainer,
    Tooltip,
} from "recharts";

import { formatCurrency, getCategoryColor } from "@/lib/utils";
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

    export const RadialVariant = ({ data = [] }: Props) => {
        return (
            <ResponsiveContainer width="100%" height={300} >
                <RadialBarChart
                    cx="50%"
                    cy="50%"
                    innerRadius="10%"
                    outerRadius="80%"
                    data={data.map((item, index) => ({
                        ...item,
                        fill: getCategoryColor(item.name, index),
                    }))}
                    barSize={10}
                    >
                    <RadialBar 
                        label={{ position: "insideStart", fill: "#fff", fontSize: 12 }}
                        background 
                        dataKey="value"

                    />
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
                                           <span className="text-sm text-gray-500" >({formatCurrency(entry.payload.value)})</span> 
                                        </li>
                                    )})}
                                </ul>
                            );

                        }}
                    />
                        <Tooltip content={<CategoryTooltip />} />
                </RadialBarChart>
            </ResponsiveContainer>
        );
    }