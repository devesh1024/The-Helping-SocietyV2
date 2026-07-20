import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, Calendar, Users, Search } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface Hackathon {
  id: string;
  title: string;
  description: string;
  category: "technical" | "poster" | "video" | "social_media";
  status: "draft" | "live" | "closed";
  participationMode: "individual" | "team" | "both";
  registrationDeadline?: string | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  technical: "Technical",
  poster: "Poster",
  video: "Video",
  social_media: "Social Media",
};

const mapBackendToFrontend = (h: any): Hackathon => ({
  id: h._id || h.id,
  title: h.title,
  description: h.description,
  category: h.category,
  status: h.status,
  participationMode: h.participationMode,
  registrationDeadline: h.registrationDeadline || null,
});

const PAGE_SIZE = 9;

const statusBadge = (status: Hackathon["status"]) => {
  if (status === "live") return <Badge className="bg-success text-white hover:bg-success/80">Live</Badge>;
  if (status === "closed") return <Badge variant="secondary">Closed</Badge>;
  return <Badge variant="outline">Draft</Badge>;
};

export default function Hackathons() {
  const [items, setItems] = useState<Hackathon[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [category, setCategory] = useState("all");
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const params: any = { page: page + 1, limit: PAGE_SIZE };
        if (debounced) params.search = debounced;
        if (category !== "all") params.category = category;
        const response = await api.get("/hackathons", { params });
        const data = response.data?.data;
        setItems((data?.hackathons || []).map(mapBackendToFrontend));
        setTotal(data?.total || 0);
      } catch (error: any) {
        toast.error(error.response?.data?.message || "Failed to load hackathons");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [debounced, category, page]);

  return (
    <Layout>
      <div className="container py-10">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display text-3xl md:text-4xl font-bold flex items-center gap-3">
              <Trophy className="h-8 w-8 text-primary" /> Hackathons
            </h1>
            <p className="text-muted-foreground mt-1">Build, submit, and compete — solo or with a team.</p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          <aside className="md:w-56 shrink-0 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search hackathons"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                className="pl-9"
                aria-label="Search hackathons"
              />
            </div>
            <Select value={category} onValueChange={(v) => { setCategory(v); setPage(0); }}>
              <SelectTrigger aria-label="Filter by category">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                <SelectItem value="technical">Technical</SelectItem>
                <SelectItem value="poster">Poster</SelectItem>
                <SelectItem value="video">Video</SelectItem>
                <SelectItem value="social_media">Social Media</SelectItem>
              </SelectContent>
            </Select>
          </aside>

          <div className="flex-1">
            {loading ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i} className="p-4 space-y-3">
                    <Skeleton className="h-5 w-2/3" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-1/2" />
                  </Card>
                ))}
              </div>
            ) : items.length === 0 ? (
              <Card className="p-10 text-center text-muted-foreground">
                No hackathons found.
              </Card>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map((h) => (
                  <Card key={h.id} className="p-4 flex flex-col gap-3 hover:shadow-elegant transition-shadow">
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="outline">{CATEGORY_LABELS[h.category]}</Badge>
                      {statusBadge(h.status)}
                    </div>
                    <h3 className="font-display font-semibold text-lg line-clamp-1">{h.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">{h.description}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Users className="h-3.5 w-3.5" />
                      {h.participationMode === "individual"
                        ? "Individual"
                        : h.participationMode === "team"
                        ? "Team"
                        : "Individual or Team"}
                    </div>
                    {h.registrationDeadline && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5" />
                        Closes {format(new Date(h.registrationDeadline), "MMM d, yyyy")}
                      </div>
                    )}
                    <Button asChild variant="hero" size="sm" className="mt-2">
                      <Link to={`/hackathons/${h.id}`}>View details</Link>
                    </Button>
                  </Card>
                ))}
              </div>
            )}

            {!loading && total > PAGE_SIZE && (
              <div className="flex items-center justify-center gap-3 mt-6">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {page + 1} of {Math.ceil(total / PAGE_SIZE)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={(page + 1) * PAGE_SIZE >= total}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
