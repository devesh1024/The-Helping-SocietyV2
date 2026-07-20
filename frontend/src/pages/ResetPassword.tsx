import { useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";
import { z } from "zod";
import { motion } from "framer-motion";
import { Loader2, Lock, CheckCircle2, XCircle } from "lucide-react";

const resetSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters long"),
    confirmPassword: z.string().min(8, "Please confirm your new password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("change");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const linkInvalid = !token;



  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    const parsed = resetSchema.safeParse({ password, confirmPassword });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/auth/reset-password", {
	      token,
	      password: parsed.data.password,
	      confirmPassword: parsed.data.confirmPassword,
      });
      toast.success(res.data?.message || "Password reset successfully.");
      setSuccess(true);
      setTimeout(() => navigate("/auth"), 2000);
    } catch (err: any) {
      toast.error(
        err.response?.data?.message ||
          "This reset link is invalid or has expired. Please request a new one."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted px-4">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-md"
      >
        <Card className="w-full p-8 glass-card relative text-center">
          <div className="flex flex-col items-center mb-6">
            <Logo className="h-36 w-36 mb-4" />
          </div>

          {linkInvalid && !success && (
            <>
              <XCircle className="mx-auto mb-4 h-10 w-10 text-destructive" />
              <h1 className="mb-2 text-xl font-semibold">Invalid reset link</h1>
              <p className="mb-6 text-muted-foreground">
                This password reset link is missing required information. Please request a
                new one from the login page.
              </p>
              <Button asChild variant="outline" className="w-full">
                <Link to="/auth">Back to Login</Link>
              </Button>
            </>
          )}

          {!linkInvalid && success && (
            <>
              <CheckCircle2 className="mx-auto mb-4 h-10 w-10 text-green-600" />
              <h1 className="mb-2 text-xl font-semibold">Password reset</h1>
              <p className="mb-6 text-muted-foreground">
                Your password has been updated. Redirecting you to login...
              </p>
              <Button asChild className="w-full">
                <Link to="/auth">Continue to Login</Link>
              </Button>
            </>
          )}

          {!linkInvalid && !success && (
            <>
              <h1 className="font-display text-2xl font-bold text-center mb-1">
                Reset your password
              </h1>
              <p className="text-sm text-muted-foreground text-center mb-6">
                Enter a new password for your account.
              </p>

              <form onSubmit={submit} className="space-y-4 text-left">
                <div>
                  <Label htmlFor="password">New Password</Label>
                  <div className="relative mt-1">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-9"
                      required
                      autoFocus
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <div className="relative mt-1">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-9"
                      required
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Resetting...
                    </>
                  ) : (
                    "Reset Password"
                  )}
                </Button>
              </form>
            </>
          )}
        </Card>
      </motion.div>
    </div>
  );
}
