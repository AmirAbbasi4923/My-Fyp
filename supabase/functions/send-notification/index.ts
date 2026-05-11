import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Use the API key we already have
const RESEND_API_KEY = "re_HQWHDncn_6sYLFJCPCcSz1LcVrYwNZLev";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    try {
        const supabaseClient = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        const { record, old_record, type } = await req.json();

        // 1. Fetch Patient details (Join)
        const { data: patient } = await supabaseClient
            .from("patients")
            .select("full_name, email")
            .eq("id", record.patient_id)
            .single();

        // 2. Fetch Doctor details (Join)
        const { data: doctor } = await supabaseClient
            .from("doctors")
            .select("name")
            .eq("id", record.doctor_id)
            .single();

        if (!patient || !doctor) return new Response("Missing details", { status: 400 });

        let subject = "";
        let html = "";

        // 3. Logic: If status changed to 'confirmed'
        if (type === 'UPDATE' && record.status === 'confirmed' && old_record.status !== 'confirmed') {
            subject = "✅ Appointment Confirmed - Asaan Zindagi";
            html = `
        <div style="font-family: sans-serif; padding: 20px;">
          <h2>Your Appointment is Confirmed!</h2>
          <p>Dear ${patient.full_name},</p>
          <p>Your appointment with <strong>Dr. ${doctor.name}</strong> has been confirmed.</p>
          <p><strong>Date/Time:</strong> ${new Date(record.appointment_date).toLocaleString()}</p>
          <p>Please check your portal for a token ticket.</p>
        </div>
      `;
        }
        // Logic: If status changed to 'cancelled'
        else if (type === 'UPDATE' && record.status === 'cancelled' && old_record.status !== 'cancelled') {
            subject = "❌ Appointment Cancelled - Asaan Zindagi";
            html = `<h2>Appointment Cancelled</h2><p>Dear ${patient.full_name}, your visit with Dr. ${doctor.name} has been cancelled.</p>`;
        }

        if (subject && html) {
            await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
                body: JSON.stringify({
                    from: "Asaan Zindagi <onboarding@resend.dev>",
                    to: [patient.email],
                    subject: subject,
                    html: html,
                }),
            });
        }

        return new Response(JSON.stringify({ success: true }), { status: 200 });

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
});
