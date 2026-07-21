import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Trophy, Calendar, Users, Copy, Crown, X as XIcon } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

interface ExtraQuestion {
  key: string;
  label: string;
  type: "text" | "number" | "radio" | "checkbox" | "file";
  required: boolean;
  options?: string[];
  accept?: string[];
}

interface Hackathon {
  id: string;
  title: string;
  description: string;
  category: string;
  status: "draft" | "live" | "closed";
  participationMode: "individual" | "team" | "both";
  teamSize?: { min: number; max: number };
  launchDate?: string | null;
  registrationDeadline?: string | null;
  extraQuestions: ExtraQuestion[];
}

interface TeamMember {
  id: string;
  name: string;
}

interface Team {
  id: string;
  name: string;
  leaderId: string;
  members: TeamMember[];
  joinCode: string;
}

interface SubmissionFile {
  key: string;
  secureUrl: string;
  fileType: string;
}

interface Submission {
  id: string;
  title: string;
  description: string;
  repoUrl?: string;
  demoUrl?: string;
  videoUrl?: string;
  extraAnswers: Record<string, any>;
  files: SubmissionFile[];
  decision: "pending" | "selected" | "rejected";
  decisionComment?: string;
}

const mapHackathon = (h: any): Hackathon => ({
  id: h._id || h.id,
  title: h.title,
  description: h.description,
  category: h.category,
  status: h.status,
  participationMode: h.participationMode,
  teamSize: h.teamSize,
  launchDate: h.launchDate || null,
  registrationDeadline: h.registrationDeadline || null,
  extraQuestions: h.extraQuestions || [],
});

const mapTeam = (t: any): Team => ({
  id: t._id || t.id,
  name: t.name,
  leaderId: typeof t.leaderId === "object" ? t.leaderId._id : t.leaderId,
  members: (t.members || []).map((m: any) => ({
    id: typeof m === "object" ? m._id : m,
    // Falls back to showing the raw id when the backend hasn't populated this field
    // (e.g. right after create/join/remove mutations) — resolves to a real name
    // once the page re-fetches /teams/mine, which populates it.
    name: typeof m === "object" ? m.fullName : m,
  })),
  joinCode: t.joinCode,
});

const mapSubmission = (s: any): Submission => ({
  id: s._id || s.id,
  title: s.title,
  description: s.description,
  repoUrl: s.repoUrl,
  demoUrl: s.demoUrl,
  videoUrl: s.videoUrl,
  extraAnswers: s.extraAnswers || {},
  files: s.files || [],
  decision: s.decision,
  decisionComment: s.decisionComment,
});

const decisionBadge = (decision: Submission["decision"]) => {
  if (decision === "selected") return <Badge className="bg-success text-white hover:bg-success/80">Selected</Badge>;
  if (decision === "rejected") return <Badge variant="destructive">Rejected</Badge>;
  return <Badge variant="outline">Pending Review</Badge>;
};

