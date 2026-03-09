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
import { Skeleton } from "@/components/ui/skeleton";

import { useState } from "react";
import { FileSearch, Loader2, PieChart, Radar, Target } from "lucide-react";
import { PieVariant } from "@/components/pie-variant";
import { RadarVariant } from "@/components/radar-variant";
import { RadialVariant } from "@/components/radial-variant";




type Props = {
    data?: {
        name: string;
        value: number;
    }[]
}           

export const SpendingPie = ({ data = [] }: Props) => {
    const [ chartType, setChartType] = useState("pie");
    const onTypeChange = (type: string) => {
        //TODO paywall
        setChartType(type);
    };

    return (
        <Card className="border-none drop-shadow-sm" >
            <CardHeader className="flex space-y-2 lg:space-y-0 lg:flex-row lg:items-center justify-between" >
                <CardTitle className="text-xl line-clamp-1" >
                    Categories
                </CardTitle>
                <Select 
                onValueChange={onTypeChange} 
                defaultValue={chartType} >
                    <SelectTrigger className="lg:w-auto h-9 rounded-md px-3" >
                        <SelectValue placeholder="Select pie type" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="pie" >
                            <div className="flex items-center gap-x-2" >
                                <PieChart className="size-4 mr-2 shrink-0" />
                                <p className="line-clamp-1" >
                                    Pie Chart
                                </p>
                            </div>
                        </SelectItem>
                        <SelectItem value="radar" >
                            <div className="flex items-center gap-x-2" >
                                <Radar className="size-4 mr-2 shrink-0" />
                                <p className="line-clamp-1" >
                                    Radar Chart
                                </p>
                            </div>  
                        </SelectItem>
                        <SelectItem value="radial" >
                            <div className="flex items-center gap-x-2" >
                                <Target className="size-4 mr-2 shrink-0" />
                                <p className="line-clamp-1" >
                                    Radial Chart
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
                    <>
                    {chartType === "pie" && <PieVariant data={data} />}
                    {chartType === "radar" && <RadarVariant data={data} />}
                    {chartType === "radial" && <RadialVariant data={data} />}
                    </>
                )
                }  
            </CardContent>
        </Card>
     );
}

export const SpendingPieLoading = () => {
    return (
        <Card className="border-none drop-shadow-sm" >
            <CardHeader className="flex space-y-2 lg:space-y-0 lg:flex-row lg:items-center justify-between" >
                <Skeleton className="w-24 h-8" />
                <Skeleton className="w-32 h-9 rounded-md lg:30" />
            </CardHeader>   
            <CardContent>
                <div className="flex flex-col gap-y-4 items-center justify-center h-88.5 w-full" >
                    <Loader2 className="text-sm text-muted-foreground animate-spin" />
                </div>
            </CardContent>
        </Card>
     );
}