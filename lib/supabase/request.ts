import { debug } from "@/lib/debug"

export async function withSupabase<T>(
    context: string,
    action: () => Promise<{ data: T | null; error: any }>
): Promise<{ data: T | null; error: any }> {
    try {
        const { data, error } = await action()
        if (error) {
            debug.error(context, error.message || "Supabase error", {
                code: error.code,
                details: error.details,
                hint: error.hint,
            })
            return { data: null as T | null, error }
        }
        debug.success(context, "Supabase call succeeded")
        return { data: data as T | null, error: null }
    } catch (err: any) {
        debug.error(context, err?.message || "Unexpected Supabase failure", {
            stack: err?.stack,
        })
        return { data: null as T | null, error: err }
    }
}