export default function HackathonDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const [hackathon, setHackathon] = useState<Hackathon | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingSubmission, setEditingSubmission] = useState(false);

  const needsTeamInfo = (h: Hackathon) => h.participationMode !== "individual";

  const loadAll = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const hackathonRes = await api.get(`/hackathons/${id}`);
      const h = mapHackathon(hackathonRes.data.data.hackathon);
      setHackathon(h);

      if (needsTeamInfo(h)) {
        const teamRes = await api.get(`/hackathons/${id}/teams/mine`);
        setTeam(teamRes.data.data.team ? mapTeam(teamRes.data.data.team) : null);
      } else {
        setTeam(null);
      }

      const submissionRes = await api.get(`/hackathons/${id}/submissions/mine`);
      setSubmission(submissionRes.data.data.submission ? mapSubmission(submissionRes.data.data.submission) : null);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to load hackathon.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) {
    return (
      <Layout>
        <div className="container py-10 space-y-4 max-w-4xl">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-40 w-full" />
        </div>
      </Layout>
    );
  }

  if (!hackathon) {
    return (
      <Layout>
        <div className="container py-10 text-center text-muted-foreground">Hackathon not found.</div>
      </Layout>
    );
  }

  const canShowSubmissionFlow =
    hackathon.participationMode === "individual" ||
    hackathon.participationMode === "both" ||
    (hackathon.participationMode === "team" && !!team);

  return (
    <Layout>
      <div className="container py-10 max-w-4xl space-y-8">
        <Link to="/hackathons" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Hackathons
        </Link>

        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <Badge variant="outline">{hackathon.category.replace("_", " ")}</Badge>
            {hackathon.status === "live" && <Badge className="bg-success text-white hover:bg-success/80">Live</Badge>}
            {hackathon.status === "closed" && <Badge variant="secondary">Closed</Badge>}
            {hackathon.status === "draft" && <Badge variant="outline">Draft (preview)</Badge>}
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold flex items-center gap-3">
            <Trophy className="h-8 w-8 text-primary shrink-0" /> {hackathon.title}
          </h1>
          <div className="flex flex-wrap gap-4 mt-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              {hackathon.participationMode === "individual"
                ? "Individual only"
                : hackathon.participationMode === "team"
                ? `Team only${hackathon.teamSize ? ` (${hackathon.teamSize.min}-${hackathon.teamSize.max} members)` : ""}`
                : `Individual or Team${hackathon.teamSize ? ` (up to ${hackathon.teamSize.max})` : ""}`}
            </span>
            {hackathon.registrationDeadline && (
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                Closes {format(new Date(hackathon.registrationDeadline), "MMM d, yyyy 'at' h:mm a")}
              </span>
            )}
          </div>
        </div>

        <Card className="p-6">
          <div className="prose prose-sm sm:prose-base max-w-none prose-headings:font-display prose-a:text-primary">
            <ReactMarkdown>{hackathon.description}</ReactMarkdown>
          </div>
        </Card>

        {needsTeamInfo(hackathon) && (
          <TeamSection
            hackathonId={hackathon.id}
            hackathon={hackathon}
            team={team}
            setTeam={setTeam}
            currentUserId={user?.id}
            hasSubmission={!!submission}
          />
        )}

        {!canShowSubmissionFlow ? (
          <Card className="p-6 text-center text-muted-foreground">
            Join or create a team above before you can submit an entry.
          </Card>
        ) : hackathon.status !== "live" ? (
          <Card className="p-6 text-center text-muted-foreground">
            Submissions are only open while this hackathon is live.
          </Card>
        ) : submission ? (
          <SubmissionView
            submission={submission}
            editable={submission.decision === "pending"}
            editing={editingSubmission}
            onStartEdit={() => setEditingSubmission(true)}
            onCancelEdit={() => setEditingSubmission(false)}
          >
            {editingSubmission && (
              <SubmissionForm
                hackathon={hackathon}
                existing={submission}
                submissionId={submission.id}
                onSaved={(s) => {
                  setSubmission(s);
                  setEditingSubmission(false);
                  toast.success("Submission updated.");
                }}
              />
            )}
          </SubmissionView>
        ) : (
          <Card className="p-6">
            <h2 className="font-display text-xl font-semibold mb-4">Submit your entry</h2>
            <SubmissionForm
              hackathon={hackathon}
              onSaved={(s) => {
                setSubmission(s);
                toast.success("Submission created.");
              }}
            />
          </Card>
        )}
      </div>
    </Layout>
  );
}

// ==================== Team Section ====================

