import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, Lock, Mail, Building2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const AdminLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const { user, hasRole, rolesLoaded } = useAuth();

  useEffect(() => {
    if (user && rolesLoaded) {
      if (hasRole("admin")) {
        navigate("/admin");
      }
    }
  }, [user, rolesLoaded]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setSubmitting(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error(error.message || "Invalid credentials");
        setSubmitting(false);
        return;
      }

      if (data.session) {
        // Check admin role after login
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", data.user.id)
          .eq("role", "admin");

        if (!roles || roles.length === 0) {
          await supabase.auth.signOut();
          toast.error("Access denied. Admin privileges required.");
          setSubmitting(false);
          return;
        }

        toast.success("Welcome, Admin!");
        navigate("/admin");
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left decorative */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-destructive/90 to-destructive/60 relative items-center justify-center p-12">
        <div className="absolute top-1/4 -left-20 w-64 h-64 bg-destructive/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-20 w-64 h-64 bg-primary/20 rounded-full blur-3xl" />
        <div className="relative z-10 text-center max-w-md">
          <div className="flex items-center justify-center gap-2.5 mb-8">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <span className="font-heading font-extrabold text-3xl text-white">StayNest</span>
          </div>
          <h2 className="font-heading font-bold text-3xl text-white mb-4">Admin Control Panel</h2>
          <p className="text-white/60 leading-relaxed">
            Secure access to the platform administration panel. Only authorized personnel may log in.
          </p>
          <div className="mt-8 flex items-center justify-center gap-2 text-white/40">
            <Lock className="w-5 h-5" />
            <span className="text-sm">Restricted Access • Role Verified • Audit Logged</span>
          </div>
        </div>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md space-y-6">
          <div className="lg:hidden flex items-center gap-2 mb-4">
            <div className="w-9 h-9 rounded-xl bg-destructive flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <span className="font-heading font-extrabold text-xl">StayNest Admin</span>
          </div>

          <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-3 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-xs text-destructive/80">
              This login is restricted to platform administrators only. Unauthorized access attempts are logged.
            </p>
          </div>

          <div>
            <h1 className="font-heading font-bold text-2xl mb-1">Admin Login</h1>
            <p className="text-muted-foreground text-sm">Enter your admin credentials to access the control panel</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="admin@example.com"
                  className="pl-10 h-11 rounded-xl"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder="••••••••"
                  className="pl-10 h-11 rounded-xl"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>
            <Button type="submit" size="lg" className="w-full gap-2 bg-destructive hover:bg-destructive/90 text-white" disabled={submitting}>
              {submitting ? "Authenticating..." : "Access Admin Panel"}
              {!submitting && <ShieldCheck className="w-4 h-4" />}
            </Button>
          </form>

          <p className="text-xs text-center text-muted-foreground">
            Not an admin?{" "}
            <a href="/login" className="text-primary hover:underline">Go to public login</a>
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default AdminLogin;
