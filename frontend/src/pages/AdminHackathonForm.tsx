import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Plus, Trash2, Loader2, Trophy } from "lucide-react";
import { toast } from "sonner";


const FILE_TYPE_OPTIONS = [
  { value: "pdf", label: "PDF", accept: ["pdf"] },
  { value: "word", label: "Word Document (doc, docx)", accept: ["doc", "docx"] },
  { value: "ppt", label: "PowerPoint (ppt, pptx)", accept: ["ppt", "pptx"] },
  { value: "excel", label: "Excel Spreadsheet (xlsx, csv)", accept: ["xlsx", "csv"] },
  { value: "image", label: "Image (jpg, png)", accept: ["jpg", "jpeg", "png"] },
  { value: "video", label: "Video (mp4)", accept: ["mp4"] },
  { value: "zip", label: "ZIP Archive", accept: ["zip"] },
];

const findFileTypeValue = (accept: string[] | undefined): string => {
  if (!accept || accept.length === 0) return "pdf";
  const match = FILE_TYPE_OPTIONS.find(
    (opt) => opt.accept.length === accept.length && opt.accept.every((e) => accept.includes(e))
  );
  return match?.value || "pdf";
};

export default function AdminHackathonForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [loading, setLoading] = useState(isEdit);
  const [existingStatus, setExistingStatus] = useState<string | null>(null);
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
    if (!isEdit) return;
    (async () => {
      try {
        const res = await api.get(`/hackathons/${id}`);
        const h = res.data.data.hackathon;
        setExistingStatus(h.status);
        setTitle(h.title || "");
        setDescription(h.description || "");
        setCategory(h.category || "technical");
        setParticipationMode(h.participationMode || "individual");
        setTeamMin((h.teamSize?.min ?? 2).toString());
        setTeamMax((h.teamSize?.max ?? 4).toString());
        // datetime-local inputs need "YYYY-MM-DDTHH:mm" — slice(0,16) trims an ISO string to that.
        setLaunchDate(h.launchDate ? h.launchDate.slice(0, 16) : "");
        setRegistrationDeadline(h.registrationDeadline ? h.registrationDeadline.slice(0, 16) : "");
        setQuestions(
          (h.extraQuestions || []).map((q: any) => ({
            ...q,
            optionsText: (q.options || []).join(", "),
            fileType: q.type === "file" ? findFileTypeValue(q.accept) : "pdf",
          }))
        );
      } catch (error: any) {
        toast.error(error.response?.data?.message || "Failed to load hackathon.");
        navigate("/admin");
      } finally {
        setLoading(false);
      }
    })();
  }, [id, isEdit, navigate]);

  const canEditQuestions = !isEdit || existingStatus === "draft";

  const addQuestion = () =>
    setQuestions((prev) => [
      ...prev,
      { key: "", label: "", type: "text", required: false, optionsText: "", fileType: "pdf" },
    ]);
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
          accept: q.type === "file" ? FILE_TYPE_OPTIONS.find((o) => o.value === q.fileType)?.accept : undefined,
        }));
      }

      if (isEdit) {
        await api.put(`/hackathons/${id}`, payload);
        toast.success("Hackathon updated.");
      } else {
        await api.post("/hackathons", payload);
        toast.success("Hackathon created as draft.");
      }
      navigate("/admin");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to save hackathon.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="container py-16 grid place-items-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container py-10 max-w-3xl">
        <Link to="/admin" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" /> Back to Admin
        </Link>
        <h1 className="font-display text-2xl md:text-3xl font-bold flex items-center gap-3 mb-6">
          <Trophy className="h-7 w-7 text-primary" /> {isEdit ? "Edit Hackathon" : "New Hackathon"}
        </h1>

        <Card className="p-6 space-y-5">
          <div><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div>
            <Label>Description (markdown supported)</Label>
            <Textarea rows={8} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
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
            <div className="grid sm:grid-cols-2 gap-3">
              <div><Label>Min team size</Label><Input type="number" min={1} value={teamMin} onChange={(e) => setTeamMin(e.target.value)} /></div>
              <div><Label>Max team size</Label><Input type="number" min={1} value={teamMax} onChange={(e) => setTeamMax(e.target.value)} /></div>
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label>Launch Date &amp; Time</Label>
              <Input type="datetime-local" value={launchDate} onChange={(e) => setLaunchDate(e.target.value)} />
            </div>
            <div>
              <Label>Registration Deadline &amp; Time</Label>
              <Input type="datetime-local" value={registrationDeadline} onChange={(e) => setRegistrationDeadline(e.target.value)} />
            </div>
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
                  <div className="grid sm:grid-cols-2 gap-2">
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
                  <div className="grid sm:grid-cols-2 gap-2 items-center">
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
                    <div>
                      <Label className="text-xs text-muted-foreground font-normal">Accepted file type</Label>
                      <Select value={q.fileType} onValueChange={(v) => updateQuestion(i, { fileType: v })} disabled={!canEditQuestions}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {FILE_TYPE_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
        </Card>
      </div>
    </Layout>
  );
}
