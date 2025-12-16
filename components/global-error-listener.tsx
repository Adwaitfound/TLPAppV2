"use client"

import { useEffect } from "react"
import { debug } from "@/lib/debug"

export function GlobalErrorListener() {
    useEffect(() => {
        const onError = (event: ErrorEvent) => {
            debug.error("WINDOW_ERROR", event.message, {
                source: event.filename,
                line: event.lineno,
                column: event.colno,
                error: event.error?.stack || event.error?.message,
            })
        }

        const onRejection = (event: PromiseRejectionEvent) => {
            const reason = event.reason
            debug.error("UNHANDLED_REJECTION", reason?.message || "Unhandled promise rejection", {
                reason: typeof reason === "string" ? reason : undefined,
                stack: reason?.stack,
            })
        }

        window.addEventListener("error", onError)
        window.addEventListener("unhandledrejection", onRejection)
        return () => {
            window.removeEventListener("error", onError)
            window.removeEventListener("unhandledrejection", onRejection)
        }
    }, [])

    return null
}
