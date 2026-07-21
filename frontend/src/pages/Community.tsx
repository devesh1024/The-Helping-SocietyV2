import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/context/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Heart, Loader2, Lock, MessageCircle, Plus, Send, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { z } from "zod";
import { FileDropzone } from "@/components/FileDropzone";
import { api } from "@/lib/api";

const cats = [
  { v: "lost_found", label: "Lost & Found" },
  { v: "rooms", label: "Rooms" },
  { v: "marketplace", label: "Marketplace" },
] as const;

interface Post {
  id: string;
  author_id: string;
  author_name?: string;
  category: "lost_found" | "rooms" | "marketplace";
  title: string;
  content: string;
  tags: string[];
  price: number | null;
  images: string[];
  metadata?: Record<string, string>;
  created_at: string;
}

interface Reply {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  created_at: string;
  owner?: {
    fullName: string;
    email: string;
  };
}

const schema = z.object({
  title: z.string().trim().min(2).max(150),
  content: z.string().trim().min(2).max(2000),
});

export default function Community() {
  const { user, isVerified, isAdmin } = useAuth();
  const [tab, setTab] = useState<"lost_found" | "rooms" | "marketplace">("lost_found");
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [openCreate, setOpenCreate] = useState(false);
  const [openPost, setOpenPost] = useState<Post | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const endpoint = tab === "lost_found" ? "/lost-found" : tab === "rooms" ? "/rooms" : "/marketplace";
      const res = await api.get(endpoint);
      const backendPosts = res.data.data.posts || [];
      const mapped = backendPosts.map((p: any) => ({
        id: p._id,
        author_id: typeof p.ownerId === "object" && p.ownerId ? p.ownerId._id : p.ownerId,
        author_name: typeof p.ownerId === "object" && p.ownerId ? p.ownerId.fullName : "",
        category: tab,
        title: p.title,
        content: p.description,
        price: p.price,
        images: p.images || [],
        metadata: p.metadata || {},
        created_at: p.createdAt,
      }));
      setPosts(mapped);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to load posts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [tab]);

  const remove = async (p: Post) => {
    if (!confirm("Delete post?")) return;
    try {
      const endpoint = tab === "lost_found" ? `/lost-found/${p.id}` : tab === "rooms" ? `/rooms/${p.id}` : `/marketplace/${p.id}`;
      await api.delete(endpoint);
      toast.success("Deleted");
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to delete post");
    }
  };

  return (
    <Layout>
      <div className="container py-10">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="font-display text-3xl md:text-4xl font-bold flex items-center gap-3">
              <Heart className="h-8 w-8 text-primary" /> Campus Hub
            </h1>
            <p className="text-muted-foreground mt-1">Lost & Found, Rooms and Marketplace at one spot.</p>
          </div>
          <Button variant="hero" onClick={() => isVerified ? setOpenCreate(true) : toast.error("Verified users only")}>
            <Plus className="h-4 w-4" /> New post
          </Button>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="mb-6">
          <TabsList>
            {cats.map((c) => <TabsTrigger key={c.v} value={c.v}>{c.label}</TabsTrigger>)}
          </TabsList>
        </Tabs>

        {!isVerified && (
          <Card className="p-4 mb-6 border-secondary/40 bg-secondary/5 flex items-center gap-3 text-sm">
            <Lock className="h-4 w-4 text-secondary" />
            You can browse listings, but you'll need to <a href="/profile" className="underline font-medium">get verified</a> to see full details and contact information.
          </Card>
        )}

        {loading ? (
          <div className="grid md:grid-cols-2 gap-4">{Array.from({ length: 4 }).map((_, i) => <Card key={i} className="h-40 animate-pulse bg-muted/40" />)}</div>
        ) : posts.length === 0 ? (
          <Card className="p-12 text-center text-muted-foreground">Nothing here yet. Be the first.</Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {posts.map((p) => (
              <Card key={p.id} className="p-5 hover:shadow-elegant transition-smooth cursor-pointer"
                onClick={() => isVerified ? setOpenPost(p) : toast.error("Get verified to see details")}>
                {p.author_name && (
                  <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5 uppercase tracking-wide">
                    {p.author_name}
                  </p>
                )}
                {p.images?.[0] && (
                  <img src={p.images[0]} alt="" className="rounded-lg w-full h-44 object-cover mb-3" />
                )}
                <div className="flex justify-between items-start gap-2">
                  <h3 className="font-display font-semibold text-lg leading-snug">{p.title}</h3>
                  {(p.price != null || p.metadata?.price != null || p.metadata?.rent != null) && (
                    <Badge className="bg-secondary text-secondary-foreground">
                      {p.metadata?.rent ? p.metadata.rent : `₹${p.metadata?.price || p.price}`}
                    </Badge>
                  )}
                </div>
                {p.metadata?.location && <p className="text-xs text-muted-foreground mt-1">{p.metadata.location} · {p.metadata.room_type}</p>}
                {p.metadata?.time_used && <p className="text-xs text-muted-foreground mt-1">Used: {p.metadata.time_used}</p>}
                <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{p.content}</p>
                <div className="flex justify-between mt-3 text-xs text-muted-foreground">
                  <span>{formatDistanceToNow(new Date(p.created_at), { addSuffix: true })}</span>
                  {(p.author_id === user?.id || isAdmin) && (
                    <button onClick={(e) => { e.stopPropagation(); remove(p); }} className="text-destructive hover:underline flex items-center gap-1">
                      <Trash2 className="h-3 w-3" /> Delete
                    </button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <CreateDialog open={openCreate} onOpenChange={setOpenCreate} category={tab} onCreated={load} />
      {openPost && <PostDialog post={openPost} onClose={() => setOpenPost(null)} />}
    </Layout>
  );
}

function CreateDialog({ open, onOpenChange, category, onCreated }:
  { open: boolean; onOpenChange: (v: boolean) => void; category: "lost_found" | "rooms" | "marketplace"; onCreated: () => void }) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    title: "", content: "", price: "",
    room_type: "", room_type_other: "", allowed_for: "", contact_number: "",
    rent: "", location: "", furnishing: "", time_used: ""
  });
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const actualTitle = category === "rooms" ? `Room at ${form.location || "Location"}` : form.title;
    const actualContent = form.content || " ";
    const parsed = schema.safeParse({ title: actualTitle, content: actualContent });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }

    let metadata: any = {};
    if (category === "rooms") {
      metadata = {
        room_type: form.room_type === "other" ? form.room_type_other : form.room_type,
        allowed_for: form.allowed_for,
        location: form.location,
        furnishing: form.furnishing,
        rent: form.rent,
        contact: form.contact_number
      };
      if (!metadata.room_type || !metadata.location || !form.rent || !form.contact_number) {
        toast.error("Please fill all required room fields"); return;
      }
    } else if (category === "marketplace") {
      metadata = { time_used: form.time_used, contact: form.contact_number, price: form.price };
      if (!form.title || !form.price || !form.contact_number) {
        toast.error("Please fill all required marketplace fields"); return;
      }
    }

    if ((category === "rooms" || category === "marketplace") && form.contact_number) {
      if (!/^\d{10}$/.test(form.contact_number.replace(/\s/g, ""))) {
        toast.error("Contact number must be exactly 10 digits"); return;
      }
    }

    if (files.length === 0) { toast.error("At least one image/video required"); return; }
    if (files.some(f => f.size > 50 * 1024 * 1024)) {
      toast.error("Videos/images cannot exceed 50MB"); return;
    }

    setBusy(true);
    try {
      const urls: string[] = [];
      for (const f of files) {
        const formData = new FormData();
        formData.append("file", f);
        const res = await api.post("/community/upload", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
        if (res.data.success) {
          urls.push(res.data.data.secureUrl);
        } else {
          throw new Error(res.data.message || "Failed to upload image");
        }
      }

      const endpoint = category === "lost_found" ? "/lost-found" : category === "rooms" ? "/rooms" : "/marketplace";
      const payload = {
        title: actualTitle,
        description: actualContent,
        price: category === "marketplace" ? parseFloat(form.price) : category === "rooms" ? parseFloat(form.rent) : null,
        location: form.location,
        contactNumber: form.contact_number,
        images: urls,
        metadata,
      };

      await api.post(endpoint, payload);

      toast.success("Post created");
      onOpenChange(false);
      onCreated();
      setForm({ title: "", content: "", price: "", room_type: "", room_type_other: "", allowed_for: "", contact_number: "", rent: "", location: "", furnishing: "", time_used: "" });
      setFiles([]);
    } catch (e: any) {
      toast.error(e.response?.data?.message || e.message || "Failed to create post");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New post in {cats.find(c => c.v === category)?.label}</DialogTitle>
          <DialogDescription className="sr-only">Create a new community post.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 max-h-[70vh] overflow-y-auto px-1">
          {category === "rooms" && (
            <>
              <div><Label>Room Location</Label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g. Near North Gate" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Type of Room</Label>
                  <Select value={form.room_type} onValueChange={(v) => setForm({ ...form, room_type: v })}>
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1bhk">1 BHK</SelectItem>
                      <SelectItem value="2bhk">2 BHK</SelectItem>
                      <SelectItem value="3bhk">3 BHK</SelectItem>
                      <SelectItem value="4+bhk">4+ BHK</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Allowed for</Label>
                  <Select value={form.allowed_for} onValueChange={(v) => setForm({ ...form, allowed_for: v })}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="boys">Boys</SelectItem>
                      <SelectItem value="girls">Girls</SelectItem>
                      <SelectItem value="any">Any</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {form.room_type === "other" && (
                <div><Label>Specify Room Type</Label><Input placeholder="e.g. 1 RK" value={form.room_type_other} onChange={(e) => setForm({ ...form, room_type_other: e.target.value })} /></div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Furnishing</Label>
                  <Select value={form.furnishing} onValueChange={(v) => setForm({ ...form, furnishing: v })}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unfurnished">Unfurnished</SelectItem>
                      <SelectItem value="semi-furnished">Semi-furnished</SelectItem>
                      <SelectItem value="fully-furnished">Fully Furnished</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Rent per month</Label><Input type="text" value={form.rent} onChange={(e) => setForm({ ...form, rent: e.target.value })} placeholder="e.g. 5000" /></div>
              </div>
              <div><Label>Contact Number</Label><Input type="tel" value={form.contact_number} onChange={(e) => setForm({ ...form, contact_number: e.target.value })} /></div>
            </>
          )}

          {category === "marketplace" && (
            <>
              <div><Label>Item Name</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Price</Label><Input type="text" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="e.g. 1200" /></div>
                <div><Label>Time Used</Label><Input type="text" value={form.time_used} onChange={(e) => setForm({ ...form, time_used: e.target.value })} placeholder="e.g. 6 months" /></div>
              </div>
              <div><Label>Contact Number</Label><Input type="tel" value={form.contact_number} onChange={(e) => setForm({ ...form, contact_number: e.target.value })} /></div>
            </>
          )}

          {category === "lost_found" && (
            <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          )}

          <div><Label>Description / Details</Label><Textarea rows={4} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} /></div>

          <div>
            <Label>Photos / Videos (Max 50MB) <span className="text-destructive">*</span></Label>
            <FileDropzone accept="image/*,video/*" multiple files={files} onFiles={setFiles} hint="Drag & drop, click, or paste images/videos" />
          </div>
          <Button variant="hero" className="w-full mt-2" onClick={submit} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Post"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PostDialog({ post, onClose }: { post: Post; onClose: () => void }) {
  const { isVerified } = useAuth();
  const [replies, setReplies] = useState<Reply[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const targetType = post.category === "lost_found" ? "lostFound" : post.category === "rooms" ? "room" : "marketplace";
      const res = await api.get(`/comments?targetId=${post.id}&targetType=${targetType}`);
      const comments = res.data.data.comments || [];
      const mapped = comments.map((c: any) => ({
        id: c._id,
        post_id: c.targetId,
        author_id: c.ownerId?._id || c.ownerId,
        content: c.content,
        created_at: c.createdAt,
        owner: c.ownerId,
      }));
      setReplies(mapped);
    } catch (err: any) {
      console.error("Failed to load replies:", err);
    }
  };

  useEffect(() => {
    load();
  }, [post.id]);

  const send = async () => {
    if (!text.trim()) return;
    setBusy(true);
    try {
      const targetType = post.category === "lost_found" ? "lostFound" : post.category === "rooms" ? "room" : "marketplace";
      await api.post("/comments", {
        targetId: post.id,
        targetType,
        content: text.trim(),
      });
      setText("");
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to post reply");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{post.title}</DialogTitle>
          <DialogDescription className="sr-only">View post details.</DialogDescription>
        </DialogHeader>
        {post.author_name && (
          <div className="flex items-center gap-2 mb-2">
            <div className="h-8 w-8 rounded-full bg-gradient-primary text-primary-foreground grid place-items-center text-xs font-semibold">
              {post.author_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold">{post.author_name}</p>
              <p className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</p>
            </div>
          </div>
        )}
        {(post.price != null || post.metadata?.price != null || post.metadata?.rent != null) && (
          <Badge className="bg-secondary text-secondary-foreground w-fit">
            {post.metadata?.rent ? post.metadata.rent : `₹${post.metadata?.price || post.price}`}
          </Badge>
        )}

        {post.metadata && Object.keys(post.metadata).length > 0 && (
          <div className="grid sm:grid-cols-2 gap-x-4 gap-y-2 my-2 text-sm bg-muted/30 p-4 rounded-lg">
            {Object.entries(post.metadata).map(([k, v]) => (
              v && k !== "price" && k !== "rent" && (
                <div key={k} className="flex gap-2">
                  <span className="font-semibold text-muted-foreground capitalize">{k.replace("_", " ")}: </span>
                  <span className="text-foreground font-medium">{v}</span>
                </div>
              )
            ))}
          </div>
        )}

        {post.images?.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {post.images.map((img, i) => {
              const url = img;
              const isVideo = img.match(/\.(mp4|webm|ogg)$/i);
              return isVideo ? (
                <video key={i} src={url} controls className="rounded-lg w-full h-40 object-cover bg-black" />
              ) : (
                <img key={i} src={url} className="rounded-lg w-full h-40 object-cover" />
              );
            })}
          </div>
        )}
        <p className="text-sm whitespace-pre-wrap mt-2">{post.content}</p>
        <div className="border-t border-border pt-4 mt-4">
          <p className="font-semibold text-sm mb-2 flex items-center gap-2"><MessageCircle className="h-4 w-4" /> Replies ({replies.length})</p>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {replies.map((r) => {
              const name = r.owner?.fullName || r.owner?.email?.split("@")[0] || "User";
              return (
                <div key={r.id} className="bg-muted/50 rounded-lg p-3 text-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="h-6 w-6 rounded-full bg-gradient-primary text-primary-foreground grid place-items-center text-[10px] font-semibold">
                      {name.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium text-xs">{name}</span>
                    <span className="text-[10px] text-muted-foreground">· {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}</span>
                  </div>
                  <p className="pl-8">{r.content}</p>
                </div>
              );
            })}
          </div>
          {isVerified && (
            <div className="flex gap-2 mt-3">
              <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Write a reply…" onKeyDown={(e) => e.key === "Enter" && send()} />
              <Button onClick={send} disabled={busy}><Send className="h-4 w-4" /></Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
