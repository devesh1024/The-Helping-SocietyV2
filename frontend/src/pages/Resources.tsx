import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/context/AuthContext";
import { api, getAccessToken } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { BookOpen, Eye, Heart, Loader2, Lock, Plus, Search, Trash2, Upload } from "lucide-react";
import { PdfViewer } from "@/components/PdfViewer";
import { z } from "zod";
import { FileDropzone } from "@/components/FileDropzone";

interface Resource {
  _id: string;
  title: string;
  description: string;
  category: "notes" | "pyqs" | "books" | "syllabus" | "study_material";
  year: "1st year" | "2nd year" | "3rd year" | "4th year";
  branch: string;
  file: {
    publicId: string;
    secureUrl: string;
    fileType: string;
    fileSize: number;
  };
  uploadedBy: string | { _id: string; fullName: string };
  likesCount: number;
  createdAt: string;
}

const PAGE_SIZE = 12;

const resourceSchema = z.object({
  title: z.string().trim().min(2, "Title must be at least 2 characters").max(150),
  description: z.string().trim().min(2, "Description must be at least 2 characters").max(500),
  category: z.enum(['notes', 'pyqs', 'books', 'syllabus', 'study_material'], {
    errorMap: () => ({ message: "Please select a category" })
  }),
  year: z.enum(['1st year', '2nd year', '3rd year', '4th year'], {
    errorMap: () => ({ message: "Please select a year" })
  }),
  branch: z.enum([
    'Computer Science and Engineering',
    'Electronic and Communication Engineering',
    'Electrical Engineering',
    'Mechanical Engineering',
    'Civil Engineering',
    'Chemical Engineering'
  ], {
    errorMap: () => ({ message: "Please select a branch" })
  }),
});

const categoryLabelMap: Record<string, string> = {
  notes: "Notes",
  pyqs: "PYQs",
  books: "Books",
  syllabus: "Syllabus",
  study_material: "Study Material",
};

