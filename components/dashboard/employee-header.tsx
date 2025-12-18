"use client"

import { useRouter } from "next/navigation"
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

export function EmployeeHeader() {
    const { setTheme, theme } = useTheme()
    const { user, logout } = useAuth()
    const router = useRouter()

    const initials = (user?.full_name || user?.email || 'U')
        .split(/\s+/)
        .map(part => part.charAt(0))
        .join('')
        .slice(0, 2)
        .toUpperCase()

    const handleLogout = () => {
        logout()
    }

    const handleProfileClick = () => {
        console.log('🔵 Profile clicked - attempting navigation to /dashboard/employee/settings')
        console.log('🔵 Router object:', router)
        console.log('🔵 Current user:', user)
        try {
            router.push('/dashboard/employee/settings')
            console.log('✅ Navigation initiated successfully')
        } catch (error) {
            console.error('❌ Navigation error:', error)
        }
    }

    return (
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex h-14 items-center justify-between px-4 lg:h-16 lg:px-6">
                {/* Left Section: Logo */}
                <Link href="/dashboard/employee" className="flex items-center gap-2 font-semibold mr-6">
                    <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center shadow-sm">
                        <Video className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <span className="text-lg font-bold hidden sm:inline bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                        VideoProduction
                    </span>
                </Link>

                {/* Center Section: Search */}
                <div className="flex-1 max-w-md mx-4">
                    <form>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder="Search tasks..."
                                className="w-full bg-muted/50 pl-9 pr-4 h-9 rounded-full border-0 focus-visible:ring-1"
                            />
                        </div>
                    </form>
                </div>

                {/* Right Section: Actions */}
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 hidden sm:flex"
                        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                    >
                        <Sun className="h-[1.1rem] w-[1.1rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                        <Moon className="absolute h-[1.1rem] w-[1.1rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                        <span className="sr-only">Toggle theme</span>
                    </Button>
                    <Button variant="ghost" size="icon" className="h-9 w-9 hidden sm:flex">
                        <Bell className="h-[1.1rem] w-[1.1rem]" />
                        <span className="sr-only">Notifications</span>
                    </Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="relative h-9 w-9 rounded-full ml-2">
                                <Avatar className="h-9 w-9 border-2 border-primary/10">
                                    <AvatarImage src={user?.avatar_url || undefined} alt={user?.full_name || user?.email || "User"} />
                                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">{initials}</AvatarFallback>
                                </Avatar>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56" align="end" forceMount>
                            <DropdownMenuLabel className="font-normal">
                                <div className="flex flex-col space-y-1 px-2 py-1.5">
                                    <p className="text-sm font-semibold leading-none">{user?.full_name || "Employee User"}</p>
                                    <p className="text-xs leading-none text-muted-foreground mt-1">
                                        {user?.email || "employee@videoproduction.com"}
                                    </p>
                                </div>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={handleProfileClick} className="cursor-pointer">
                                <User className="mr-2 h-4 w-4" />
                                <span>Profile Settings</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600 focus:text-red-600">
                                <LogOut className="mr-2 h-4 w-4" />
                                <span>Log out</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </header>
    )
}
