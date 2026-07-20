import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Briefcase, Calendar, Clock, ExternalLink, Loader2, MapPin, Plus, Trash2, GraduationCap, User as UserIcon } from "lucide-react";
import { format } from "date-fns";
import { z } from "zod";

interface Opportunity {
  id: string; company: string; role: string; description: string; apply_url: string;
  category: string; type: string; location: string | null; deadline: string | null;
  status: "open" | "closed"; created_at: string; created_by: string;
  event_at?: string | null; conducted_by?: string | null; mode?: string | null;
  approvalStatus: "pending" | "approved" | "rejected";
}

const TYPE_OPTIONS = ["Part-time", "Full Time", "Remote", "Hybrid"];
const CATEGORY_OPTIONS = ["Job", "Internship", "Workshop"];

const mapBackendToFrontend = (opp: any): Opportunity => ({
  id: opp._id || opp.id,
  company: opp.company || "",
  role: opp.title || "",
  description: opp.description || "",
  apply_url: opp.link || "",
  category: opp.type === "job" ? "Job" : opp.type === "internship" ? "Internship" : "Workshop",
  type: opp.workType || "",
  location: opp.location || null,
  deadline: opp.deadline || null,
  status: opp.status || "open",
  created_at: opp.createdAt || new Date().toISOString(),
  created_by: typeof opp.createdBy === "object" ? opp.createdBy?._id : opp.createdBy,
  event_at: opp.eventAt || null,
  conducted_by: opp.conductedBy || null,
  mode: opp.mode || null,
  approvalStatus: opp.approvalStatus || "approved",
});

