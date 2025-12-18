'use server'

import { createServiceClient } from '@/lib/supabase/server'

export async function approveUserAccount(params: { userId: string; decision: 'approved' | 'rejected' }) {
    const { userId, decision } = params

    try {
        const supabase = createServiceClient()

        // Fetch user context first
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('id, email, full_name, role, company_name, status')
            .eq('id', userId)
            .single()

        if (userError || !userData) {
            return { success: false, error: 'User not found or cannot be fetched' }
        }

        // Update status
        const { error: updateError } = await supabase
            .from('users')
            .update({ status: decision })
            .eq('id', userId)

        if (updateError) {
            return { success: false, error: updateError.message }
        }

        // If approved and client, ensure clients row exists
        if (decision === 'approved' && userData.role === 'client') {
            const { data: existingClient, error: clientFetchError } = await supabase
                .from('clients')
                .select('id')
                .eq('user_id', userId)
                .maybeSingle()

            if (!clientFetchError && !existingClient) {
                const companyName = userData.company_name || userData.full_name || userData.email
                const contactPerson = userData.full_name || userData.email

                const { error: insertError } = await supabase.from('clients').insert({
                    user_id: userId,
                    company_name: companyName,
                    contact_person: contactPerson,
                    email: userData.email,
                    phone: null,
                    address: '',
                    status: 'active',
                    total_projects: 0,
                    total_revenue: 0,
                })

                if (insertError) {
                    return { success: false, error: `Client creation failed: ${insertError.message}` }
                }
            }
        }

        return { success: true }
    } catch (err: any) {
        return { success: false, error: err?.message || 'Unexpected error approving user' }
    }
}
