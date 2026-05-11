// This function would be deployed to Supabase Edge Functions
// Command: supabase functions deploy delete-user-data

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"

serve(async (req) => {
    try {
        const { user_id, user_role, admin_id } = await req.json()

        // 1. Init Supabase Auth Admin Client (Service Role needed)
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // 2. Delete from Auth (This kills login access immediately)
        const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(user_id)
        if (authError) throw authError

        // 3. Delete from Public Tables (Cascades to Appointments)
        // Note: If we use ON DELETE CASCADE in SQL, deleting from auth.users MIGHT cascade if references exist, 
        // but our tables (doctors/patients) reference auth.users(id).
        // Let's ensure strict cleanup.

        let table = ''
        if (user_role === 'patient') table = 'patients'
        if (user_role === 'doctor') table = 'doctors'

        if (table) {
            const { error: dbError } = await supabaseAdmin
                .from(table)
                .delete()
                .eq('id', user_id)

            if (dbError) throw dbError
        }

        // 4. Log the Audit
        await supabaseAdmin
            .from('audit_logs')
            .insert({
                admin_id: admin_id,
                action_type: 'PERMANENT_DELETE',
                target_id: user_id,
                description: `Permanently deleted ${user_role} (ID: ${user_id}) and revoked access.`
            })

        return new Response(
            JSON.stringify({ message: 'User deleted successfully' }),
            { headers: { "Content-Type": "application/json" } },
        )
    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { "Content-Type": "application/json" } },
        )
    }
})
