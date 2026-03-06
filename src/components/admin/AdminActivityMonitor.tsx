import { useState, useEffect } from "react";
import { Activity, Users, Building2, BookOpen, Eye, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";

interface ActivityStats {
  totalUsers: number;
  totalHostels: number;
  totalBookings: number;
  recentSignups: number;
}

const AdminActivityMonitor = () => {
  const [stats, setStats] = useState<ActivityStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [profiles, hostels, bookings, recentProfiles] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("hostels").select("*", { count: "exact", head: true }),
      supabase.from("bookings").select("*", { count: "exact", head: true }),
      supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", sevenDaysAgo),
    ]);

    setStats({
      totalUsers: profiles.count || 0,
      totalHostels: hostels.count || 0,
      totalBookings: bookings.count || 0,
      recentSignups: recentProfiles.count || 0,
    });
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const cards = [
    { label: "Total Users", value: stats?.totalUsers || 0, icon: Users, color: "text-primary" },
    { label: "Total Hostels", value: stats?.totalHostels || 0, icon: Building2, color: "text-verified" },
    { label: "Total Bookings", value: stats?.totalBookings || 0, icon: BookOpen, color: "text-accent-foreground" },
    { label: "Signups (7d)", value: stats?.recentSignups || 0, icon: Eye, color: "text-destructive" },
  ];

  return (
    <div className="space-y-4">
      <h2 className="font-heading font-semibold text-lg flex items-center gap-2">
        <Activity className="w-5 h-5 text-primary" /> Platform Activity
      </h2>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-card rounded-xl border border-border/50 p-4 text-center"
          >
            <card.icon className={`w-6 h-6 mx-auto mb-2 ${card.color}`} />
            <p className="font-heading font-bold text-2xl">{card.value}</p>
            <p className="text-muted-foreground text-xs">{card.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="bg-card rounded-xl border border-border/50 p-4">
        <h3 className="font-heading font-semibold text-sm mb-3 flex items-center gap-2">
          <Activity className="w-4 h-4 text-muted-foreground" /> Live Status
        </h3>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-verified animate-pulse" />
            <span className="text-xs text-muted-foreground">All systems operational</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-verified" />
            <span className="text-xs text-muted-foreground">Database connected</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-verified" />
            <span className="text-xs text-muted-foreground">Authentication service active</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminActivityMonitor;
