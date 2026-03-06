import { useState } from "react";
import { MessageSquareWarning, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const mockComplaints = [
  { id: "1", hostel: "Sunrise Boys PG", user: "Rahul K.", type: "Cleanliness", status: "open", date: "2026-03-04", description: "Rooms are not cleaned regularly as promised." },
  { id: "2", hostel: "Green Valley Hostel", user: "Priya S.", type: "Safety", status: "investigating", date: "2026-03-03", description: "CCTV cameras not working for 2 weeks." },
  { id: "3", hostel: "City Centre PG", user: "Amit R.", type: "Fraud", status: "resolved", date: "2026-03-01", description: "Photos on listing don't match actual property." },
];

const statusStyles: Record<string, string> = {
  open: "bg-destructive/10 text-destructive",
  investigating: "bg-amber-500/10 text-amber-600",
  resolved: "bg-verified/10 text-verified",
};

const statusIcons: Record<string, typeof AlertTriangle> = {
  open: AlertTriangle,
  investigating: Clock,
  resolved: CheckCircle2,
};

const AdminComplaints = () => {
  const [complaints] = useState(mockComplaints);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-heading font-semibold text-lg flex items-center gap-2">
          <MessageSquareWarning className="w-5 h-5 text-destructive" /> Complaints & Issues
        </h2>
        <Badge variant="secondary" className="font-mono">{complaints.length}</Badge>
      </div>

      {complaints.length === 0 ? (
        <div className="text-center py-12 bg-card rounded-2xl border border-border/50">
          <MessageSquareWarning className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">No complaints to review</p>
        </div>
      ) : (
        <div className="space-y-2">
          {complaints.map((c, i) => {
            const StatusIcon = statusIcons[c.status] || AlertTriangle;
            return (
              <motion.div
                key={c.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.03 }}
                className="bg-card rounded-xl border border-border/50 p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                    <StatusIcon className="w-4 h-4 text-destructive" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <p className="font-heading font-semibold text-sm">{c.hostel}</p>
                      <Badge className={`${statusStyles[c.status]} text-[10px]`}>{c.status}</Badge>
                      <Badge variant="outline" className="text-[10px]">{c.type}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{c.description}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">Reported by {c.user} • {c.date}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {c.status !== "resolved" && (
                      <Button variant="ghost" size="sm" className="h-7 text-[10px] px-2">
                        Resolve
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminComplaints;
