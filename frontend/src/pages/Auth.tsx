import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { z } from "zod";
import { Logo } from "@/components/Logo";
import { motion } from "framer-motion";
import { ArrowRight, Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CommunityCharacters } from "@/components/CommunityCharacters";


const baseRegistrationNumberRegex = /^0701(cs|ce|ec|ee|me|cm)\d{2}(\d{4}|3d\d{2})$/i;
const studentEmailRegex = /^0701(cs|ce|ec|ee|me|cm)\d{2}(\d{4}|3d\d{2})@uecu\.ac\.in$/i;
const facultyEmailRegex = /^[a-zA-Z0-9._%+-]+@uecu\.ac\.in$/i;

const studentSignupSchema = z.object({
  fullName: z.string().trim().min(2, "Full name must be at least 2 characters long"),
  email: z.string().trim().email("Invalid email address").regex(studentEmailRegex, {
    message: "Institutional email must match your registration number structure (e.g. 0701CS23XXXX@uecu.ac.in)."
  }),
  password: z.string().min(8, "Password must be at least 8 characters long"),
  registrationNumber: z.string().regex(baseRegistrationNumberRegex, {
    message: "Registration number must match regular UECU or direct-entry diploma formats."
  }),
  branch: z.enum(['cs', 'ce', 'ec', 'ee', 'me', 'cm']),
  yearOfRegistration: z.coerce.number().int().min(2000).max(new Date().getFullYear()),
  dob: z.string().min(1, "Date of birth is required"),
  phoneNumber: z.string().min(10, "Phone number must be at least 10 digits").max(15),
}).refine((data) => {
  const emailPrefix = data.email.split('@')[0].toLowerCase();
  return emailPrefix === data.registrationNumber.toLowerCase();
}, {
  message: "Email must match your registration number.",
  path: ["email"]
});

const facultySignupSchema = z.object({
  fullName: z.string().trim().min(2, "Full name must be at least 2 characters long"),
  email: z.string().trim().email("Invalid email address").regex(facultyEmailRegex, {
    message: "Faculty email must belong to the college domain (@uecu.ac.in)."
  }),
  password: z.string().min(8, "Password must be at least 8 characters long"),
  phoneNumber: z.string().min(10, "Phone number must be at least 10 digits").max(15),
});

const contributorSignupSchema = z.object({
  fullName: z.string().trim().min(2, "Full name must be at least 2 characters long"),
  email: z.string().trim().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters long"),
  organizationName: z.string().trim().min(2, "Organization name must be at least 2 characters long"),
  roleInOrganization: z.string().trim().min(2, "Role in organization must be at least 2 characters long"),
});

