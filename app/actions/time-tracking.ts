"use server"

// Time tracking has been removed from the app.
// These actions remain as no-ops to avoid import errors in any legacy code.

type Result<T = any> = { data?: T; error?: string }

export async function clockIn(): Promise<Result> {
    return { error: "Time tracking is disabled" }
}

export async function startBreak(): Promise<Result> {
    return { error: "Time tracking is disabled" }
}

export async function endBreak(): Promise<Result> {
    return { error: "Time tracking is disabled" }
}

export async function clockOut(): Promise<Result> {
    return { error: "Time tracking is disabled" }
}

export async function getActiveTimeEntry(): Promise<Result> {
    return { data: null }
}

export async function getTimeEntries(): Promise<Result> {
    return { data: [] }
}

export async function getWeeklyTimeStats(): Promise<Result> {
    return { data: { totalHours: 0, billableHours: 0, entries: 0 } }
}