function TeamSection({
  hackathonId,
  hackathon,
  team,
  setTeam,
  currentUserId,
  hasSubmission,
}: {
  hackathonId: string;
  hackathon: Hackathon;
  team: Team | null;
  setTeam: (t: Team | null) => void;
  currentUserId?: string;
  hasSubmission: boolean;
}) {
  const [mode, setMode] = useState<"create" | "join">("create");
  const [name, setName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [busy, setBusy] = useState(false);

  const isLeader = team && currentUserId && team.leaderId === currentUserId;

  const createTeam = async () => {
    if (!name.trim()) return toast.error("Team name is required.");
    setBusy(true);
    try {
      const res = await api.post(`/hackathons/${hackathonId}/teams`, { name });
      setTeam(mapTeam(res.data.data.team));
      toast.success("Team created.");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to create team.");
    } finally {
      setBusy(false);
    }
  };

  const joinTeam = async () => {
    if (!joinCode.trim()) return toast.error("Join code is required.");
    setBusy(true);
    try {
      const res = await api.post(`/hackathons/${hackathonId}/teams/join`, { joinCode });
      setTeam(mapTeam(res.data.data.team));
      toast.success("Joined team.");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to join team.");
    } finally {
      setBusy(false);
    }
  };

  const leaveTeam = async () => {
    if (!team) return;
    setBusy(true);
    try {
      await api.post(`/hackathons/teams/${team.id}/leave`);
      setTeam(null);
      toast.success("You left the team.");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to leave team.");
    } finally {
      setBusy(false);
    }
  };

  const deleteTeam = async () => {
    if (!team) return;
    setBusy(true);
    try {
      await api.delete(`/hackathons/teams/${team.id}`);
      setTeam(null);
      toast.success("Team deleted.");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to delete team.");
    } finally {
      setBusy(false);
    }
  };

  const removeMember = async (memberId: string) => {
    if (!team) return;
    setBusy(true);
    try {
      const res = await api.delete(`/hackathons/teams/${team.id}/members/${memberId}`);
      setTeam(mapTeam(res.data.data.team));
      toast.success("Member removed.");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to remove member.");
    } finally {
      setBusy(false);
    }
  };

  const copyJoinCode = () => {
    if (!team) return;
    navigator.clipboard.writeText(team.joinCode);
    toast.success("Join code copied.");
  };

  if (team) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-semibold">Your Team: {team.name}</h2>
          <Button variant="outline" size="sm" onClick={copyJoinCode}>
            <Copy className="h-3.5 w-3.5 mr-1.5" /> {team.joinCode}
          </Button>
        </div>
        <div className="space-y-2 mb-4">
          {team.members.map((member) => (
            <div key={member.id} className="flex items-center justify-between text-sm border rounded-md px-3 py-2">
              <span className="flex items-center gap-1.5">
                {member.id === team.leaderId && <Crown className="h-3.5 w-3.5 text-secondary" />}
                {member.id === currentUserId ? "You" : member.name}
                {member.id === team.leaderId && <span className="text-xs text-muted-foreground">(Leader)</span>}
              </span>
              {isLeader && member.id !== team.leaderId && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button disabled={busy} aria-label="Remove member">
                      <XIcon className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remove {member.name} from the team?</AlertDialogTitle>
                      <AlertDialogDescription>
                        They'll need to rejoin using the team's join code if you change your mind.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => removeMember(member.id)}>Remove</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          ))}
        </div>
        {isLeader ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" disabled={busy || hasSubmission}>
                {hasSubmission ? "Cannot delete (already submitted)" : "Delete Team"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete "{team.name}"?</AlertDialogTitle>
                <AlertDialogDescription>This cannot be undone. All members will be removed.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={deleteTeam}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" disabled={busy}>Leave Team</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Leave "{team.name}"?</AlertDialogTitle>
                <AlertDialogDescription>You can rejoin later with the team's join code.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={leaveTeam}>Leave</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </Card>
    );
  }

  if (hackathon.status !== "live") {
    return (
      <Card className="p-6 text-center text-muted-foreground">
        Team registration opens once this hackathon goes live.
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h2 className="font-display text-xl font-semibold mb-4">Team Registration</h2>
      <div className="flex gap-2 mb-4">
        <Button variant={mode === "create" ? "default" : "outline"} size="sm" onClick={() => setMode("create")}>
          Create a Team
        </Button>
        <Button variant={mode === "join" ? "default" : "outline"} size="sm" onClick={() => setMode("join")}>
          Join a Team
        </Button>
      </div>
      {mode === "create" ? (
        <div className="flex gap-2">
          <Input placeholder="Team name" value={name} onChange={(e) => setName(e.target.value)} />
          <Button onClick={createTeam} disabled={busy}>Create</Button>
        </div>
      ) : (
        <div className="flex gap-2">
          <Input placeholder="Join code" value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} />
          <Button onClick={joinTeam} disabled={busy}>Join</Button>
        </div>
      )}
    </Card>
  );
}

// ==================== Submission View (read-only) ====================

function SubmissionView({
  submission,
  editable,
  editing,
  onStartEdit,
  onCancelEdit,
  children,
}: {
  submission: Submission;
  editable: boolean;
  editing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  children?: React.ReactNode;
}) {
  if (editing) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-semibold">Edit Submission</h2>
          <Button variant="ghost" size="sm" onClick={onCancelEdit}>Cancel</Button>
        </div>
        {children}
      </Card>
    );
  }

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold">Your Submission</h2>
        {decisionBadge(submission.decision)}
      </div>
      <div>
        <h3 className="font-semibold">{submission.title}</h3>
        <p className="text-sm text-muted-foreground whitespace-pre-wrap mt-1">{submission.description}</p>
      </div>
      <div className="flex flex-wrap gap-3 text-sm">
        {submission.repoUrl && <a href={submission.repoUrl} target="_blank" rel="noreferrer" className="text-primary underline">Repository</a>}
        {submission.demoUrl && <a href={submission.demoUrl} target="_blank" rel="noreferrer" className="text-primary underline">Demo</a>}
        {submission.videoUrl && <a href={submission.videoUrl} target="_blank" rel="noreferrer" className="text-primary underline">Video</a>}
      </div>
      {submission.files.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {submission.files.map((f) => (
            <a
              key={f.key}
              href={f.secureUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs bg-muted px-2.5 py-1 rounded-full hover:bg-muted/70"
            >
              {f.key} ({f.fileType})
            </a>
          ))}
        </div>
      )}
      {submission.decisionComment && (
        <p className="text-sm bg-muted/50 rounded-md p-3">
          <span className="font-medium">Reviewer note: </span>
          {submission.decisionComment}
        </p>
      )}
      {editable && (
        <Button variant="outline" size="sm" onClick={onStartEdit}>
          Edit Submission
        </Button>
      )}
    </Card>
  );
}

