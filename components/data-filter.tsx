"use client";

import { useState } from "react";
import { differenceInCalendarDays, format, isValid, parseISO } from "date-fns";
import { CalendarIcon, RotateCcw } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const MAX_RANGE_DAYS = 30;

const parseSearchDate = (value: string | null) => {
	if (!value) {
		return undefined;
	}

	const parsedDate = parseISO(value);

	return isValid(parsedDate) ? parsedDate : undefined;
};

export const DataFilter = () => {
	const params = useSearchParams();
	const router = useRouter();
	const pathname = usePathname();
	const [open, setOpen] = useState(false);
	const [range, setRange] = useState<DateRange | undefined>();

	const from = parseSearchDate(params.get("from"));
	const to = parseSearchDate(params.get("to"));
	const queryRange = from && to
		? {
			from,
			to,
		}
		: undefined;
	const selectedRange = range ?? queryRange;

	const onOpenChange = (nextOpen: boolean) => {
		setOpen(nextOpen);

		if (nextOpen) {
			setRange(queryRange);
		} else {
			setRange(undefined);
		}
	};

	const buttonLabel = selectedRange?.from && selectedRange.to
		? `${format(selectedRange.from, "MMM dd, yyyy")} - ${format(selectedRange.to, "MMM dd, yyyy")}`
		: "Last 30 days";

	const onApply = () => {
		if (!selectedRange?.from || !selectedRange.to) {
			return;
		}

		const nextParams = new URLSearchParams(params.toString());
		nextParams.set("from", format(selectedRange.from, "yyyy-MM-dd"));
		nextParams.set("to", format(selectedRange.to, "yyyy-MM-dd"));

		const query = nextParams.toString();
		router.replace(query ? `${pathname}?${query}` : pathname);
		setRange(undefined);
		setOpen(false);
	};

	const onReset = () => {
		const nextParams = new URLSearchParams(params.toString());
		nextParams.delete("from");
		nextParams.delete("to");

		const query = nextParams.toString();
		router.replace(query ? `${pathname}?${query}` : pathname);
		setRange(undefined);
		setOpen(false);
	};

	const isApplyDisabled = !selectedRange?.from || !selectedRange.to;

	return (
		<Popover open={open} onOpenChange={onOpenChange}>
			<PopoverTrigger asChild>
				<Button
					type="button"
					variant="outline"
					className={cn(
						"w-full lg:w-auto justify-start rounded-md border-none bg-white/10 px-3 text-left font-normal text-white hover:bg-white/20 hover:text-white focus:bg-white/30 focus:ring-transparent focus:ring-offset-0",
						!selectedRange?.from && !selectedRange?.to && "text-white/80",
					)}
				>
					<CalendarIcon className="mr-2 size-4" />
					{buttonLabel}
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-auto space-y-3 p-3" align="start">
				<Calendar
					mode="range"
					selected={selectedRange}
					onSelect={setRange}
					numberOfMonths={2}
					disabled={(date) => {
						const today = new Date();

						if (date > today) {
							return true;
						}

						if (selectedRange?.from && !selectedRange.to) {
							return differenceInCalendarDays(date, selectedRange.from) > MAX_RANGE_DAYS - 1
								|| differenceInCalendarDays(selectedRange.from, date) > MAX_RANGE_DAYS - 1;
						}

						return false;
					}}
					initialFocus
				/>
				<div className="flex items-center justify-between gap-2">
					<Button type="button" variant="ghost" size="sm" onClick={onReset}>
						<RotateCcw className="mr-2 size-4" />
						Reset
					</Button>
					<Button type="button" size="sm" onClick={onApply} disabled={isApplyDisabled}>
						Apply
					</Button>
				</div>
			</PopoverContent>
		</Popover>
	);
};