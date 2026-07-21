import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Logo } from "./Logo";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bell, BookOpen, Briefcase, Heart, LifeBuoy, LogOut, Menu, Shield, Trophy, User as UserIcon, X } from "lucide-react";
import { useState } from "react";
import { NotificationBell } from "./NotificationBell";
import { ThemeToggle } from "./ThemeToggle";

const links = [
  { to: "/resources", label: "Resources", icon: BookOpen },
  { to: "/opportunities", label: "Opportunities", icon: Briefcase },
  { to: "/hackathons", label: "Hackathons", icon: Trophy },
  { to: "/community", label: "Community", icon: Heart },
  { to: "/support", label: "Support", icon: LifeBuoy },
];

export function Navbar() {
  const { user, profile, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/85 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between gap-4">
        <NavLink to="/" className="flex items-center gap-2.5 group">
          <Logo className="h-9 w-9 transition-transform group-hover:scale-105" />
          <div className="hidden sm:flex flex-col leading-tight">
            <span className="font-display font-bold text-[15px] text-foreground">The Helping Society</span>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">UECU</span>
          </div>
        </NavLink>

        <nav className="hidden md:flex items-center gap-1">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `px-3.5 py-2 rounded-lg text-sm font-medium transition-smooth ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
          {isAdmin && (
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                `px-3.5 py-2 rounded-lg text-sm font-medium transition-smooth flex items-center gap-1.5 ${
                  isActive ? "bg-secondary/15 text-secondary" : "text-secondary hover:bg-secondary/10"
                }`
              }
            >
              <Shield className="h-3.5 w-3.5" /> Admin
            </NavLink>
          )}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          {user ? (
            <>
              <NotificationBell />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2">
                    <div className="h-8 w-8 rounded-full bg-gradient-primary text-primary-foreground grid place-items-center text-xs font-semibold">
                      {(profile?.full_name || profile?.email || "?").charAt(0).toUpperCase()}
                    </div>
                    <span className="hidden sm:inline text-sm font-medium max-w-[120px] truncate">
                      {profile?.full_name || profile?.email}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="flex flex-col gap-0.5">
                    <span className="font-medium">{profile?.full_name || "User"}</span>
                    <span className="text-xs font-normal text-muted-foreground truncate">{profile?.email}</span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/profile")}>
                    <UserIcon className="h-4 w-4 mr-2" /> Profile
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem onClick={() => navigate("/admin")}>
                      <Shield className="h-4 w-4 mr-2" /> Admin Panel
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={async () => { await signOut(); navigate("/"); }}>
                    <LogOut className="h-4 w-4 mr-2" /> Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => navigate("/auth")}>Sign in</Button>
              <Button variant="hero" size="sm" onClick={() => navigate("/auth?mode=signup")}>Join</Button>
            </>
          )}
          <button className="md:hidden p-2" onClick={() => setOpen(!open)} aria-label="Menu">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden border-t border-border bg-background">
          <nav className="container py-3 flex flex-col gap-1">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium ${
                    isActive ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted"
                  }`
                }
              >
                <l.icon className="h-4 w-4" /> {l.label}
              </NavLink>
            ))}
            {isAdmin && (
              <NavLink to="/admin" onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-secondary">
                <Shield className="h-4 w-4" /> Admin Panel
              </NavLink>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
