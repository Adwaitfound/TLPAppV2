import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface StatCardProps {
  title: string
  value: string | number
  change?: string
  trend?: 'up' | 'down' | 'neutral'
  icon?: LucideIcon
  iconClassName?: string
}

export function StatCard({ 
  title, 
  value, 
  change, 
  trend = 'neutral', 
  icon: Icon,
  iconClassName 
}: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {Icon && (
          <Icon className={cn("h-4 w-4 text-muted-foreground", iconClassName)} />
        )}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change && (
          <div className="flex items-center gap-1 text-xs">
            {trend === 'up' && (
              <TrendingUp className="h-3 w-3 text-green-500" />
            )}
            {trend === 'down' && (
              <TrendingDown className="h-3 w-3 text-red-500" />
            )}
            <span className={cn(
              trend === 'up' && "text-green-500",
              trend === 'down' && "text-red-500",
              trend === 'neutral' && "text-muted-foreground"
            )}>
              {change}
            </span>
            <span className="text-muted-foreground">from last period</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
