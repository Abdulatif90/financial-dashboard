import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

import { eachDayOfInterval, isSameDay, subDays, format } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const CATEGORY_COLORS = [
        "#0f766e",
        "#2563eb",
        "#f97316",
        "#dc2626",
        "#7c3aed",
        "#ca8a04",
        "#0891b2",
        "#4338ca",
];


export function formatCurrency(amount: number, currency: string = "USD") {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
    }).format(amount);
};

export function getCategoryColor(name: string, index = 0) {
    if (name.trim().toLowerCase() === "other") {
        return "#94a3b8";
    }

    let hash = 0;

    for (let i = 0; i < name.length; i += 1) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }

    const colorIndex = Math.abs(hash || index) % CATEGORY_COLORS.length;

    return CATEGORY_COLORS[colorIndex];
}

export function formatDate(date: Date) {
    return new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
    }).format(date);
};


export function calculatePercentageChange(
  current: number, 
  previous: number) {
    if (previous === 0) {
        return current === 0 ? 0 : 100; // Handle division by zero
    }

    return ((current - previous) / Math.abs(previous)) * 100;
}

export function fillMissingDays (
    activeDays: {date: Date; income: number; expenses: number}[],
    startDate: Date,
    endDate: Date,
) {
   if (activeDays.length === 0) {
    return [];    
   }
   const allDays = eachDayOfInterval({
    start: startDate,
    end: endDate
   });
   const transactionsByDay = allDays.map(day => {
    const found = activeDays.find(activeDay => isSameDay(activeDay.date, day));
    if (found) {
        return found;
    }
    return {
        date: day,
        income: 0,
        expenses: 0,
    }
   });
   return transactionsByDay;
}


    type Period= { 
    from: string | Date | undefined;
    to: string | Date | undefined;
    }

  export function formatDateRange ( period? : Period) {
    const defaultTo= new Date();
        const defaultFrom = subDays (defaultTo, 29);
    
    if(!period?.from){
        return `${format(defaultFrom,"LLL dd")} - ${format(defaultTo, "LLL dd, y")}`;
    }
  
  if(!period?.to){
        return `${format(defaultFrom,"LLL dd")} - ${format(defaultTo, "LLL dd, y")}`;
    }

        return `${format(period.from, "LLL dd")} - ${format(period.to, "LLL dd, y")}`;
  }


  export function formatPercentage(
    value: number,
    options: { addPrefix?: boolean } = {
        addPrefix: false,
    }
) {
    const result =new Intl.NumberFormat("en-US", {
        style: "percent",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value / 100);

    if( options.addPrefix && value !== 0) {
        return `${value > 0 ? "+" : ""}${result}`;
    }

    return result;
    }