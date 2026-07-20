import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { ArrowRight, BookOpen, Briefcase, CheckCircle2, Heart, LifeBuoy, Lock, Shield, Sparkles } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const modules = [
  { icon: BookOpen, title: "Resource Hub", desc: "Notes, papers and study material — uploaded by peers, approved by admins, viewable in-app via PDF viewer.", color: "from-primary to-primary-glow" },
  { icon: Briefcase, title: "Opportunities", desc: "Curated jobs, internships and contests posted exclusively by your campus' Our admins.", color: "from-secondary to-secondary-glow" },
  { icon: Heart, title: "Community", desc: "Lost & found, rooms and a campus marketplace — talk to verified people only.", color: "from-primary to-secondary" },
  { icon: LifeBuoy, title: "Support", desc: "Raise help requests. Medical emergencies go live instantly. Stay anonymous if you need to.", color: "from-secondary to-primary" },
];

export default function Index() {
  const { user, isVerified } = useAuth();

  return (
    <Layout style={{ zoom: 1.1 }}>
      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-hero">
        <div className="container py-20 md:py-32 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
            className="max-w-3xl"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium mb-6 border border-primary/20">
              <Sparkles className="h-3.5 w-3.5" /> Verified ecosystem for UECU students, alumni & faculty
            </div>
            <h1 className="font-display font-extrabold text-4xl md:text-6xl lg:text-7xl leading-[1.05] text-balance">
              Help. Learn. <span className="text-primary">Belong.</span>
              <br />All in one trusted place.
            </h1>
            <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl text-balance">
              The Helping Society is the verified, college-only platform connecting you with resources,
              opportunities, community help and emergency support — moderated, private, and built for UECU.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {!user ? (
                <>
                  <Button asChild variant="hero" size="xl">
                    <Link to="/auth?mode=signup">Get started <ArrowRight className="h-4 w-4" /></Link>
                  </Button>
                  <Button asChild variant="outline" size="xl">
                    <Link to="/resources">Browse resources</Link>
                  </Button>
                </>
              ) : (
                <>
                  <Button asChild variant="hero" size="xl">
                    <Link to="/resources">Open Resource Hub <ArrowRight className="h-4 w-4" /></Link>
                  </Button>
                  {!isVerified && (
                    <Button asChild variant="accent" size="xl">
                      <Link to="/profile">Get verified</Link>
                    </Button>
                  )}
                </>
              )}
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
              <span className="flex items-center gap-2"><Shield className="h-4 w-4 text-primary" /> @uecu.ac.in verified</span>
              <span className="flex items-center gap-2"><Lock className="h-4 w-4 text-primary" /> Private file access</span>
              <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> Admin moderated</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, delay: 0.2 }}
            className="hidden lg:block absolute right-12 top-10 h-[500px] w-[500px]"
          >
            <div className="absolute inset-0 bg-gradient-primary rounded-full blur-3xl opacity-35 animate-float" />
            <Logo className="absolute inset-0 m-auto h-96 w-96 animate-float" />
          </motion.div>
        </div>
        {/* Fade overlay to blend hero section into the next section */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent pointer-events-none" />
      </section>

      {/* MODULES */}
      <section className="container py-20">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="font-display text-3xl md:text-4xl font-bold">Everything campus life needs.</h2>
          <p className="mt-3 text-muted-foreground">Four tightly-integrated modules. One verified identity.</p>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          {modules.map((m, i) => (
            <motion.div
              key={m.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="group relative p-8 rounded-2xl bg-card border border-border shadow-soft hover:shadow-elegant transition-smooth overflow-hidden"
            >
              <div className={`absolute -top-10 -right-10 h-32 w-32 rounded-full bg-gradient-to-br ${m.color} opacity-10 group-hover:opacity-20 transition-smooth blur-xl`} />
              <m.icon className="h-10 w-10 text-primary mb-4" />
              <h3 className="font-display font-bold text-xl mb-2">{m.title}</h3>
              <p className="text-muted-foreground">{m.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container pb-20">
        <div className="rounded-3xl bg-gradient-primary p-10 md:p-16 text-center text-primary-foreground relative overflow-hidden shadow-elegant">
          <div className="absolute top-0 left-0 h-full w-full bg-[radial-gradient(circle_at_30%_50%,hsl(var(--secondary)/0.3),transparent_50%)]" />
          <div className="relative">
            <h2 className="font-display text-3xl md:text-5xl font-bold text-balance">Join your college's verified network.</h2>
            <p className="mt-4 opacity-90 max-w-xl mx-auto">Sign up with your @uecu.ac.in email and get instant access to everything.</p>
            {!user && (
              <Button asChild variant="accent" size="xl" className="mt-8">
                <Link to="/auth?mode=signup">Create your account <ArrowRight className="h-4 w-4" /></Link>
              </Button>
            )}
          </div>
        </div>
      </section>
    </Layout>
  );
}
