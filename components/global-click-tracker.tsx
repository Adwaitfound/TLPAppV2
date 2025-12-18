"use client"

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { debug } from '@/lib/debug'
import { logAuditEvent } from '@/app/actions/audit-log'
// Rate limiting: track last log time to prevent flooding
let lastLogTime = 0
const MIN_LOG_INTERVAL = 500 // ms - max 2 clicks/second logged


function getElementSelector(el: Element | null): string {
  if (!el || !(el instanceof Element)) return ''
  const parts: string[] = []
  let node: Element | null = el
  let depth = 0
  while (node && depth < 5) {
    const name = node.tagName.toLowerCase()
    const id = node.id ? `#${node.id}` : ''
    const cls = node.className && typeof node.className === 'string' ?
      '.' + node.className.trim().split(/\s+/).slice(0, 3).join('.') : ''
    parts.unshift(`${name}${id}${cls}`)
    node = node.parentElement
    depth++
  }
  return parts.join(' > ')
}

export function GlobalClickTracker() {
  const pathname = usePathname()

  useEffect(() => {
    const handler = async (e: MouseEvent) => {
      try {
        const target = e.target as HTMLElement | null
        if (!target) return

        // Ignore clicks inside debug console
        const ignore = target.closest('[data-debug-ignore="true"]')
        if (ignore) return

        // Rate limiting: prevent flooding
        const now = Date.now()
        if (now - lastLogTime < MIN_LOG_INTERVAL) {
          return // Skip this click to prevent flooding
        }
        lastLogTime = now

        const role = target.getAttribute('role') || undefined
        const typeAttr = (target as HTMLButtonElement).type || undefined
        const textContent = (target.innerText || target.textContent || '').trim().slice(0, 80)
        const dataset = { ...target.dataset }
        const selector = getElementSelector(target)

        // Get button/link details
        const clickable = target.closest('button, a, [role="button"]')
        const buttonName =
          target.getAttribute('aria-label') ||
          target.getAttribute('data-name') ||
          target.getAttribute('name') ||
          target.getAttribute('id') ||
          textContent.substring(0, 50)

        const href = clickable?.getAttribute('href') || ''
        const currentUrl = typeof window !== 'undefined' ? window.location.href : ''

        debug.log('CLICK', 'Global click captured', {
          path: pathname,
          selector,
          role,
          type: typeAttr,
          text: textContent,
          dataset: Object.keys(dataset).length ? dataset : undefined,
        })

        // Log to audit system (async, non-blocking, with timeout)
        const logPromise = logAuditEvent({
          action: 'view',
          entityType: 'user',
          entityName: `Click: ${buttonName || textContent || selector}`,
          details: {
            elementType: target.tagName.toLowerCase(),
            buttonText: textContent,
            buttonName,
            href,
            currentUrl,
            pathname,
            selector,
            role,
            type: typeAttr,
            timestamp: new Date().toISOString(),
          },
          status: 'success',
        })

        // Add timeout to prevent long-running requests
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Logging timeout')), 5000)
        )

        await Promise.race([logPromise, timeoutPromise]).catch((error) => {
          // Silently fail - don't disrupt user experience
          console.debug('[GlobalClickTracker] Failed to log click:', error)
        })
      } catch (error) {
        // Catch any unexpected errors
        console.debug('[GlobalClickTracker] Error in handler:', error)
      }
    }

    document.addEventListener('click', handler, true)
    return () => document.removeEventListener('click', handler, true)
  }, [pathname])

  return null
}
