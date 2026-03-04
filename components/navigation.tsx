"use client"
import { useState } from "react"
import { useMedia } from "react-use"
import { Menu } from "lucide-react";
import  { usePathname, useRouter } from "next/navigation";
import { NavButton } from "@/components/nav-button";

import {
    Sheet,
    SheetContent,
    SheetTrigger,
    SheetTitle
} from "@/components/ui/sheet"
import { Button } from "./ui/button";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";


const routes =[ 
{
    href: "/",
    label: "Overview",
},
{
    href: "/transactions",
    label: "Transactions",
},
{
    href: "/accounts",
    label: "Accounts",
},
{
    href: "/categories",
    label: "Categories",
},
{
    href: "/settings",
        label: "Setttings",
},
]

export const Navigation = () => {
    const [isOpen, setIsOpen] =useState(false)
    
    const router =  useRouter();
    const pathname = usePathname();
    const isMobile = useMedia("(max-width:1024px)", false);

    const onClick = (href:string) => {
        router.push(href)
        setIsOpen(false)
    }

    if (isMobile) {
        return (
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetTrigger asChild>
                    <Button 
                    variant="outline" 
                    size="sm" 
                    className="border-none focus-visible:ring-offset-0 focus-visible:ring-transparent outline-none bg-white/10 hover:bg-white/20 text-white hover:text-white focus:bg-white/30 transition">
                        <Menu className="size-4"/>    
                    </Button>
                </SheetTrigger>
                <SheetContent side="left" className="px-2">
                    <VisuallyHidden>
                        <SheetTitle>Navigation Menu</SheetTitle>
                    </VisuallyHidden>
                    <nav className="flex flex-col items-center gap-y-2 pt-6">
                        {routes.map((route) => (
                            <Button 
                                key={route.href}
                                variant={route.href === pathname ? "secondary" : "ghost"}
                                onClick={() => onClick(route.href)}
                            >
                                {route.label}
                            </Button>
                        ))}
                    </nav>
                </SheetContent>
            </Sheet>
        )
    }
    return (
        <nav className="hidden lg:flex items-center gap-x-2 overflow-x-auto text-bold">
            {routes.map((route) => (
                // <p key={route.href}>{route.label}</p>
                <NavButton 
                    key={route.href}
                    href={route.href}
                    label={route.label}
                    isActive={pathname === route.href} 
                />
))}
        </nav>
    )   
}
