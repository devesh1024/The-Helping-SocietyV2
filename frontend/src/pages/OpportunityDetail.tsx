import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ArrowLeft,
  Briefcase,
  Calendar,
  Clock,
  ExternalLink,
  GraduationCap,
  Heart,
  Loader2,
  MapPin,
  Share2,
  Bookmark,
} from "lucide-react";
import { format } from "date-fns";

interface OpportunityDetail {
  id: string;
  title: string;
  description: string;
  applyUrl: string;
  category: string;
  workType: string | null;
  location: string | null;
  deadline: string | null;
  status: "open" | "closed";
  createdAt: string;
  conductedBy: string | null;
  eventAt: string | null;
  mode: string | null;
  company: string | null;
  likesCount: number;
  isLiked: boolean;
  isSaved: boolean;
}

const mapDetail = (opp: any): OpportunityDetail => ({
  id: opp._id || opp.id,
  title: opp.title || "",
  description: opp.description || "",
  applyUrl: opp.link || "",
  category: opp.type === "job" ? "Job" : opp.type === "internship" ? "Internship" : "Workshop",
  workType: opp.workType || null,
  location: opp.location || null,
  deadline: opp.deadline || null,
  status: opp.status || "open",
  createdAt: opp.createdAt || new Date().toISOString(),
  conductedBy: opp.conductedBy || null,
  eventAt: opp.eventAt || null,
  mode: opp.mode || null,
  company: opp.company || null,
  likesCount: opp.likesCount || 0,
  isLiked: !!opp.isLiked,
  isSaved: !!opp.isSaved,
});

export default function OpportunityDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [opp, setOpp] = useState<OpportunityDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [likeBusy, setLikeBusy] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/opportunities/${id}`);
        setOpp(mapDetail(res.data?.data?.opportunity));
      } catch (error: any) {
        toast.error(error.response?.data?.message || "Failed to load opportunity");
      } finally {
        setLoading(false);
      }
    };
    if (id) load();
  }, [id]);

  const toggleLike = async () => {
    if (!opp) return;
    setLikeBusy(true);
    try {
      const res = await api.post(`/opportunities/${opp.id}/like`);
      setOpp({ ...opp, isLiked: res.data.data.liked, likesCount: res.data.data.likesCount });
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to like opportunity");
    } finally {
      setLikeBusy(false);
    }
  };

  const toggleSave = async () => {
    if (!opp) return;
    setSaveBusy(true);
    try {
      const res = await api.post(`/opportunities/${opp.id}/save`);
      setOpp({ ...opp, isSaved: res.data.data.saved });
      toast.success(res.data.data.saved ? "Saved" : "Removed from saved");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to save opportunity");
    } finally {
      setSaveBusy(false);
    }
  };

  const share = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: opp?.title, url });
      } catch {
        // user cancelled share sheet, no-op
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard");
    } catch {
      toast.error("Could not copy link");
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="container py-16 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!opp) {
    return (
      <Layout>
        <div className="container py-16 text-center text-muted-foreground">
          Opportunity not found.
        </div>
      </Layout>
    );
  }

  const isWorkshop = opp.category === "Workshop";

  return (
    <Layout>
      <div className="container py-10 max-w-3xl">
        <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>

        <Card className="p-8">
          <div className="flex justify-between items-start gap-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-secondary font-medium flex items-center gap-1.5">
                {isWorkshop && <GraduationCap className="h-3 w-3" />}
                {opp.category}
                {!isWorkshop && opp.workType ? ` · ${opp.workType}` : ""}
              </p>
              <h1 className="font-display text-3xl font-bold mt-1">{opp.title}</h1>
              <p className="text-muted-foreground mt-1">
                {isWorkshop ? opp.conductedBy || opp.company : opp.company}
              </p>
            </div>
            <Badge variant={opp.status === "open" ? "default" : "secondary"}>{opp.status}</Badge>
          </div>

          <div className="flex flex-wrap gap-4 mt-4 text-sm text-muted-foreground">
            {isWorkshop && opp.eventAt && (
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" /> {format(new Date(opp.eventAt), "PPp")}
              </span>
            )}
            {isWorkshop && opp.mode && (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4" /> {opp.mode}{opp.location ? ` · ${opp.location}` : ""}
              </span>
            )}
            {!isWorkshop && opp.location && (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4" /> {opp.location}
              </span>
            )}
            {!isWorkshop && opp.deadline && (
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" /> Deadline: {format(new Date(opp.deadline), "PP")}
              </span>
            )}
          </div>

          <div className="mt-6 border-t border-border pt-6">
            <h2 className="font-semibold text-lg mb-2">Description</h2>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{opp.description}</p>
          </div>

          <div className="flex flex-wrap gap-3 mt-8 pt-6 border-t border-border">
            <Button variant="outline" onClick={share}>
              <Share2 className="h-4 w-4 mr-1.5" /> Share
            </Button>
            <Button variant="outline" onClick={toggleLike} disabled={likeBusy}>
              <Heart className={`h-4 w-4 mr-1.5 ${opp.isLiked ? "fill-destructive text-destructive" : ""}`} />
              {opp.isLiked ? "Liked" : "Like"} {opp.likesCount > 0 ? `(${opp.likesCount})` : ""}
            </Button>
            <Button variant="outline" onClick={toggleSave} disabled={saveBusy}>
              <Bookmark className={`h-4 w-4 mr-1.5 ${opp.isSaved ? "fill-primary text-primary" : ""}`} />
              {opp.isSaved ? "Saved" : "Save"}
            </Button>
            <Button asChild variant="hero" className="ml-auto">
              <a href={opp.applyUrl} target="_blank" rel="noopener noreferrer">
                <Briefcase className="h-4 w-4 mr-1.5" />
                {isWorkshop ? "Register" : "Apply"} <ExternalLink className="h-3.5 w-3.5 ml-1" />
              </a>
            </Button>
          </div>
        </Card>
      </div>
    </Layout>
  );
}
