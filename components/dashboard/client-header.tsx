"use client"

import Link from "next/link"
import { Bell, Search, Moon, Sun, User, LogOut, Video } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useTheme } from "next-themes"
import { useAuth } from "@/contexts/auth-context"

export function ClientHeader() {
    const { setTheme, theme } = useTheme()
    const { user, logout } = useAuth()

    const handleLogout = () => {
        logout()
    }

    return (
        <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6">
            {/* Logo/Brand */}
            <Link href="/dashboard/client" className="flex items-center gap-2 font-semibold">
                <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                    <Video className="h-5 w-5 text-primary-foreground" />
                </div>
                <span className="text-xl font-bold hidden md:inline">VideoProduction</span>
            </Link>

            {/* Navigation Links */}
            <nav className="hidden md:flex items-center gap-6 text-sm font-medium flex-1">
                <Link href="/dashboard/client" className="text-muted-foreground hover:text-foreground transition-colors">
                    Dashboard
                </Link>
                <Link href="/dashboard/client/projects" className="text-muted-foreground hover:text-foreground transition-colors">
                    Projects
                </Link>
                <Link href="/dashboard/client/invoices" className="text-muted-foreground hover:text-foreground transition-colors">
                    Invoices
                </Link>
            </nav>

            <div className="flex-1 md:flex-initial">
                <form>
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Search projects..."
                            className="w-full bg-background pl-8 md:w-[200px] lg:w-[300px]"
                        />
                    </div>
                </form>
            </div>
            <Button
                variant="ghost"
                size="icon"
                className="hidden sm:flex"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
                <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                <span className="sr-only">Toggle theme</span>
            </Button>
            <Button variant="ghost" size="icon" className="hidden sm:flex">
                <Bell className="h-5 w-5" />
                <span className="sr-only">Notifications</span>
            </Button>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                        <Avatar className="h-8 w-8">
                            <AvatarImage src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP8/5+hHgAGgwJ/lqS4VwAAAABJRU5ErkJggg==" alt="User" />
                            <AvatarFallback>CL</AvatarFallback>
                        </Avatar>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                        <div className="flex flex-col space-y-1">
                            <p className="text-sm font-medium leading-none">{user?.full_name || "Client User"}</p>
                            <p className="text-xs leading-none text-muted-foreground">
                                {user?.email || "client@company.com"}
                            </p>
                        </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                        <User className="mr-2 h-4 w-4" />
                        <span>Profile</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout}>
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Log out</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </header>
    )
}