// ==================== Submission Form (create/edit) ====================

function SubmissionForm({
  hackathon,
  existing,
  submissionId,
  onSaved,
}: {
  hackathon: Hackathon;
  existing?: Submission;
  submissionId?: string;
  onSaved: (s: Submission) => void;
}) {
  const [title, setTitle] = useState(existing?.title || "");
  const [description, setDescription] = useState(existing?.description || "");
  const [repoUrl, setRepoUrl] = useState(existing?.repoUrl || "");
  const [demoUrl, setDemoUrl] = useState(existing?.demoUrl || "");
  const [videoUrl, setVideoUrl] = useState(existing?.videoUrl || "");
  const [answers, setAnswers] = useState<Record<string, any>>(existing?.extraAnswers || {});
  const [files, setFiles] = useState<Record<string, File>>({});
  const [submitting, setSubmitting] = useState(false);

  const setAnswer = (key: string, value: any) => setAnswers((prev) => ({ ...prev, [key]: value }));

  const toggleCheckboxOption = (key: string, option: string) => {
    setAnswers((prev) => {
      const current: string[] = Array.isArray(prev[key]) ? prev[key] : [];
      const next = current.includes(option) ? current.filter((v) => v !== option) : [...current, option];
      return { ...prev, [key]: next };
    });
  };

  const acceptAttr = (accept?: string[]) =>
    (accept || []).map((a) => (a.includes("/") ? a : `.${a.replace(".", "")}`)).join(",");

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim()) {
      toast.error("Title and description are required.");
      return;
    }
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("description", description);
      if (repoUrl) formData.append("repoUrl", repoUrl);
      if (demoUrl) formData.append("demoUrl", demoUrl);
      if (videoUrl) formData.append("videoUrl", videoUrl);
      formData.append("extraAnswers", JSON.stringify(answers));
      Object.entries(files).forEach(([key, file]) => formData.append(key, file));

      const url = submissionId
        ? `/hackathons/submissions/${submissionId}`
        : `/hackathons/${hackathon.id}/submissions`;
      const method = submissionId ? "put" : "post";

      const res = await api.request({
        url,
        method,
        data: formData,
        headers: { "Content-Type": "multipart/form-data" },
      });
      onSaved(mapSubmission(res.data.data.submission));
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to submit.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <Label htmlFor="submission-title">Title *</Label>
        <Input id="submission-title" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div>
        <Label htmlFor="submission-description">Description *</Label>
        <Textarea id="submission-description" rows={5} value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div className="grid sm:grid-cols-3 gap-3">
        <div>
          <Label htmlFor="repoUrl">Repository URL</Label>
          <Input id="repoUrl" value={repoUrl} onChange={(e) => setRepoUrl(e.target.value)} placeholder="https://" />
        </div>
        <div>
          <Label htmlFor="demoUrl">Demo URL</Label>
          <Input id="demoUrl" value={demoUrl} onChange={(e) => setDemoUrl(e.target.value)} placeholder="https://" />
        </div>
        <div>
          <Label htmlFor="videoUrl">Video URL</Label>
          <Input id="videoUrl" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://" />
        </div>
      </div>

      {hackathon.extraQuestions.map((q) => (
        <div key={q.key}>
          <Label htmlFor={`q-${q.key}`}>
            {q.label} {q.required && <span className="text-destructive">*</span>}
          </Label>

          {q.type === "text" && (
            <Input id={`q-${q.key}`} value={answers[q.key] || ""} onChange={(e) => setAnswer(q.key, e.target.value)} />
          )}

          {q.type === "number" && (
            <Input
              id={`q-${q.key}`}
              type="number"
              value={answers[q.key] ?? ""}
              onChange={(e) => setAnswer(q.key, e.target.value)}
            />
          )}

          {q.type === "radio" && (
            <RadioGroup value={answers[q.key] || ""} onValueChange={(v) => setAnswer(q.key, v)} className="mt-2">
              {(q.options || []).map((opt) => (
                <div key={opt} className="flex items-center gap-2">
                  <RadioGroupItem value={opt} id={`${q.key}-${opt}`} />
                  <Label htmlFor={`${q.key}-${opt}`} className="font-normal">{opt}</Label>
                </div>
              ))}
            </RadioGroup>
          )}

          {q.type === "checkbox" && (
            <div className="space-y-2 mt-2">
              {(q.options || []).map((opt) => (
                <div key={opt} className="flex items-center gap-2">
                  <Checkbox
                    id={`${q.key}-${opt}`}
                    checked={Array.isArray(answers[q.key]) && answers[q.key].includes(opt)}
                    onCheckedChange={() => toggleCheckboxOption(q.key, opt)}
                  />
                  <Label htmlFor={`${q.key}-${opt}`} className="font-normal">{opt}</Label>
                </div>
              ))}
            </div>
          )}

          {q.type === "file" && (
            <Input
              id={`q-${q.key}`}
              type="file"
              accept={acceptAttr(q.accept)}
              onChange={(e) => e.target.files?.[0] && setFiles((prev) => ({ ...prev, [q.key]: e.target.files![0] }))}
            />
          )}
        </div>
      ))}

      <Button onClick={handleSubmit} disabled={submitting} variant="hero">
        {submitting ? "Submitting..." : submissionId ? "Save Changes" : "Submit Entry"}
      </Button>
    </div>
  );
}