export default function Opportunities() {
  const { isKhabri, isAdmin, user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const response = await api.get("/opportunities");
      const list = response.data?.data?.opportunities || [];
      setItems(list.map(mapBackendToFrontend));
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to load opportunities");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const remove = async (id: string) => {
    if (!confirm("Delete this opportunity?")) return;
    try {
      await api.delete(`/opportunities/${id}`);
      toast.success("Deleted");
      load();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to delete opportunity");
    }
  };

  return (
    <Layout>
      <div className="container py-10">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display text-3xl md:text-4xl font-bold flex items-center gap-3">
              <Briefcase className="h-8 w-8 text-primary" /> Opportunities
            </h1>
            <p className="text-muted-foreground mt-1">Curated jobs, internships and workshops, posted by Our Admins.</p>
          </div>
          {(isAdmin || isKhabri || user?.role === "student" || user?.role === "alumni") && (
            <Button variant="hero" onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" /> {user?.role === "student" ? "Request to Upload" : "Post opportunity"}
            </Button>
          )}
        </div>

        {loading ? (
          <div className="grid md:grid-cols-2 gap-4">{Array.from({length:4}).map((_,i)=><Card key={i} className="p-5 h-40 animate-pulse bg-muted/40"/>)}</div>
        ) : items.length === 0 ? (
          <Card className="p-12 text-center text-muted-foreground">No opportunities yet.</Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {items.map((o) => {
              const isWorkshop = o.category === "Workshop";
              return (
                <Card key={o.id} onClick={() => navigate(`/opportunities/${o.id}`)} className="p-6 hover:shadow-elegant transition-smooth flex flex-col cursor-pointer" >
                  <div className="flex justify-between items-start gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-wider text-secondary font-medium flex items-center gap-1.5">
                        {isWorkshop && <GraduationCap className="h-3 w-3" />}
                        {o.category}{!isWorkshop && o.type ? ` · ${o.type}` : ""}
                      </p>
                      <h3 className="font-display font-bold text-xl mt-1">{o.role}</h3>
                      <p className="text-sm text-muted-foreground">{isWorkshop ? (o.conducted_by || o.company) : o.company}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <Badge variant={o.status === "open" ? "default" : "secondary"}>{o.status}</Badge>
                      {o.approvalStatus === "pending" && (
                        <Badge variant="outline" className="border-amber-500 text-amber-500 bg-amber-500/10">Pending Approval</Badge>
                      )}
                    </div>
                  </div>
                  <p className="text-sm mt-3 line-clamp-3">{o.description}</p>
                  <div className="flex flex-wrap gap-3 mt-3 text-xs text-muted-foreground">
                    {isWorkshop && o.conducted_by && <span className="flex items-center gap-1"><UserIcon className="h-3 w-3" /> {o.conducted_by}</span>}
                    {isWorkshop && o.event_at && <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {format(new Date(o.event_at), "PPp")}</span>}
                    {isWorkshop && o.mode && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {o.mode}{o.location ? ` · ${o.location}` : ""}</span>}
                    {!isWorkshop && o.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {o.location}</span>}
                    {!isWorkshop && o.deadline && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {format(new Date(o.deadline), "PP")}</span>}
                  </div>
                  <div className="flex gap-2 mt-auto pt-4" onClick={(e) => e.stopPropagation()}>
                    <Button asChild variant="hero" size="sm" className="flex-1">
                      <a href={o.apply_url} target="_blank" rel="noopener noreferrer">{isWorkshop ? "Register" : "Apply"} <ExternalLink className="h-3.5 w-3.5" /></a>
                    </Button>
                    {((o.created_by === user?.id) || isAdmin) && (
                      <Button variant="outline" size="icon" onClick={() => remove(o.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
      <CreateDialog open={open} onOpenChange={setOpen} onCreated={load} />
    </Layout>
  );
}

const baseSchema = z.object({
  description: z.string().trim().min(5).max(2000),
  apply_url: z.string().trim().url().max(500),
});

function CreateDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (v:boolean)=>void; onCreated: ()=>void }) {
  const { user } = useAuth();
  const [category, setCategory] = useState<"Job"|"Internship"|"Workshop">("Internship");
  const [form, setForm] = useState({
    company: "", role: "", description: "", apply_url: "",
    type: "Full Time", location: "", deadline: "",
    title: "", conducted_by: "", event_at: "", mode: "Online",
  });
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const base = baseSchema.safeParse({ description: form.description, apply_url: form.apply_url });
    if (!base.success) { toast.error(base.error.issues[0].message); return; }

    let payload: any = {
      description: base.data.description,
      link: base.data.apply_url,
    };

    if (category === "Workshop") {
      if (!form.title.trim()) { toast.error("Workshop title required"); return; }
      if (!form.conducted_by.trim()) { toast.error("Conducted by required"); return; }
      if (!form.event_at) { toast.error("Date & time required"); return; }
      payload = {
        ...payload,
        title: form.title.trim(),
        type: "workshop",
        company: form.conducted_by.trim(),
        conductedBy: form.conducted_by.trim(),
        eventAt: new Date(form.event_at).toISOString(),
        mode: form.mode,
        location: form.location || undefined,
      };
    } else {
      if (!form.company.trim()) { toast.error("Company required"); return; }
      if (!form.role.trim()) { toast.error("Role required"); return; }
      if (form.deadline) {
        const deadlineDate = new Date(form.deadline);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        deadlineDate.setHours(0, 0, 0, 0);
        if (deadlineDate < today) {
          toast.error("Deadline cannot be before today's date");
          return;
        }
      }
      payload = {
        ...payload,
        title: form.role.trim(),
        type: category === "Job" ? "job" : "internship",
        company: form.company.trim(),
        workType: form.type,
        location: form.location || undefined,
        deadline: form.deadline ? new Date(form.deadline).toISOString() : undefined,
      };
    }

    setBusy(true);
    try {
      await api.post("/opportunities", payload);
      toast.success(user?.role === "student" ? "Request submitted successfully" : "Posted"); 
      onOpenChange(false); 
      onCreated();
      setForm({ company:"", role:"", description:"", apply_url:"", type:"Full Time", location:"", deadline:"", title:"", conducted_by:"", event_at:"", mode:"Online" });
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to post opportunity");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{user?.role === "student" ? "Request Opportunity Upload" : "New opportunity"}</DialogTitle>
          <DialogDescription className="sr-only">
            {user?.role === "student" 
              ? "Fill in the details to request a new opportunity upload." 
              : "Fill in the details to post a new opportunity."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Category</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {category === "Workshop" ? (
            <>
              <div><Label>Workshop title</Label><Input value={form.title} onChange={(e)=>setForm({...form,title:e.target.value})}/></div>
              <div><Label>Conducted by</Label><Input value={form.conducted_by} onChange={(e)=>setForm({...form,conducted_by:e.target.value})} placeholder="Speaker / Org"/></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Date & time</Label><Input type="datetime-local" value={form.event_at} onChange={(e)=>setForm({...form,event_at:e.target.value})}/></div>
                <div>
                  <Label>Mode</Label>
                  <Select value={form.mode} onValueChange={(v)=>setForm({...form,mode:v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Online">Online</SelectItem>
                      <SelectItem value="Offline">Offline</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Location / Venue (optional)</Label><Input value={form.location} onChange={(e)=>setForm({...form,location:e.target.value})} placeholder={form.mode === "Online" ? "Meeting platform" : "Venue"}/></div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Company</Label><Input value={form.company} onChange={(e)=>setForm({...form,company:e.target.value})}/></div>
                <div><Label>Role</Label><Input value={form.role} onChange={(e)=>setForm({...form,role:e.target.value})}/></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Type</Label>
                  <Select value={form.type} onValueChange={(v)=>setForm({...form,type:v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TYPE_OPTIONS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Location</Label><Input value={form.location} onChange={(e)=>setForm({...form,location:e.target.value})}/></div>
              </div>
              <div><Label>Deadline</Label><Input type="date" value={form.deadline} onChange={(e)=>setForm({...form,deadline:e.target.value})}/></div>
            </>
          )}

          <div><Label>Description</Label><Textarea rows={4} value={form.description} onChange={(e)=>setForm({...form,description:e.target.value})}/></div>
          <div><Label>{category === "Workshop" ? "Register link" : "Apply URL"}</Label><Input value={form.apply_url} onChange={(e)=>setForm({...form,apply_url:e.target.value})} placeholder="https://..."/></div>

          <Button variant="hero" className="w-full" onClick={submit} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin"/> : (user?.role === "student" ? "Submit Request" : "Publish")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
