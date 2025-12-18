// Debug logging utility for tracking all app operations
// Usage: debug.log('context', 'message', data)

type LogLevel = 'log' | 'warn' | 'error' | 'success'

interface DebugLog {
  timestamp: string
  context: string
  message: string
  level: LogLevel
  data?: any
}

class DebugLogger {
  private logs: DebugLog[] = []
  private maxLogs = 500

  log(context: string, message: string, data?: any) {
    this.addLog(context, message, 'log', data)
  }

  warn(context: string, message: string, data?: any) {
    this.addLog(context, message, 'warn', data)
  }

  error(context: string, message: string, data?: any) {
    this.addLog(context, message, 'error', data)
  }

  success(context: string, message: string, data?: any) {
    this.addLog(context, message, 'success', data)
  }

  private addLog(context: string, message: string, level: LogLevel, data?: any) {
    const timestamp = new Date().toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3,
    })

    const logEntry: DebugLog = {
      timestamp,
      context,
      message,
      level,
      data,
    }

    this.logs.push(logEntry)

    // Keep only recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs)
    }

    // Console output with styling
    const color = this.getColor(level)
    const icon = this.getIcon(level)
    const dataStr = data ? ` ${JSON.stringify(data)}` : ''

    console.log(
      `%c${icon} [${timestamp}] ${context}: ${message}${dataStr}`,
      `color: ${color}; font-weight: bold; background-color: rgba(0,0,0,0.05); padding: 2px 4px; border-radius: 3px;`
    )
  }

  private getColor(level: LogLevel): string {
    switch (level) {
      case 'log':
        return '#0066cc' // Blue
      case 'warn':
        return '#ff9900' // Orange
      case 'error':
        return '#cc0000' // Red
      case 'success':
        return '#00aa00' // Green
      default:
        return '#333333' // Black
    }
  }

  private getIcon(level: LogLevel): string {
    switch (level) {
      case 'log':
        return '📋'
      case 'warn':
        return '⚠️'
      case 'error':
        return '❌'
      case 'success':
        return '✅'
      default:
        return '📌'
    }
  }

  getLogs(): DebugLog[] {
    return [...this.logs]
  }

  clearLogs() {
    this.logs = []
    console.log('%c🧹 Debug logs cleared', 'color: #666; font-weight: bold;')
  }

  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2)
  }

  downloadLogs() {
    const dataStr = this.exportLogs()
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr)
    const exportFileDefaultName = `debug-logs-${new Date().toISOString()}.json`

    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', exportFileDefaultName)
    linkElement.click()

    console.log('📥 Debug logs downloaded:', exportFileDefaultName)
  }

  printSummary() {
    const summary = {
      total: this.logs.length,
      logs: this.logs.filter(l => l.level === 'log').length,
      warnings: this.logs.filter(l => l.level === 'warn').length,
      errors: this.logs.filter(l => l.level === 'error').length,
      successes: this.logs.filter(l => l.level === 'success').length,
    }

    console.table(summary)
    console.log('%cAll Logs:', 'font-weight: bold; font-size: 14px;')
    console.table(this.logs)
  }
}

// Export singleton instance
export const debug = new DebugLogger()

// Make available globally in browser console
if (typeof window !== 'undefined') {
  ; (window as any).debug = debug
}
