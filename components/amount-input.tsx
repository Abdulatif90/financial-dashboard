import CurrencyInput from "react-currency-input-field";
import { Info, MinusCircle, PlusCircle } from "lucide-react";

import { cn } from "@/lib/utils";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
    TooltipProvider,
} from "@/components/ui/tooltip";

type Props = {
    value: string;
    onChange: (value: string | undefined) => void;
    disabled?: boolean;
    placeholder?: string;
};

export const AmountInput = ({
    value,
    onChange,
    disabled,
    placeholder,
}: Props) => {
    const parseValue = parseFloat(value.replace(/,/g, ""));
    const isIncome = parseValue > 0;
    const isExpense = parseValue < 0;

    const onReversevalue = () => {
        if( !value ) return;

        const newValue = parseFloat(value)*-1;
        onChange(newValue.toString());
    };

    return (
        <div className="relative">
            <TooltipProvider>
                <Tooltip delayDuration={100}>
                    <TooltipTrigger asChild>
                        <button
                            type="button"
                            onClick={onReversevalue}
                            className={cn(
                                "absolute right-2 top-1/3 -translate-y-1/3 rounded focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                                isIncome ? "text-green-500" : isExpense ? "text-red-500" : "text-gray-500"
                            )}
                            >
                                {!parseValue && <Info className="size-3 text-while" />}
                                {!isIncome && <PlusCircle className="size-3 text-while" />}
                                {!isExpense && <MinusCircle className="size-3 text-while" />}
                        </button>
                    </TooltipTrigger>
                    <TooltipContent>
                        Use [+] for income and [-] for expense
                    </TooltipContent>
                </Tooltip>    
            </TooltipProvider>
            <CurrencyInput
                prefix="$"
                className={cn(
                    "w-full rounded border border-input bg-transparent px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                )}
                value={value}
                onValueChange={onChange}
                disabled={disabled}
                placeholder={placeholder}
                decimalScale={2}
                decimalsLimit={2}
            />
            <p className="mt-1 text-sm text-muted-foreground">
                {isIncome && "This will be recorded as income."}
                {isExpense && "This will be recorded as expense."}
            </p>
        </div>
    );  
};