import { Badge } from "@/components/ui/badge"
import { ProjectStatus, InvoiceStatus, ClientStatus } from "@/types"

interface StatusBadgeProps {
  status: ProjectStatus | InvoiceStatus | ClientStatus | string
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const getVariant = (status: string) => {
    switch (status) {
      case 'completed':
      case 'paid':
      case 'active':
        return 'success'
      case 'in_progress':
      case 'in_review':
      case 'sent':
        return 'info'
      case 'planning':
      case 'pending':
      case 'draft':
        return 'warning'
      case 'cancelled':
      case 'overdue':
      case 'inactive':
        return 'destructive'
      default:
        return 'default'
    }
  }

  const formatStatus = (status: string) => {
    return status
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  return (
    <Badge variant={getVariant(status)}>
      {formatStatus(status)}
    </Badge>
  )
}
