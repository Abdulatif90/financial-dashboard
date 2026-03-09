"use client";

import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { HeaderLogo } from "@/components/header-logo";
import { Navigation } from "@/components/navigation";
import { WelcomeMsg } from "@/components/welcome-msg";
import { Filters } from "@/components/filters";
import { Button } from "@/components/ui/button";
import { useIsMounted } from "@/hooks/use-is-mounted";

export const Header = () => {
    const isMounted = useIsMounted();

    return (
        <header className="bg-linear-to-b from-blue-700 to-blue-500 px-4 py-8 lg:px-14 pb-36">
            <div className="max-w-screen-2xl mx-auto">  
                <div className="w-full flex items-center justify-between mb-14">
                    <div className="flex items-center lg:gap-x-16">
                        <HeaderLogo />
                        <Navigation />
                    </div>
                    {isMounted ? (
                        <>
                            <SignedIn>
                                <UserButton afterSignOutUrl="/" />
                            </SignedIn>
                            <SignedOut>
                                <div className="flex items-center gap-2">
                                    <Button asChild variant="ghost" className="text-white hover:bg-white/10 hover:text-white">
                                        <Link href="/sign-in">
                                            Sign in
                                        </Link>
                                    </Button>
                                    <Button asChild className="bg-white text-blue-700 hover:bg-blue-50">
                                        <Link href="/sign-up">
                                            Sign up
                                        </Link>
                                    </Button>
                                </div>
                            </SignedOut>
                        </>
                    ) : (
                        <Loader2 className="size-8 animate-spin text-slate-400" />
                    )}
                </div>
                <WelcomeMsg />
                <Filters/>
            </div>
        </header>
    )
}