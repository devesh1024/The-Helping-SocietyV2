import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Ban, Check, Eye, FileCheck, Loader2, Search, ShieldCheck, Trash2, X, Plus, Pencil, ArrowLeft, Users } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PdfViewer } from "@/components/PdfViewer";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export default function Admin() {
  return (
    <Layout>
      <div className="container py-10">
        <h1 className="font-display text-3xl md:text-4xl font-bold flex items-center gap-3">
          <ShieldCheck className="h-8 w-8 text-secondary" /> Admin Panel
        </h1>
        <p className="text-muted-foreground mt-1">Moderate users, content and support requests.</p>

        <Tabs defaultValue="users" className="mt-8">
          <TabsList>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="resources">Resources</TabsTrigger>
            <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
            <TabsTrigger value="hackathons">Hackathons</TabsTrigger>
            <TabsTrigger value="audit">Audit Log</TabsTrigger>
          </TabsList>
          <TabsContent value="users" className="mt-6"><UsersPanel /></TabsContent>
          <TabsContent value="resources" className="mt-6"><ResourcesPanel /></TabsContent>
          <TabsContent value="opportunities" className="mt-6"><OpportunitiesPanel /></TabsContent>
          <TabsContent value="hackathons" className="mt-6"><HackathonsPanel /></TabsContent>
          <TabsContent value="audit" className="mt-6"><AuditPanel /></TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}

const mapBackendUserToProfile = (u: any) => ({
  id: u._id || u.id,
  full_name: u.fullName || "",
  email: u.email || "",
  verified: u.status === 'active',
  is_disabled: u.status === 'disabled',
  is_banned: u.status === 'banned',
  role: u.role || 'student',
});

function UsersPanel() {
  const { user, isSuperAdmin } = useAuth();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const response = await api.get("/admin/users?limit=100");
      const list = response.data?.data?.users || [];
      setProfiles(list.map(mapBackendUserToProfile));
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const canModify = (targetProfile: any) => {
    if (targetProfile.id === user?.id) return false;
    return targetProfile.role !== "admin";
  };

  const setVerified = async (target: any, v: boolean) => {
    if (!canModify(target)) { toast.error("Unauthorized action."); return; }
    try {
      if (v) {
        await api.patch(`/admin/users/${target.id}/approve`);
      } else {
        await api.patch(`/admin/users/${target.id}/reject`);
      }
      toast.success("Updated");
      load();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update user verification");
    }
  };

  const setDisabled = async (target: any, v: boolean) => {
    if (!canModify(target)) { toast.error("Unauthorized action."); return; }
    try {
      if (v) {
        await api.patch(`/admin/users/${target.id}/reject`);
      } else {
        await api.patch(`/admin/users/${target.id}/approve`);
      }
      toast.success("Updated");
      load();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update user status");
    }
  };

  const setBanned = async (target: any, v: boolean) => {
    if (target.id === user?.id) { toast.error("Unauthorized action."); return; }
    try {
      if (v) {
        await api.patch(`/admin/users/${target.id}/ban`);
      } else {
        await api.patch(`/admin/users/${target.id}/unban`);
      }
      toast.success("Updated");
      load();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update user ban status");
    }
  };

  const setRole = async (uid: string, role: string) => {
    try {
      await api.patch(`/admin/users/${uid}/role`, { role });
      toast.success("Role updated");
      load();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update role");
    }
  };

  const filteredProfiles = profiles.filter(p => 
    p.full_name?.toLowerCase().includes(search.toLowerCase()) || 
    p.email?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="py-10 grid place-items-center"><Loader2 className="animate-spin"/></div>;

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input 
          className="pl-9" 
          placeholder="Search users by name or email..." 
          value={search} 
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="space-y-3">
        {filteredProfiles.map((p) => {
        const role = p.role;
        return (
          <Card key={p.id} className="p-4 flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <p className="font-semibold">{p.full_name || "—"}</p>
              <p className="text-xs text-muted-foreground">{p.email}</p>
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {p.verified ? <Badge className="bg-primary text-primary-foreground">Verified</Badge> : <Badge variant="outline">Unverified</Badge>}
              {p.is_disabled && <Badge variant="secondary">Disabled</Badge>}
              {p.is_banned && <Badge className="bg-destructive text-destructive-foreground">Banned</Badge>}
              {role !== "student" && <Badge variant="outline">{role}</Badge>}
            </div>
            {isSuperAdmin && p.id !== user?.id && (
              <div className="flex gap-1.5">
                <Select value={role} onValueChange={(v) => setRole(p.id, v)}>
                  <SelectTrigger className="h-8 w-36"><SelectValue/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">student</SelectItem>
                    <SelectItem value="faculty">faculty</SelectItem>
                    <SelectItem value="contributor">contributor</SelectItem>
                    <SelectItem value="alumni">alumni</SelectItem>
                    <SelectItem value="admin">admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex gap-1">
              {p.id !== user?.id && canModify(p) && (
                <>
                  {!p.verified && (
                    <Button size="sm" variant="outline" onClick={() => setVerified(p, true)}>
                      Verify
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => setDisabled(p, !p.is_disabled)}>
                    {p.is_disabled ? "Enable" : "Disable"}
                  </Button>
                </>
              )}
              {isSuperAdmin && p.id !== user?.id && (
                <Button size="sm" variant="destructive" onClick={() => setBanned(p, !p.is_banned)}>
                  <Ban className="h-3 w-3"/> {p.is_banned ? "Unban" : "Ban"}
                </Button>
              )}
            </div>
          </Card>
        );
      })}
      </div>
    </div>
  );
}

function ResourcesPanel() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("pending");
  const [preview, setPreview] = useState<any>(null);

  const load = async () => {
    setLoading(true);
    try {
      let list: any[] = [];
      if (filter === "pending" || filter === "rejected" || filter === "all") {
        const statusVal = filter === "all" ? undefined : filter;
        const resReqs = await api.get(`/resource-requests?limit=100${statusVal ? `&status=${statusVal}` : ""}`);
        const reqList = resReqs.data?.data?.requests || [];
        list = list.concat(reqList.map((r: any) => ({ ...r, id: r._id, isRequest: true })));
      }
      if (filter === "approved" || filter === "all") {
        const resDocs = await api.get("/resources?limit=100");
        const docList = resDocs.data?.data?.resources || [];
        list = list.concat(docList.map((r: any) => ({ ...r, id: r._id, status: "approved", isRequest: false })));
      }
      // Sort list by date
      list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setItems(list);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to load resources");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, [filter]);

  const setStatus = async (it: any, status: "approved"|"rejected") => {
    try {
      if (status === "approved") {
        await api.patch(`/resource-requests/${it.id}/approve`);
      } else {
        await api.patch(`/resource-requests/${it.id}/reject`);
      }
      toast.success("Updated");
      load();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update request");
    }
  };

  const remove = async (it: any) => {
    if (!confirm("Delete?")) return;
    try {
      if (it.isRequest) {
        await api.patch(`/resource-requests/${it.id}/reject`);
      } else {
        await api.delete(`/resources/${it.id}`);
      }
      toast.success("Deleted");
      load();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to delete");
    }
  };

  return (
    <div>
      <div className="flex gap-2 mb-4">
        {["pending","approved","rejected","all"].map((s) => (
          <Button key={s} size="sm" variant={filter===s?"hero":"outline"} onClick={()=>setFilter(s)}>{s}</Button>
        ))}
      </div>
      {loading ? <div className="grid place-items-center py-10"><Loader2 className="animate-spin"/></div> :
        <div className="space-y-3">
          {items.map((r) => (
            <Card key={r.id} className="p-4 flex flex-wrap items-center gap-4">
              <div className="flex-1 min-w-[200px]">
                <p className="font-semibold">{r.title}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {r.category?.replace('_', ' ')} · {(r.file?.fileSize / 1024 / 1024).toFixed(2)} MB · {r.file?.fileType?.toUpperCase()}
                </p>
              </div>
              <Badge variant={r.status==="approved"?"default":r.status==="rejected"?"destructive":"outline"}>{r.status}</Badge>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" onClick={() => setPreview(r)} title="Preview">
                  <Eye className="h-3 w-3"/>
                </Button>
                {r.status === "pending" && <>
                  <Button size="sm" variant="hero" onClick={()=>setStatus(r,"approved")}><Check className="h-3 w-3"/></Button>
                  <Button size="sm" variant="outline" onClick={()=>setStatus(r,"rejected")}><X className="h-3 w-3"/></Button>
                </>}
                <Button size="sm" variant="destructive" onClick={()=>remove(r)}><Trash2 className="h-3 w-3"/></Button>
              </div>
            </Card>
          ))}
          {items.length===0 && <Card className="p-8 text-center text-muted-foreground">Nothing here.</Card>}
        </div>}

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-4xl h-[90vh] p-0 flex flex-col overflow-hidden">
          <DialogHeader className="p-4 border-b">
            <DialogTitle>Preview: {preview?.title}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 bg-muted/20">
            {preview && (
              <PdfViewer url={preview.file?.secureUrl} />
            )}
          </div>
          <div className="p-4 border-t flex justify-end gap-2 bg-background">
            {preview?.status === "pending" && (
              <>
                <Button variant="hero" onClick={() => { setStatus(preview, "approved"); setPreview(null); }}>Approve</Button>
                <Button variant="outline" onClick={() => { setStatus(preview, "rejected"); setPreview(null); }}>Reject</Button>
              </>
            )}
            <Button variant="ghost" onClick={() => setPreview(null)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AuditPanel() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const response = await api.get("/admin/audit-logs?limit=100");
        setItems(response.data?.data?.logs || []);
      } catch (error) {
        console.error("Failed to load audit logs:", error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <div className="py-10 grid place-items-center"><Loader2 className="animate-spin"/></div>;

  return (
    <div className="space-y-3">
      {items.map((a) => {
        const adminStr = a.actorId ? (a.actorId.fullName || a.actorId.email) : "Unknown Admin";
        
        return (
          <Card key={a._id || a.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <FileCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-semibold capitalize">{a.action?.replace(/_/g, " ")}</p>
                <div className="text-xs text-muted-foreground flex flex-col gap-0.5">
                  <span><strong className="font-medium text-foreground">Details:</strong> {a.details || "—"}</span>
                  <span><strong className="font-medium text-foreground">By Admin:</strong> {adminStr}</span>
                </div>
              </div>
            </div>
            <span className="text-xs text-muted-foreground whitespace-nowrap bg-secondary/50 px-2 py-1 rounded-md self-start md:self-auto">
              {formatDistanceToNow(new Date(a.createdAt || a.created_at), { addSuffix: true })}
            </span>
          </Card>
        );
      })}
      {items.length === 0 && <Card className="p-8 text-center text-muted-foreground">No actions logged.</Card>}
    </div>
  );
}

function OpportunitiesPanel() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("pending");

  const load = async () => {
    setLoading(true);
    try {
      let list: any[] = [];
      if (filter === "pending" || filter === "rejected" || filter === "all") {
        const response = await api.get(`/opportunity-requests?limit=100`);
        const reqList = response.data?.data?.opportunities || [];
        list = list.concat(reqList.map((o: any) => ({ ...o, id: o._id, isRequest: true })));
      }
      if (filter === "approved" || filter === "all") {
        const response = await api.get("/opportunities?limit=100");
        const docList = response.data?.data?.opportunities || [];
        list = list.concat(docList.map((o: any) => ({ ...o, id: o._id, approvalStatus: "approved", isRequest: false })));
      }

      if (filter !== "all") {
        list = list.filter(item => (item.approvalStatus || item.status) === filter);
      }

      list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setItems(list);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to load opportunities");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, [filter]);

  const setStatus = async (it: any, status: "approved" | "rejected") => {
    try {
      if (status === "approved") {
        await api.patch(`/opportunity-requests/${it.id}/approve`);
      } else {
        await api.patch(`/opportunity-requests/${it.id}/reject`);
      }
      toast.success("Updated");
      load();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update request");
    }
  };

  const remove = async (it: any) => {
    if (!confirm("Delete?")) return;
    try {
      if (it.isRequest && it.approvalStatus === "pending") {
        await api.patch(`/opportunity-requests/${it.id}/reject`);
      } else {
        await api.delete(`/opportunities/${it.id}`);
      }
      toast.success("Deleted");
      load();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to delete");
    }
  };

  return (
    <div>
      <div className="flex gap-2 mb-4">
        {["pending", "approved", "rejected", "all"].map((s) => (
          <Button key={s} size="sm" variant={filter === s ? "hero" : "outline"} onClick={() => setFilter(s)}>{s}</Button>
        ))}
      </div>
      {loading ? <div className="grid place-items-center py-10"><Loader2 className="animate-spin" /></div> :
        <div className="space-y-3">
          {items.map((o) => {
            const studentName = typeof o.createdBy === "object" && o.createdBy !== null ? o.createdBy.fullName : "Unknown User";
            const roleLabel = o.title;
            const companyLabel = o.company || o.conductedBy || "—";
            const approvalStatus = o.approvalStatus || o.status || "approved";
            return (
              <Card key={o.id} className="p-4 flex flex-wrap items-center gap-4">
                <div className="flex-1 min-w-[200px]">
                  <p className="font-semibold">{roleLabel} at {companyLabel}</p>
                  <p className="text-xs text-muted-foreground">
                    Submitted by: <strong className="font-medium text-foreground">@{studentName}</strong> · Type: <span className="capitalize">{o.type}</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{o.description}</p>
                </div>
                <Badge variant={approvalStatus === "approved" ? "default" : approvalStatus === "rejected" ? "destructive" : "outline"}>{approvalStatus}</Badge>
                <div className="flex gap-1">
                  {approvalStatus === "pending" && (
                    <>
                      <Button size="sm" variant="hero" onClick={() => setStatus(o, "approved")} title="Approve"><Check className="h-3 w-3" /></Button>
                      <Button size="sm" variant="outline" onClick={() => setStatus(o, "rejected")} title="Reject"><X className="h-3 w-3" /></Button>
                    </>
                  )}
                  <Button size="sm" variant="destructive" onClick={() => remove(o)} title="Delete"><Trash2 className="h-3 w-3" /></Button>
                </div>
              </Card>
            );
          })}
          {items.length === 0 && <Card className="p-8 text-center text-muted-foreground">Nothing here.</Card>}
        </div>}
    </div>
  );
}

// ==================== Hackathons ====================

// Each dropdown option maps to a small group of extensions, so admins pick one
// intuitive category (e.g. "Word Document") rather than typing raw extensions,
// while the backend's accept[] still gets a sensible multi-extension list.
const FILE_TYPE_OPTIONS = [
  { value: "pdf", label: "PDF", accept: ["pdf"] },
  { value: "word", label: "Word Document (doc, docx)", accept: ["doc", "docx"] },
  { value: "ppt", label: "PowerPoint (ppt, pptx)", accept: ["ppt", "pptx"] },
  { value: "excel", label: "Excel Spreadsheet (xlsx, csv)", accept: ["xlsx", "csv"] },
  { value: "image", label: "Image (jpg, png)", accept: ["jpg", "jpeg", "png"] },
  { value: "video", label: "Video (mp4)", accept: ["mp4"] },
  { value: "zip", label: "ZIP Archive", accept: ["zip"] },
];

const findFileTypeValues = (accept: string[] | undefined): string[] => {
  if (!accept || accept.length === 0) return [];
  return FILE_TYPE_OPTIONS.filter((opt) => opt.accept.some((e) => accept.includes(e))).map((opt) => opt.value);
};

function HackathonsPanel() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [teamsDialogId, setTeamsDialogId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const response = await api.get("/hackathons", { params: { limit: 100 } });
      let list = response.data?.data?.hackathons || [];
      if (filter !== "all") list = list.filter((h: any) => h.status === filter);
      setItems(list);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to load hackathons");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, [filter]);

  const remove = async (h: any) => {
    if (!confirm(`Delete "${h.title}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/hackathons/${h._id}`);
      toast.success("Deleted");
      load();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to delete");
    }
  };

  const setStatus = async (h: any, status: "live" | "closed") => {
    try {
      await api.put(`/hackathons/${h._id}`, { status });
      toast.success("Updated");
      load();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update status");
    }
  };

  if (reviewingId) {
    return <SubmissionsReviewPanel hackathonId={reviewingId} onBack={() => setReviewingId(null)} />;
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex gap-2">
          {["all", "draft", "live", "closed"].map((s) => (
            <Button key={s} size="sm" variant={filter === s ? "hero" : "outline"} onClick={() => setFilter(s)}>
              {s}
            </Button>
          ))}
        </div>
        <Button size="sm" variant="hero" onClick={() => { setEditing(null); setDialogOpen(true); }}>
          <Plus className="h-3.5 w-3.5 mr-1" /> New Hackathon
        </Button>
      </div>

      {loading ? (
        <div className="grid place-items-center py-10"><Loader2 className="animate-spin" /></div>
      ) : (
        <div className="space-y-3">
          {items.map((h) => (
            <Card key={h._id} className="p-4 flex flex-wrap items-center gap-4">
              <div className="flex-1 min-w-[200px]">
                <p className="font-semibold">{h.title}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {h.category.replace("_", " ")} · {h.participationMode}
                </p>
              </div>
              <Badge
                variant={h.status === "closed" ? "secondary" : "outline"}
                className={h.status === "live" ? "bg-success text-white hover:bg-success/80" : ""}
              >
                {h.status}
              </Badge>
              <div className="flex gap-1">
                {h.status === "draft" && (
                  <Button size="sm" variant="hero" onClick={() => setStatus(h, "live")} title="Publish">
                    <Check className="h-3 w-3" />
                  </Button>
                )}
                {h.status === "live" && (
                  <Button size="sm" variant="outline" onClick={() => setStatus(h, "closed")} title="Close">
                    <Ban className="h-3 w-3" />
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => { setEditing(h); setDialogOpen(true); }} title="Edit">
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button size="sm" variant="outline" onClick={() => setTeamsDialogId(h._id)} title="View Teams">
                  <Users className="h-3 w-3" />
                </Button>
                <Button size="sm" variant="outline" onClick={() => setReviewingId(h._id)} title="Review Submissions">
                  <FileCheck className="h-3 w-3" />
                </Button>
                <Button size="sm" variant="destructive" onClick={() => remove(h)} title="Delete">
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </Card>
          ))}
          {items.length === 0 && <Card className="p-8 text-center text-muted-foreground">No hackathons yet.</Card>}
        </div>
      )}

      <HackathonFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        onSaved={() => { setDialogOpen(false); load(); }}
      />
      {teamsDialogId && <TeamsDialog hackathonId={teamsDialogId} onClose={() => setTeamsDialogId(null)} />}
    </div>
  );
}

function HackathonFormDialog({
  open,
  onOpenChange,
  editing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: any | null;
  onSaved: () => void;
}) {
  const isEdit = !!editing;
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("technical");
  const [participationMode, setParticipationMode] = useState("individual");
  const [teamMin, setTeamMin] = useState("2");
  const [teamMax, setTeamMax] = useState("4");
  const [launchDate, setLaunchDate] = useState("");
  const [registrationDeadline, setRegistrationDeadline] = useState("");
  const [questions, setQuestions] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setTitle(editing.title || "");
      setDescription(editing.description || "");
      setCategory(editing.category || "technical");
      setParticipationMode(editing.participationMode || "individual");
      setTeamMin((editing.teamSize?.min ?? 2).toString());
      setTeamMax((editing.teamSize?.max ?? 4).toString());
      setLaunchDate(editing.launchDate ? editing.launchDate.slice(0, 16) : "");
      setRegistrationDeadline(editing.registrationDeadline ? editing.registrationDeadline.slice(0, 16) : "");
      setQuestions(
        (editing.extraQuestions || []).map((q: any) => ({
          ...q,
          optionsText: (q.options || []).join(", "),
          fileTypes: q.type === "file" ? findFileTypeValues(q.accept) : [],
        }))
      );
    } else {
      setTitle("");
      setDescription("");
      setCategory("technical");
      setParticipationMode("individual");
      setTeamMin("2");
      setTeamMax("4");
      setLaunchDate("");
      setRegistrationDeadline("");
      setQuestions([]);
    }
  }, [open, editing]);

  const canEditQuestions = !isEdit || editing.status === "draft";

  const addQuestion = () =>
    setQuestions((prev) => [...prev, { key: "", label: "", type: "text", required: false, optionsText: "", fileTypes: [] }]);
  const updateQuestion = (i: number, patch: any) =>
    setQuestions((prev) => prev.map((q, idx) => (idx === i ? { ...q, ...patch } : q)));
  const removeQuestion = (i: number) => setQuestions((prev) => prev.filter((_, idx) => idx !== i));

  const submit = async () => {
    if (!title.trim() || !description.trim()) {
      toast.error("Title and description are required.");
      return;
    }
    setBusy(true);
    try {
      const payload: any = {
        title,
        description,
        category,
        participationMode,
        launchDate: launchDate || undefined,
        registrationDeadline: registrationDeadline || undefined,
      };
      if (participationMode !== "individual") {
        payload.teamSize = { min: parseInt(teamMin, 10), max: parseInt(teamMax, 10) };
      }
      if (canEditQuestions) {
        payload.extraQuestions = questions.map((q) => ({
          key: q.key,
          label: q.label,
          type: q.type,
          required: q.required,
          options:
            q.type === "radio" || q.type === "checkbox"
              ? q.optionsText.split(",").map((s: string) => s.trim()).filter(Boolean)
              : undefined,
          accept:
            q.type === "file"
              ? FILE_TYPE_OPTIONS.filter((o) => (q.fileTypes || []).includes(o.value)).flatMap((o) => o.accept)
              : undefined,
        }));
      }

      if (isEdit) {
        await api.put(`/hackathons/${editing._id}`, payload);
        toast.success("Hackathon updated.");
      } else {
        await api.post("/hackathons", payload);
        toast.success("Hackathon created as draft.");
      }
      onSaved();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to save hackathon.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{isEdit ? "Edit Hackathon" : "New Hackathon"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div>
            <Label>Description (markdown supported)</Label>
            <Textarea rows={6} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="technical">Technical</SelectItem>
                  <SelectItem value="poster">Poster</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                  <SelectItem value="social_media">Social Media</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Participation Mode</Label>
              <Select value={participationMode} onValueChange={setParticipationMode}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">Individual only</SelectItem>
                  <SelectItem value="team">Team only</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {participationMode !== "individual" && (
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Min team size</Label><Input type="number" min={1} value={teamMin} onChange={(e) => setTeamMin(e.target.value)} /></div>
              <div><Label>Max team size</Label><Input type="number" min={1} value={teamMax} onChange={(e) => setTeamMax(e.target.value)} /></div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div><Label>Launch Date</Label><Input type="datetime-local" value={launchDate} onChange={(e) => setLaunchDate(e.target.value)} /></div>
            <div><Label>Registration Deadline</Label><Input type="datetime-local" value={registrationDeadline} onChange={(e) => setRegistrationDeadline(e.target.value)} /></div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Submission Questions</Label>
              {canEditQuestions && (
                <Button size="sm" variant="outline" onClick={addQuestion}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add
                </Button>
              )}
            </div>
            {!canEditQuestions && (
              <p className="text-xs text-muted-foreground mb-2">
                Questions can only be edited while the hackathon is in draft.
              </p>
            )}
            <div className="space-y-3">
              {questions.map((q, i) => (
                <Card key={i} className="p-3 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder="Key (e.g. report)"
                      value={q.key}
                      onChange={(e) => updateQuestion(i, { key: e.target.value })}
                      disabled={!canEditQuestions}
                    />
                    <Input
                      placeholder="Label (e.g. Upload your report)"
                      value={q.label}
                      onChange={(e) => updateQuestion(i, { label: e.target.value })}
                      disabled={!canEditQuestions}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2 items-center">
                    <Select value={q.type} onValueChange={(v) => updateQuestion(i, { type: v })} disabled={!canEditQuestions}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Text</SelectItem>
                        <SelectItem value="number">Number</SelectItem>
                        <SelectItem value="radio">Radio</SelectItem>
                        <SelectItem value="checkbox">Checkbox</SelectItem>
                        <SelectItem value="file">File</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`req-${i}`}
                        checked={q.required}
                        onCheckedChange={(v) => updateQuestion(i, { required: !!v })}
                        disabled={!canEditQuestions}
                      />
                      <Label htmlFor={`req-${i}`} className="font-normal">Required</Label>
                    </div>
                  </div>
                  {(q.type === "radio" || q.type === "checkbox") && (
                    <Input
                      placeholder="Options, comma separated"
                      value={q.optionsText}
                      onChange={(e) => updateQuestion(i, { optionsText: e.target.value })}
                      disabled={!canEditQuestions}
                    />
                  )}
                  {q.type === "file" && (
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground font-normal">Accepted file types</Label>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                        {FILE_TYPE_OPTIONS.map((opt) => {
                          const selectedTypes: string[] = q.fileTypes || [];
                          const checked = selectedTypes.includes(opt.value);
                          return (
                            <div key={opt.value} className="flex items-center gap-2">
                              <Checkbox
                                id={`filetype-${i}-${opt.value}`}
                                checked={checked}
                                disabled={!canEditQuestions}
                                onCheckedChange={(v) => {
                                  const next = v
                                    ? [...selectedTypes, opt.value]
                                    : selectedTypes.filter((s) => s !== opt.value);
                                  updateQuestion(i, { fileTypes: next });
                                }}
                              />
                              <Label htmlFor={`filetype-${i}-${opt.value}`} className="font-normal">
                                {opt.label}
                              </Label>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {canEditQuestions && (
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => removeQuestion(i)}>
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> Remove
                    </Button>
                  )}
                </Card>
              ))}
            </div>
          </div>

          <Button variant="hero" className="w-full" onClick={submit} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : isEdit ? "Save Changes" : "Create as Draft"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TeamsDialog({ hackathonId, onClose }: { hackathonId: string; onClose: () => void }) {
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get(`/hackathons/${hackathonId}/teams`);
        setTeams(res.data?.data?.teams || []);
      } catch (error: any) {
        toast.error(error.response?.data?.message || "Failed to load teams.");
      } finally {
        setLoading(false);
      }
    })();
  }, [hackathonId]);

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Teams</DialogTitle></DialogHeader>
        {loading ? (
          <div className="grid place-items-center py-10"><Loader2 className="animate-spin" /></div>
        ) : teams.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No teams yet.</p>
        ) : (
          <div className="space-y-2">
            {teams.map((t: any) => (
              <Card key={t._id} className="p-3">
                <p className="font-medium">
                  {t.name} <span className="text-xs text-muted-foreground font-normal">({t.joinCode})</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Leader: {t.leaderId?.fullName || t.leaderId} · Members:{" "}
                  {(t.members || []).map((m: any) => m.fullName || m).join(", ")}
                </p>
              </Card>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SubmissionsReviewPanel({ hackathonId, onBack }: { hackathonId: string; onBack: () => void }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [decidingId, setDecidingId] = useState<string | null>(null);
  const [comment, setComment] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const params: any = { limit: 100 };
      if (filter !== "all") params.decision = filter;
      const res = await api.get(`/hackathons/${hackathonId}/submissions`, { params });
      setItems(res.data?.data?.submissions || []);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to load submissions.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, [filter, hackathonId]);

  const decide = async (id: string, decision: "selected" | "rejected") => {
    try {
      await api.patch(`/hackathons/submissions/${id}/decision`, { decision, decisionComment: comment || undefined });
      toast.success("Submission reviewed.");
      setDecidingId(null);
      setComment("");
      load();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to review submission.");
    }
  };

  return (
    <div>
      <Button variant="ghost" size="sm" onClick={onBack} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Hackathons
      </Button>
      <div className="flex gap-2 mb-4">
        {["all", "pending", "selected", "rejected"].map((s) => (
          <Button key={s} size="sm" variant={filter === s ? "hero" : "outline"} onClick={() => setFilter(s)}>
            {s}
          </Button>
        ))}
      </div>
      {loading ? (
        <div className="grid place-items-center py-10"><Loader2 className="animate-spin" /></div>
      ) : items.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">No submissions.</Card>
      ) : (
        <div className="space-y-3">
          {items.map((s: any) => (
            <Card key={s._id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex-1 min-w-[240px]">
                  <p className="font-semibold">{s.title}</p>
                  <p className="text-xs text-muted-foreground">
                    By: {s.participantType === "team" ? (s.teamId?.name || "Team") : (s.userId?.fullName || "Unknown")}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{s.description}</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {s.repoUrl && <a href={s.repoUrl} target="_blank" rel="noreferrer" className="text-xs text-primary underline">Repo</a>}
                    {s.demoUrl && <a href={s.demoUrl} target="_blank" rel="noreferrer" className="text-xs text-primary underline">Demo</a>}
                    {s.videoUrl && <a href={s.videoUrl} target="_blank" rel="noreferrer" className="text-xs text-primary underline">Video</a>}
                    {(s.files || []).map((f: any) => (
                      <a key={f.key} href={f.secureUrl} target="_blank" rel="noreferrer" className="text-xs bg-muted px-2 py-0.5 rounded-full hover:bg-muted/70">
                        {f.key}
                      </a>
                    ))}
                  </div>
                </div>
                <Badge
                  variant={s.decision === "rejected" ? "destructive" : "outline"}
                  className={s.decision === "selected" ? "bg-success text-white hover:bg-success/80" : ""}
                >
                  {s.decision}
                </Badge>
              </div>
              {s.decision === "pending" && (
                decidingId === s._id ? (
                  <div className="mt-3 space-y-2">
                    <Textarea placeholder="Optional comment" rows={2} value={comment} onChange={(e) => setComment(e.target.value)} />
                    <div className="flex gap-2">
                      <Button size="sm" variant="hero" onClick={() => decide(s._id, "selected")}>Select</Button>
                      <Button size="sm" variant="destructive" onClick={() => decide(s._id, "rejected")}>Reject</Button>
                      <Button size="sm" variant="ghost" onClick={() => { setDecidingId(null); setComment(""); }}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <Button size="sm" variant="outline" className="mt-3" onClick={() => setDecidingId(s._id)}>Review</Button>
                )
              )}
              {s.decisionComment && (
                <p className="text-xs bg-muted/50 rounded p-2 mt-2">
                  <span className="font-medium">Note: </span>{s.decisionComment}
                </p>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
