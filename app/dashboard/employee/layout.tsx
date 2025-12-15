import { EmployeeHeader } from "@/components/dashboard/employee-header"

export default function EmployeeLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="flex min-h-screen w-full flex-col">
            <EmployeeHeader />
            <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
                {children}
            </main>
        </div>
    )
}
