import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const testUsers = [
  {
    email: "rahul@studenttest.com",
    full_name: "Rahul Sharma",
    phone: "9000000001",
    role: "user" as const,
    city: "Hyderabad",
  },
  {
    email: "ananya@worktest.com",
    full_name: "Ananya Verma",
    phone: "9000000002",
    role: "user" as const,
    city: "Hyderabad",
  },
  {
    email: "ramesh@hostelowner.com",
    full_name: "Ramesh Hostel Owner",
    phone: "9000000010",
    role: "owner" as const,
    city: "Hyderabad",
    hostel: { name: "Green Leaf Boys Hostel", location: "Madhapur, Hyderabad", gender: "boys" },
  },
  {
    email: "suresh@pgowner.com",
    full_name: "Suresh PG Owner",
    phone: "9000000011",
    role: "owner" as const,
    city: "Hyderabad",
    hostel: { name: "Comfort Stay Girls Hostel", location: "Gachibowli, Hyderabad", gender: "girls" },
  },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const results: { email: string; status: string; error?: string }[] = [];

  for (const user of testUsers) {
    try {
      // Check if user exists
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const existing = existingUsers?.users?.find((u) => u.email === user.email);

      let userId: string;

      if (existing) {
        userId = existing.id;
        results.push({ email: user.email, status: "already_exists" });
      } else {
        // Create user with password for easy testing
        const { data: newUser, error } = await supabase.auth.admin.createUser({
          email: user.email,
          password: "Test@123",
          email_confirm: true,
          user_metadata: { full_name: user.full_name },
        });

        if (error || !newUser.user) {
          results.push({ email: user.email, status: "error", error: error?.message });
          continue;
        }
        userId = newUser.user.id;
        results.push({ email: user.email, status: "created" });
      }

      // Ensure profile exists with phone
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (existingProfile) {
        await supabase
          .from("profiles")
          .update({ phone: user.phone, full_name: user.full_name, email: user.email })
          .eq("user_id", userId);
      } else {
        await supabase.from("profiles").insert({
          user_id: userId,
          full_name: user.full_name,
          email: user.email,
          phone: user.phone,
        });
      }

      // Ensure correct role
      if (user.role !== "user") {
        const { data: existingRole } = await supabase
          .from("user_roles")
          .select("id")
          .eq("user_id", userId)
          .eq("role", user.role)
          .maybeSingle();

        if (!existingRole) {
          await supabase.from("user_roles").insert({ user_id: userId, role: user.role });
        }
      }

      // Create hostel listing for owners
      if ("hostel" in user && user.hostel) {
        const { data: existingHostel } = await supabase
          .from("hostels")
          .select("id")
          .eq("owner_id", userId)
          .eq("hostel_name", user.hostel.name)
          .maybeSingle();

        if (!existingHostel) {
          const { data: hostel } = await supabase.from("hostels").insert({
            owner_id: userId,
            hostel_name: user.hostel.name,
            location: user.hostel.location,
            city: user.city,
            gender: user.hostel.gender,
            property_type: "hostel",
            price_min: 5000,
            price_max: 12000,
            description: `Welcome to ${user.hostel.name}. A comfortable and affordable stay in ${user.hostel.location}.`,
            is_active: true,
            verified_status: "verified",
          }).select("id").single();

          if (hostel) {
            // Add rooms
            await supabase.from("rooms").insert([
              { hostel_id: hostel.id, sharing_type: "2-sharing", price_per_month: 7000, total_beds: 10, available_beds: 6 },
              { hostel_id: hostel.id, sharing_type: "3-sharing", price_per_month: 5500, total_beds: 15, available_beds: 9 },
              { hostel_id: hostel.id, sharing_type: "single", price_per_month: 12000, total_beds: 5, available_beds: 3 },
            ]);

            // Add facilities
            await supabase.from("facilities").insert({
              hostel_id: hostel.id,
              wifi: true,
              food: true,
              ac: false,
              laundry: true,
              parking: true,
              cctv: true,
              power_backup: true,
              geyser: true,
              washing_machine: true,
            });
          }
        }
      }
    } catch (e) {
      results.push({ email: user.email, status: "error", error: String(e) });
    }
  }

  return new Response(JSON.stringify({ success: true, results }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
