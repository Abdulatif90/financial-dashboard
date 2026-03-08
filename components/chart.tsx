import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    } from "@/components/ui/card";
import { 
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

import { ResponsiveContainer, LineChart, Line, Tooltip } from "recharts";

import { useState } from "react";
import { AreaChart, FileSearch } from "lucide-react";
import { AreaVariant } from "@/components/aria-variant";
import { LineVariant } from "@/components/line-variant";
import { BarVariant } from "@/components/bar-variant";



type Props = {
    data?: {
        date: string;
        income: number;
        expenses: number;
    }[]
}           

export const Chart = ({ data = [] }: Props) => {
    const [ chartType, setChartType] = useState("area");
    const onTypeChange = (type: string) => {
        //TODO paywall
        setChartType(type);
    };

    return (
        <Card className="border-none drop-shadow-sm" >
            <CardHeader className="flex space-y-2 lg:space-y-0 lg:flex-row lg:items-center justify-between" >
                <CardTitle className="text-xl line-clamp-1" >
                    Transactions
                </CardTitle>
                <Select 
                onValueChange={onTypeChange} 
                defaultValue={chartType} >
                    <SelectTrigger className="lg:w-auto h-9 rounded-md px-3" >
                        <SelectValue placeholder="Select chart type" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="area" >
                            <div className="flex items-center gap-x-2" >
                                <AreaChart className="size-4 mr-2 shrink-0" />
                                <p className="line-clamp-1" >
                                    Area Chart
                                </p>
                            </div>
                        </SelectItem>
                        <SelectItem value="line" >
                            <div className="flex items-center gap-x-2" >
                                <LineChart className="size-4 mr-2 shrink-0" />
                                <p className="line-clamp-1" >
                                    Line Chart
                                </p>
                            </div>  
                        </SelectItem>
                        <SelectItem value="bar" >
                            <div className="flex items-center gap-x-2" >
                                <AreaChart className="size-4 mr-2 shrink-0" />
                                <p className="line-clamp-1" >
                                    Bar Chart
                                </p>
                            </div>  
                        </SelectItem>
                    </SelectContent>
                </Select>
            </CardHeader>
            <CardContent>
                {data.length === 0 ? (
                    <div className="flex flex-col gap-y-4 items-center justify-center h-88.5 w-full" >
                        <FileSearch className="text-sm text-muted-foreground" />
                        <p className="text-sm text-muted-foreground" >
                            No transactions found for the selected period.
                        </p>
                    </div>
                ) : (
                    //<AreaVariant data={data} />
                  // <BarVariant data ={data}/> bu yerda tayor barchart bor va bar compnenti ham o`zgartirish kerak bolsa areani ochirib Bar variant qilib qo`yish kifoya
                    <LineVariant data={data} />
                )
                }  
            </CardContent>
        </Card>
     );
}