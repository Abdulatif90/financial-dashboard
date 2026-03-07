import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import type { Matcher, OnSelectHandler } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

type Props = {
    value?: Date;
    onChange?: OnSelectHandler<Date | undefined>;
    disable?: boolean;
    disabledDates?: Matcher | Matcher[];
};

export const DatePicker = ({
    value,
    onChange,
    disable,
    disabledDates,
}: Props) =>  {
    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    disabled={disable}
                    className={cn(
                        "w-full justify-start text-left font-normal",
                        !value && "text-muted-foreground"
                    )}
                >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {value ? format(value, "PPP") : "Pick a date"}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                    mode="single"
                    selected={value}
                    onSelect={onChange}
                    disabled={disable ? true : disabledDates}
                    initialFocus
                />
            </PopoverContent>
        </Popover>
    );
};