const alumniSignupSchema = z.object({
  fullName: z.string().trim().min(2, "Full name must be at least 2 characters long"),
  email: z.string().trim().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters long"),
  phoneNumber: z.string().min(10, "Phone number must be at least 10 digits").max(15),
  branch: z.enum(['cs', 'ce', 'ec', 'ee', 'me', 'cm']),
  yearOfGraduation: z.coerce.number().int().min(1950).max(new Date().getFullYear() + 10),
  currentCompany: z.string().trim().min(1, "Current company is required"),
  currentRole: z.string().trim().min(1, "Current role is required"),
  linkedin: z.string().url("Invalid LinkedIn URL").regex(/^(https?:\/\/)?(www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+\/?$/i, {
    message: "LinkedIn URL must be a valid profile link."
  }).optional().or(z.literal("")),
});

const loginSchema = z.object({
  email: z.string().trim().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export default function Auth() {
  const [params] = useSearchParams();
  const initialMode = params.get("mode") === "signup" ? "signup" : "login";
  const [mode, setMode] = useState<"login" | "signup">(initialMode);
  
  // Auth state
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // Common fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"student" | "faculty" | "contributor" | "alumni">("student");
  const [rememberMe, setRememberMe] = useState(false);

  // Student specific fields
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [branch, setBranch] = useState<any>("");
  const [yearOfRegistration, setYearOfRegistration] = useState("");
  const [dob, setDob] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

  // Contributor specific fields
  const [organizationName, setOrganizationName] = useState("");
  const [roleInOrganization, setRoleInOrganization] = useState("");

  // Alumni specific fields
  const [yearOfGraduation, setYearOfGraduation] = useState("");
  const [currentCompany, setCurrentCompany] = useState("");
  const [currentRole, setCurrentRole] = useState("");
  const [linkedin, setLinkedin] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        let payload: any = {};
        let url = "";

        if (role === "student") {
          const parsed = studentSignupSchema.safeParse({
            fullName,
            email,
            password,
            registrationNumber,
            branch,
            yearOfRegistration,
            dob,
            phoneNumber,
          });
          if (!parsed.success) {
            toast.error(parsed.error.issues[0].message);
            setLoading(false);
            return;
          }
          payload = parsed.data;
          url = "/auth/register/student";
        } else if (role === "faculty") {
          const parsed = facultySignupSchema.safeParse({
            fullName,
            email,
            password,
            phoneNumber,
          });
          if (!parsed.success) {
            toast.error(parsed.error.issues[0].message);
            setLoading(false);
            return;
          }
          payload = parsed.data;
          url = "/auth/register/faculty";
        } else if (role === "contributor") {
          const parsed = contributorSignupSchema.safeParse({
            fullName,
            email,
            password,
            organizationName,
            roleInOrganization,
          });
          if (!parsed.success) {
            toast.error(parsed.error.issues[0].message);
            setLoading(false);
            return;
          }
          payload = parsed.data;
          url = "/auth/register/contributor";
        } else if (role === "alumni") {
          const parsed = alumniSignupSchema.safeParse({
            fullName,
            email,
            password,
            phoneNumber,
            branch,
            yearOfGraduation,
            currentCompany,
            currentRole,
            linkedin: linkedin || undefined,
          });
          if (!parsed.success) {
            toast.error(parsed.error.issues[0].message);
            setLoading(false);
            return;
          }
          payload = parsed.data;
          url = "/auth/register/alumni";
        }

        const res = await api.post(url, payload);
        toast.success(res.data.message || "Registration successful! Verification email sent.");
        setMode("login");
      } else {
        const parsed = loginSchema.safeParse({ email, password });
        if (!parsed.success) {
          toast.error(parsed.error.issues[0].message);
          setLoading(false);
          return;
        }
        const res = await api.post("/auth/login", parsed.data);
        const { accessToken } = res.data.data;
        
        await signIn(accessToken);
        toast.success("Signed in successfully");
        navigate("/");
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.errors?.[0]?.message || err.message || "Something went wrong";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative w-full flex items-center justify-center overflow-hidden bg-gradient-ambient p-4 sm:p-6 lg:p-12 z-0">
      {/* Full-Page Background Noise & Glow Blobs */}
      <div className="noise-overlay" />
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-[var(--glow-1)] filter blur-[100px] animate-blob-1 pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-[var(--glow-2)] filter blur-[120px] animate-blob-2 pointer-events-none" />
      <div className="absolute top-[30%] left-[30%] w-[45vw] h-[45vw] rounded-full bg-[var(--glow-3)] filter blur-[140px] animate-blob-3 pointer-events-none" />
      <div className="absolute bottom-[20%] left-[5%] w-[35vw] h-[35vw] rounded-full bg-[var(--glow-4)] filter blur-[90px] animate-blob-1 pointer-events-none" />

      {/* Main Grid Content */}
      <div className="relative z-10 w-full max-w-6xl grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12 items-center justify-center">
        
        {/* Left side: Characters and branding (hidden on mobile, smaller on tablet, full on desktop) */}
        <div className="hidden md:flex md:col-span-5 lg:col-span-6 flex-col items-center justify-center p-4">
          <Link to="/" className="flex items-center gap-3 mb-6 hover:opacity-90 transition-opacity">
            <Logo className="h-10 w-10" />
            <span className="font-display text-xl font-bold text-foreground">The Helping Society</span>
          </Link>
          
          <div className="w-full max-w-[240px] lg:max-w-[360px] flex justify-center items-center">
            <CommunityCharacters />
          </div>
          
          <p className="text-xs text-muted-foreground opacity-60 mt-6">
            © {new Date().getFullYear()} The Helping Society · One trusted space
          </p>
        </div>

        {/* Right side: Centered Login/Signup Card */}
        <div className="md:col-span-7 lg:col-span-6 col-span-12 flex justify-center items-center p-2">
          <Card className="w-full max-w-md p-8 glass-card relative">
            {/* Top Logo and welcome header */}
            <div className="flex flex-col items-center mb-6">
              <Logo className="h-36 w-36 mb-4" />
              <h1 className="font-display text-2xl font-bold text-center">
                {mode === "signup" ? "Create your account" : "Welcome Back"}
              </h1>
              <p className="text-sm text-muted-foreground text-center mt-1">
                {mode === "signup" ? "Sign up with your details for full access." : "Sign in to continue"}
              </p>
            </div>

            <form onSubmit={submit} className="space-y-4">
              {mode === "signup" && (
                <>
                  <div>
                    <Label htmlFor="role">Account Type</Label>
                    <Select value={role} onValueChange={(val: any) => setRole(val)}>
                      <SelectTrigger id="role"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="student">Student</SelectItem>
                        <SelectItem value="faculty">Faculty</SelectItem>
                        <SelectItem value="contributor">Contributor</SelectItem>
                        <SelectItem value="alumni">Alumni</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="name">Full Name</Label>
                    <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                  </div>
                </>
              )}

              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder={role === "student" && mode === "signup" ? "0701CS23XXXX@uecu.ac.in" : "you@example.com"} value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>

              <div>
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>

              {/* Remember Me and Forgot Password (only shown on Login page) */}
              {mode === "login" && (
                <div className="flex items-center justify-between mt-2 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={rememberMe} 
                      onChange={(e) => setRememberMe(e.target.checked)} 
                      className="rounded border-border bg-background text-primary focus:ring-primary h-3.5 w-3.5"
                    />
                    <span className="text-muted-foreground">Remember Me</span>
                  </label>
		  <Link
  			to="/forgot-password"
  			className="text-primary hover:underline font-medium"
			>
  			Forgot Password?
		</Link>
                </div>
              )}

              {mode === "signup" && role === "student" && (
                <>
                  <div>
                    <Label htmlFor="regNum">Registration Number</Label>
                    <Input id="regNum" placeholder="e.g. 0701CS23XXXX" value={registrationNumber} onChange={(e) => setRegistrationNumber(e.target.value)} required />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="branch">Branch</Label>
                      <Select value={branch} onValueChange={(val) => setBranch(val)}>
                        <SelectTrigger id="branch"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cs">CS</SelectItem>
                          <SelectItem value="ce">CE</SelectItem>
                          <SelectItem value="ec">EC</SelectItem>
                          <SelectItem value="ee">EE</SelectItem>
                          <SelectItem value="me">ME</SelectItem>
                          <SelectItem value="cm">CM</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="yearReg">Year of Reg</Label>
                      <Input id="yearReg" type="number" placeholder="e.g. 2023" value={yearOfRegistration} onChange={(e) => setYearOfRegistration(e.target.value)} required />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="dob">Date of Birth</Label>
                      <Input id="dob" type="date" value={dob} onChange={(e) => setDob(e.target.value)} required />
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input id="phone" placeholder="e.g. 9876543200" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} required />
                    </div>
                  </div>
                </>
              )}

              {mode === "signup" && role === "faculty" && (
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" placeholder="e.g. 9876543200" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} required />
                </div>
              )}

              {mode === "signup" && role === "contributor" && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="orgName">Organization</Label>
                    <Input id="orgName" placeholder="e.g. Google" value={organizationName} onChange={(e) => setOrganizationName(e.target.value)} required />
                  </div>
                  <div>
                    <Label htmlFor="orgRole">Role</Label>
                    <Input id="orgRole" placeholder="e.g. Engineer" value={roleInOrganization} onChange={(e) => setRoleInOrganization(e.target.value)} required />
                  </div>
                </div>
              )}

              {mode === "signup" && role === "alumni" && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="branch">Branch</Label>
                      <Select value={branch} onValueChange={(val) => setBranch(val)}>
                        <SelectTrigger id="branch"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cs">CS</SelectItem>
                          <SelectItem value="ce">CE</SelectItem>
                          <SelectItem value="ec">EC</SelectItem>
                          <SelectItem value="ee">EE</SelectItem>
                          <SelectItem value="me">ME</SelectItem>
                          <SelectItem value="cm">CM</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="yearGrad">Graduation Year</Label>
                      <Input id="yearGrad" type="number" placeholder="e.g. 2022" value={yearOfGraduation} onChange={(e) => setYearOfGraduation(e.target.value)} required />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="currentCompany">Current Company</Label>
                      <Input id="currentCompany" placeholder="e.g. Microsoft" value={currentCompany} onChange={(e) => setCurrentCompany(e.target.value)} required />
                    </div>
                    <div>
                      <Label htmlFor="currentRole">Current Role</Label>
                      <Input id="currentRole" placeholder="e.g. Software Engineer" value={currentRole} onChange={(e) => setCurrentRole(e.target.value)} required />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input id="phone" placeholder="e.g. 9876543200" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} required />
                  </div>
                  <div>
                    <Label htmlFor="linkedin">LinkedIn Profile (Optional)</Label>
                    <Input id="linkedin" placeholder="e.g. https://linkedin.com/in/username" value={linkedin} onChange={(e) => setLinkedin(e.target.value)} />
                  </div>
                </>
              )}

              <Button type="submit" variant="hero" className="w-full mt-6" size="lg" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>{mode === "signup" ? "Create account" : "Sign In"}</>}
              </Button>
            </form>

            <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
              <div className="flex-1 h-px bg-border" /> OR <div className="flex-1 h-px bg-border" />
            </div>

            {/* Google Login button */}
            <Button type="button" variant="outline" className="w-full cursor-not-allowed opacity-50" disabled>
              <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
              </svg>
              Google Login
            </Button>

            {/* Switch mode */}
            <p className="mt-6 text-sm text-center text-muted-foreground">
              {mode === "signup" ? "Already have an account?" : "New here?"}{" "}
              <button onClick={() => setMode(mode === "signup" ? "login" : "signup")} className="text-primary font-medium hover:underline">
                {mode === "signup" ? "Sign in" : "Create Account"}
              </button>
            </p>
          </Card>
        </div>
      </div>

      {/* Ambient background CSS variables, noise pattern, glassmorphism and animations */}
      <style>{`
        :root {
          --bg-base-1: #F8FCFD;
          --bg-base-2: #EEF9FB;
          --glow-1: rgba(102, 227, 255, 0.35);
          --glow-2: rgba(125, 231, 218, 0.35);
          --glow-3: rgba(166, 242, 242, 0.25);
          --glow-4: rgba(0, 184, 201, 0.2);
          --glass-bg: rgba(255, 255, 255, 0.88);
          --glass-border: rgba(0, 184, 201, 0.15);
          --glass-shadow: 0 8px 32px 0 rgba(0, 184, 201, 0.08);
        }

        .dark {
          --bg-base-1: #07141C;
          --bg-base-2: #0D1E27;
          --glow-1: rgba(0, 212, 255, 0.2);
          --glow-2: rgba(0, 184, 201, 0.2);
          --glow-3: rgba(79, 216, 200, 0.15);
          --glow-4: rgba(14, 116, 144, 0.2);
          --glass-bg: rgba(12, 18, 24, 0.82);
          --glass-border: rgba(0, 212, 255, 0.08);
          --glass-shadow: 0 8px 32px 0 rgba(0, 212, 255, 0.05);
        }

        .bg-gradient-ambient {
          background: linear-gradient(180deg, var(--bg-base-1) 0%, var(--bg-base-2) 100%);
        }

        .noise-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          content: "";
          opacity: 0.025;
          pointer-events: none;
          z-index: 1;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
        }

        .glass-card {
          background: var(--glass-bg);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid var(--glass-border);
          box-shadow: var(--glass-shadow), 0 0 20px 2px rgba(6, 182, 212, 0.03);
          border-radius: 1.5rem;
          transition: all 0.3s ease;
        }

        @keyframes float-blob-1 {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.08); }
          66% { transform: translate(-20px, 20px) scale(0.92); }
          100% { transform: translate(0px, 0px) scale(1); }
        }

        @keyframes float-blob-2 {
          0% { transform: translate(0px, 0px) scale(1.05); }
          50% { transform: translate(-40px, 40px) scale(0.95); }
          100% { transform: translate(0px, 0px) scale(1.05); }
        }

        @keyframes float-blob-3 {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(-30px, -30px) scale(0.93); }
          66% { transform: translate(30px, 20px) scale(1.07); }
          100% { transform: translate(0px, 0px) scale(1); }
        }

        .animate-blob-1 {
          animation: float-blob-1 18s ease-in-out infinite;
        }
        .animate-blob-2 {
          animation: float-blob-2 22s ease-in-out infinite;
        }
        .animate-blob-3 {
          animation: float-blob-3 28s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