export default function Resources() {
  const { user, isVerified, isAdmin } = useAuth();
  const [items, setItems] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [year, setYear] = useState<string>("all");
  const [branch, setBranch] = useState<string>("all");
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [likedSet, setLikedSet] = useState<Set<string>>(new Set());
  const [openUpload, setOpenUpload] = useState(false);
  const [viewing, setViewing] = useState<Resource | null>(null);
  const [viewUrl, setViewUrl] = useState<{ url: string; httpHeaders?: Record<string, string> } | null>(null);

  // debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = async () => {
    setLoading(true);
    try {
      const params: any = {
        page: page + 1, // backend is 1-indexed
        limit: PAGE_SIZE,
      };

      if (debounced) {
        params.search = debounced;
      }

      if (category !== "all") {
        params.category = category;
      }

      if (year !== "all") {
        params.year = year;
      }

      if (branch !== "all") {
        params.branch = branch;
      }

      const res = await api.get("/resources", { params });
      const { resources, total: totalCount } = res.data.data;
      setItems(resources || []);
      setTotal(totalCount || 0);
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Failed to load resources");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [debounced, category, year, branch, page]);

  const toggleLike = async (r: Resource) => {
    if (!user || !isVerified) {
      toast.error("Verified users only");
      return;
    }
    const liked = likedSet.has(r._id);
    
    // Optimistic UI updates
    setLikedSet((s) => {
      const n = new Set(s);
      liked ? n.delete(r._id) : n.add(r._id);
      return n;
    });
    setItems((arr) =>
      arr.map((x) =>
        x._id === r._id ? { ...x, likesCount: x.likesCount + (liked ? -1 : 1) } : x
      )
    );

    try {
      const res = await api.post(`/resources/${r._id}/like`);
      const { liked: backendLiked, likesCount: backendLikesCount } = res.data.data;

      // Reset to actual backend response
      setLikedSet((s) => {
        const n = new Set(s);
        backendLiked ? n.add(r._id) : n.delete(r._id);
        return n;
      });
      setItems((arr) =>
        arr.map((x) =>
          x._id === r._id ? { ...x, likesCount: backendLikesCount } : x
        )
      );
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Failed to toggle like");
      load();
    }
  };

  const view = async (r: Resource) => {
  if (!isVerified) {
    toast.error("Get verified to open files");
    return;
  }
  if (!r.file?.publicId) {
    toast.error("Could not load file URL");
    return;
  }
  const proxyUrl = `${api.defaults.baseURL}/resources/${r._id}/file`;
  const isPdf = r.file.fileType === "pdf";

  if (!isPdf) {
    try {
      const res = await api.get(`/resources/${r._id}/file`, { responseType: "blob" });
      const blobUrl = URL.createObjectURL(res.data);
      window.open(blobUrl, "_blank");
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
    } catch {
      toast.error("Could not open file.");
    }
    return;
  }

  setViewUrl({
    url: proxyUrl,
    httpHeaders: { Authorization: `Bearer ${getAccessToken()}` },
  });
  setViewing(r);
};
 

  const remove = async (r: Resource) => {
    if (!confirm("Delete this resource?")) return;
    try {
      await api.delete(`/resources/${r._id}`);
      toast.success("Deleted successfully");
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Failed to delete resource");
    }
  };

  return (
    <Layout>
      <div className="container py-10">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display text-3xl md:text-4xl font-bold flex items-center gap-3">
              <BookOpen className="h-8 w-8 text-primary" /> Resource Hub
            </h1>
            <p className="text-muted-foreground mt-1">Notes, papers and materials shared by your peers.</p>
          </div>
          <Button variant="hero" onClick={() => isVerified ? setOpenUpload(true) : toast.error("Verified users only")}>
            <Plus className="h-4 w-4" /> Upload resource
          </Button>
        </div>

        <Card className="p-4 flex flex-wrap gap-3 items-center mb-6">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search title or description…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} />
          </div>
          <Select value={category} onValueChange={(v) => { setCategory(v); setPage(0); }}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="notes">Notes</SelectItem>
              <SelectItem value="pyqs">PYQs</SelectItem>
              <SelectItem value="books">Books</SelectItem>
              <SelectItem value="syllabus">Syllabus</SelectItem>
              <SelectItem value="study_material">Study Material</SelectItem>
            </SelectContent>
          </Select>
          <Select value={year} onValueChange={(v) => { setYear(v); setPage(0); }}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Year" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Years</SelectItem>
              <SelectItem value="1st year">1st Year</SelectItem>
              <SelectItem value="2nd year">2nd Year</SelectItem>
              <SelectItem value="3rd year">3rd Year</SelectItem>
              <SelectItem value="4th year">4th Year</SelectItem>
            </SelectContent>
          </Select>
          <Select value={branch} onValueChange={(v) => { setBranch(v); setPage(0); }}>
            <SelectTrigger className="w-56"><SelectValue placeholder="Branch" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Branches</SelectItem>
              <SelectItem value="Computer Science and Engineering">Computer Science and Engineering</SelectItem>
              <SelectItem value="Electronic and Communication Engineering">Electronic and Communication Engineering</SelectItem>
              <SelectItem value="Electrical Engineering">Electrical Engineering</SelectItem>
              <SelectItem value="Mechanical Engineering">Mechanical Engineering</SelectItem>
              <SelectItem value="Civil Engineering">Civil Engineering</SelectItem>
              <SelectItem value="Chemical Engineering">Chemical Engineering</SelectItem>
            </SelectContent>
          </Select>
        </Card>

        {!isVerified && (
          <Card className="p-4 mb-6 border-secondary/40 bg-secondary/5 flex items-center gap-3 text-sm">
            <Lock className="h-4 w-4 text-secondary" />
            You can browse listings, but you'll need to <a href="/profile" className="underline font-medium">get verified</a> to open files.
          </Card>
        )}

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="p-5 animate-pulse h-48 bg-muted/40" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <Card className="p-12 text-center text-muted-foreground">No resources match your filters.</Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((r) => {
              const uploaderId = typeof r.uploadedBy === "object" && r.uploadedBy !== null ? r.uploadedBy._id : r.uploadedBy;
              const isOwner = uploaderId === user?.id || isAdmin;
              return (
                <Card key={r._id} className="p-5 flex flex-col hover:shadow-elegant transition-smooth">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">
                        {categoryLabelMap[r.category] || r.category} · {r.year} · {r.branch?.replace(' Engineering', '')}
                      </p>
                      <h3 className="font-display font-semibold text-lg leading-snug mt-1">{r.title}</h3>
                    </div>
                    <Badge variant="outline" className="capitalize">{r.file.fileType}</Badge>
                  </div>
                  {r.description && <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{r.description}</p>}
                  <div className="flex items-center justify-between mt-auto pt-4">
                    <button onClick={() => toggleLike(r)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-secondary transition-smooth">
                      <Heart className={`h-4 w-4 ${likedSet.has(r._id) ? "fill-secondary text-secondary" : ""}`} /> {r.likesCount}
                    </button>
                    <div className="flex gap-1">
                      {isOwner && (
                        <Button variant="ghost" size="icon" onClick={() => remove(r)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => view(r)}><Eye className="h-4 w-4" /> View</Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {total > PAGE_SIZE && (
          <div className="mt-8 flex items-center justify-center gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</Button>
            <span className="text-sm text-muted-foreground">Page {page + 1} of {Math.ceil(total / PAGE_SIZE)}</span>
            <Button variant="outline" size="sm" disabled={(page + 1) * PAGE_SIZE >= total} onClick={() => setPage(page + 1)}>Next</Button>
          </div>
        )}
      </div>

      <UploadDialog open={openUpload} onOpenChange={setOpenUpload} onUploaded={load} />

      <Dialog open={!!viewing} onOpenChange={(o) => { if (!o) { setViewing(null); setViewUrl(null); } }}>
        <DialogContent className="max-w-5xl h-[85vh] p-0 flex flex-col">
          <DialogHeader className="px-6 pt-5">
            <DialogTitle>{viewing?.title}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 px-6 pb-6 min-h-0">
            {viewUrl && <PdfViewer url={viewUrl} />}
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}

function UploadDialog({ open, onOpenChange, onUploaded }: { open: boolean; onOpenChange: (v: boolean) => void; onUploaded: () => void }) {
  const { user } = useAuth();
  const [form, setForm] = useState({ title: "", description: "", category: "", year: "", branch: "" });
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);

  const ALLOWED = [
    "application/pdf",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];

  const submit = async () => {
    const file = files[0];
    if (!user || !file) {
      toast.error("Please choose a file");
      return;
    }
    const ext = file.name.toLowerCase().split(".").pop();
    if (!ALLOWED.includes(file.type) && !["pdf", "ppt", "pptx", "docx"].includes(ext || "")) {
      toast.error("Only PDF, DOCX or PPT/PPTX files allowed");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      toast.error("Max 50MB");
      return;
    }
    const parsed = resourceSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setBusy(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", parsed.data.title);
      formData.append("description", parsed.data.description);
      formData.append("category", parsed.data.category);
      formData.append("year", parsed.data.year);
      formData.append("branch", parsed.data.branch);

      const isRequestMode = user.role === "student";
      const endpoint = isRequestMode ? "/resources/request" : "/resources";

      const res = await api.post(endpoint, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      toast.success(res.data.message || "Submitted successfully");
      onOpenChange(false);
      setForm({ title: "", description: "", category: "", year: "", branch: "" });
      setFiles([]);
      onUploaded();
    } catch (e: any) {
      toast.error(e.response?.data?.message || e.message || "Failed to upload resource");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload a resource</DialogTitle>
          <DialogDescription className="sr-only">Upload a new resource</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Title</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="notes">Notes</SelectItem>
                  <SelectItem value="pyqs">PYQs</SelectItem>
                  <SelectItem value="books">Books</SelectItem>
                  <SelectItem value="syllabus">Syllabus</SelectItem>
                  <SelectItem value="study_material">Study Material</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Year</Label>
              <Select value={form.year} onValueChange={(v) => setForm({ ...form, year: v })}>
                <SelectTrigger><SelectValue placeholder="Year" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1st year">1st Year</SelectItem>
                  <SelectItem value="2nd year">2nd Year</SelectItem>
                  <SelectItem value="3rd year">3rd Year</SelectItem>
                  <SelectItem value="4th year">4th Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Branch</Label>
            <Select value={form.branch} onValueChange={(v) => setForm({ ...form, branch: v })}>
              <SelectTrigger><SelectValue placeholder="Select Branch" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Computer Science and Engineering">Computer Science and Engineering</SelectItem>
                <SelectItem value="Electronic and Communication Engineering">Electronic and Communication Engineering</SelectItem>
                <SelectItem value="Electrical Engineering">Electrical Engineering</SelectItem>
                <SelectItem value="Mechanical Engineering">Mechanical Engineering</SelectItem>
                <SelectItem value="Civil Engineering">Civil Engineering</SelectItem>
                <SelectItem value="Chemical Engineering">Chemical Engineering</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div>
            <Label>File (PDF, DOCX or PPT/PPTX)</Label>
            <FileDropzone accept=".pdf,.docx,.ppt,.pptx,application/pdf" files={files} onFiles={setFiles} hint="Drag & drop, click, or paste a file (max 50MB)" />
          </div>
          <Button variant="hero" className="w-full" onClick={submit} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Upload className="h-4 w-4" /> Submit</>}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
