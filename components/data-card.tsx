import { IconType } from "react-icons";
import { 
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
 } from "@/components/ui/card";
import { cva, VariantProps } from "class-variance-authority";
import { cn, formatCurrency, formatPercentage } from "@/lib/utils";
import { CountUp } from "@/components/count-up";
import { Skeleton } from "./ui/skeleton";


const boxVariant = cva(
    "rounded-md p-3 shrink-0",
    {
        variants: {
            variant: {
                default:"bg-secondary/50 ",
                success:"bg-green-300 ",
                danger:"bg-red-300 ",
                warning:"bg-yellow-300 ",
    }
},
    defaultVariants: {
        variant: "default"
    }}
);



const iconVariant = cva(
    "size-6",
    {
        variants: {
            variant: {
                default:"text-blue-500",
                success:"text-emerald-500",
                danger:"text-rose-500", 
                warning:"text-yellow-500",
    }
},
    defaultVariants: {
        variant: "default"  
    }}
);

type BoxVariants = VariantProps<typeof boxVariant>;
type IconVariants = VariantProps<typeof iconVariant>;

interface DataCardProps extends BoxVariants, IconVariants {
    title: string;
    value?: number;
    percentage?: number;
    icon: IconType;
    dataRange: string;
    trend?: "default" | "inverse";
}

export const DataCard = ({
    icon: Icon,
    title,
    value=0,
    percentage=0,
    dataRange,
    variant,
    trend = "default",
}: DataCardProps) => {
    const isPositive = percentage > 0;
    const isNegative = percentage < 0;

    return (
        <Card className="border-none drop-shadow-sm" >
            <CardHeader className="flex flex-row items-center justify-between gap-x-4" >
                <div className= "space-y-2" >
                    <CardTitle className = "text-2xl line-clamp-1" > 
                        {title} 
                    </CardTitle>
                    <CardDescription className="line-clamp-1" >
                        {dataRange}
                    </CardDescription>
                </div>
                <div className={cn(
                boxVariant({ variant }),
                )} >
                <Icon className={cn(
                    iconVariant({ variant }),
                    )} /> 
                </div>
            </CardHeader>
            <CardContent>
                <h1 className="font-bold text-2xl mb-2 line-clamp-1 break-all">
                    <CountUp
                    preserveValue
                    start={0}
                    end={value}
                    decimals={2}   
                    decimalPlaces={2}
                    formattingFn={formatCurrency}
                    />
                </h1>
                <p className={cn(
                    "text-muted-foreground text-sm line-clamp-1", 
                    trend === "default" && isPositive && "text-emerald-500",
                    trend === "default" && isNegative && "text-rose-500",
                    trend === "inverse" && isPositive && "text-rose-500",
                    trend === "inverse" && isNegative && "text-emerald-500"
                )} >
                 {formatPercentage(percentage, { addPrefix: true })} from last period
                </p>
            </CardContent>
        </Card>

    )
}       


export const DataCardLoading = () => {
    return (
        <Card className="border-none drop-shadow-sm" >
            <CardHeader className="flex flex-row items-center justify-between gap-x-4" >
                <div className= "space-y-2" >
                    <Skeleton className="w-24 h-6" />
                    <Skeleton className="w-24 h-4" />
                </div>
                <Skeleton className="size-10" />
            </CardHeader>
            <CardContent>
                <Skeleton className="shrink-0 w-24 h-8 mb-2" />
                <Skeleton className="shrink-0 w-40 h-4" />
            </CardContent>
        </Card>
    )
}