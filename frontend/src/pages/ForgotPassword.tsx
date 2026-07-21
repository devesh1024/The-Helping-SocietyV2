import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";
import { z } from "zod";
import { motion } from "framer-motion";
import { Loader2, Mail, ArrowLeft, ShieldAlert } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

const emailSchema = z.string().trim().email("Please enter a valid email address");

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [showVerifyDialog, setShowVerifyDialog] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }

    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email: parsed.data });
      setSent(true);
    } catch (err: any) {
      if (err.response?.data?.code === "EMAIL_NOT_VERIFIED") {
        setShowVerifyDialog(true);
      } else {
        toast.error(err.response?.data?.message || "Something went wrong. Please try again.");
      }
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
        <Card className="w-full p-8 glass-card relative">
          <div className="flex flex-col items-center mb-6">
            <Logo className="h-36 w-36 mb-4" />
            <h1 className="font-display text-2xl font-bold text-center">
              {sent ? "Check your inbox" : "Forgot your password?"}
            </h1>
            <p className="text-sm text-muted-foreground text-center mt-1">
              {sent
                ? "If your email is registered and verified, a reset link is on its way."
                : "Enter your registered email and we'll send you a reset link."}
            </p>
          </div>

          {!sent ? (
            <form onSubmit={submit} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <div className="relative mt-1">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending link...
                  </>
                ) : (
                  "Send Reset Link"
                )}
              </Button>
            </form>
          ) : (
            <div className="flex justify-center">
              <Mail className="h-12 w-12 text-primary" strokeWidth={1.5} />
            </div>
          )}

          <div className="mt-6 text-center">
            <Link
              to="/auth"
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline font-medium"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Login
            </Link>
          </div>
        </Card>
      </motion.div>

      <Dialog open={showVerifyDialog} onOpenChange={setShowVerifyDialog}>
        <DialogContent className="sm:max-w-sm text-center">
          <DialogHeader className="items-center">
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
              <ShieldAlert className="h-6 w-6 text-amber-600" />
            </div>
            <DialogTitle>Please verify your email first</DialogTitle>
            <DialogDescription>
              You need to verify your email address before you can reset your password.
              Check your inbox for the verification link we sent when you signed up.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center">
            <Button onClick={() => setShowVerifyDialog(false)} className="w-full sm:w-auto">
              Got it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
