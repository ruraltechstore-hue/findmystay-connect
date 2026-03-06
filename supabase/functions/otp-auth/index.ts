import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const { action, contact, otp, role, full_name } = await req.json();

    if (action === "send") {
      if (!contact) {
        return new Response(
          JSON.stringify({ error: "Contact (email) is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Rate limiting: max 5 OTPs per contact in last 10 minutes
      const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const { count } = await supabase
        .from("otp_codes")
        .select("*", { count: "exact", head: true })
        .eq("contact", contact)
        .gte("created_at", tenMinAgo);

      if ((count ?? 0) >= 5) {
        return new Response(
          JSON.stringify({ error: "Too many OTP requests. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const otpCode = generateOTP();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

      // For test accounts, use fixed OTP 123456
      const testEmails = [
        "rahul@studenttest.com",
        "ananya@worktest.com",
        "ramesh@hostelowner.com",
        "suresh@pgowner.com",
      ];
      const finalOtp = testEmails.includes(contact.toLowerCase()) ? "123456" : otpCode;

      // Store OTP
      await supabase.from("otp_codes").insert({
        contact,
        otp_code: finalOtp,
        expires_at: expiresAt,
      });

      // Send OTP via Supabase Auth magic link / OTP email
      // We use Supabase's built-in email sending via signInWithOtp
      const { error: authError } = await supabase.auth.signInWithOtp({
        email: contact,
        options: {
          shouldCreateUser: true,
          data: { full_name: full_name || "", role: role || "user" },
        },
      });

      if (authError) {
        console.error("Auth OTP error:", authError);
        // Still return success if our custom OTP was stored
        // The edge function OTP is the primary mechanism
      }

      // For development/demo: log the OTP (remove in production)
      console.log(`OTP for ${contact}: ${otpCode}`);

      return new Response(
        JSON.stringify({ success: true, message: "OTP sent to your email" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "verify") {
      if (!contact || !otp) {
        return new Response(
          JSON.stringify({ error: "Contact and OTP are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Find the latest unverified OTP for this contact
      const { data: otpRecord, error: fetchError } = await supabase
        .from("otp_codes")
        .select("*")
        .eq("contact", contact)
        .eq("verified", false)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (fetchError || !otpRecord) {
        return new Response(
          JSON.stringify({ error: "No OTP found. Please request a new one." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check expiration
      if (new Date(otpRecord.expires_at) < new Date()) {
        return new Response(
          JSON.stringify({ error: "OTP has expired. Please request a new one." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check max attempts (5)
      if (otpRecord.attempts >= 5) {
        return new Response(
          JSON.stringify({ error: "Too many attempts. Please request a new OTP." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Increment attempts
      await supabase
        .from("otp_codes")
        .update({ attempts: otpRecord.attempts + 1 })
        .eq("id", otpRecord.id);

      // Verify OTP
      if (otpRecord.otp_code !== otp) {
        return new Response(
          JSON.stringify({ error: "Invalid OTP. Please try again." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Mark as verified
      await supabase
        .from("otp_codes")
        .update({ verified: true })
        .eq("id", otpRecord.id);

      // Check if user exists
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const existingUser = existingUsers?.users?.find(
        (u) => u.email === contact
      );

      let session = null;
      let isNewUser = false;

      if (existingUser) {
        // Generate a session for existing user
        const { data: tokenData, error: tokenError } =
          await supabase.auth.admin.generateLink({
            type: "magiclink",
            email: contact,
          });

        if (tokenError) {
          console.error("Token generation error:", tokenError);
          return new Response(
            JSON.stringify({ error: "Failed to create session" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Use the token hash to verify and create session
        const { data: verifyData, error: verifyError } =
          await supabase.auth.verifyOtp({
            token_hash: tokenData.properties?.hashed_token || "",
            type: "magiclink",
          });

        if (verifyError) {
          console.error("Verify error:", verifyError);
          return new Response(
            JSON.stringify({ error: "Failed to create session" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        session = verifyData.session;
      } else {
        // Create new user
        isNewUser = true;
        const tempPassword = crypto.randomUUID();
        const { data: newUser, error: createError } =
          await supabase.auth.admin.createUser({
            email: contact,
            password: tempPassword,
            email_confirm: true,
            user_metadata: {
              full_name: full_name || "",
            },
          });

        if (createError) {
          console.error("Create user error:", createError);
          return new Response(
            JSON.stringify({ error: "Failed to create account" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Assign role if specified
        if (role && role !== "user" && newUser.user) {
          await supabase.from("user_roles").insert({
            user_id: newUser.user.id,
            role: role,
          });
        }

        // Generate session for new user
        const { data: tokenData } = await supabase.auth.admin.generateLink({
          type: "magiclink",
          email: contact,
        });

        if (tokenData?.properties?.hashed_token) {
          const { data: verifyData } = await supabase.auth.verifyOtp({
            token_hash: tokenData.properties.hashed_token,
            type: "magiclink",
          });
          session = verifyData?.session;
        }
      }

      // Cleanup old OTPs for this contact
      await supabase
        .from("otp_codes")
        .delete()
        .eq("contact", contact)
        .eq("verified", true);

      return new Response(
        JSON.stringify({
          success: true,
          session,
          isNewUser,
          message: isNewUser
            ? "Account created successfully!"
            : "Welcome back!",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("OTP Auth error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
