import { Link } from "react-router-dom";
import { Logo } from "./Logo";
import { Instagram, Youtube, Linkedin } from "lucide-react";

const WhatsappIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
    <path d="M12.004 2.003c-5.514 0-9.997 4.483-9.997 9.997 0 1.763.462 3.483 1.34 4.997l-1.42 5.19 5.32-1.394a9.96 9.96 0 0 0 4.757 1.204h.004c5.514 0 9.997-4.483 9.997-9.997 0-2.671-1.04-5.182-2.929-7.071a9.93 9.93 0 0 0-7.072-2.926zm0 18.16h-.003a8.148 8.148 0 0 1-4.153-1.137l-.298-.177-3.155.827.842-3.075-.194-.316a8.156 8.156 0 0 1-1.252-4.365c0-4.507 3.667-8.174 8.176-8.174 2.184 0 4.238.85 5.784 2.396a8.126 8.126 0 0 1 2.393 5.783c0 4.508-3.667 8.175-8.14 8.175z" />
  </svg>
);

const socialLinks = [
  { label: "Instagram", href: "https://www.instagram.com/the_helping_society_?igsh=ZHJqMjY4aGY0eDNx", icon: Instagram },
  { label: "LinkedIn", href: "https://www.linkedin.com/groups/32620079", icon: Linkedin },
  { label: "YouTube", href: "https://youtube.com/@thehelpingsocietygecu?si=mhU8Y08PS5hNZEmS", icon: Youtube },
  { label: "WhatsApp Channel", href: "https://whatsapp.com/channel/0029Vb8ZlP372WTvE4GOmV2D", icon: WhatsappIcon },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-muted/30 mt-20">
      <div className="container py-10 grid gap-6 md:grid-cols-4">
        <div className="flex items-start gap-3">
          <Logo className="h-10 w-10" />
          <div>
            <p className="font-display font-bold text-foreground">The Helping Society</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-xs">
              Verified college community for students, alumni & faculty of UECU.
            </p>
            <div className="flex items-center gap-3 mt-3">
              {socialLinks.map((social) => (
                
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  className="text-muted-foreground hover:text-primary transition-smooth"
                >
                  <social.icon className="h-7 w-7" />
                </a>
              ))}
            </div>
          </div>
        </div>
	<div>
          <p className="font-semibold text-sm mb-2">Quick Contact</p>
          <ul className="text-sm text-muted-foreground space-y-2 flex flex-col">
            <li>
              <a href="tel:+919407097642" className="hover:text-primary transition-smooth">+91 94070 97642</a>,<br />
              <a href="https://wa.me/917879453082" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-smooth">+91 78794 53082</a>
            </li>
            <li>
              <a href="mailto:support@thehelpingsociety.in" className="hover:text-primary transition-smooth">support@thehelpingsociety.in</a>
            </li>
          </ul>
        </div>
        <div>
          <p className="font-semibold text-sm mb-2">Modules</p>
          <ul className="text-sm text-muted-foreground space-y-1.5 flex flex-col">
            <li><Link to="/resources" className="hover:text-primary transition-smooth">Resource Hub</Link></li>
            <li><Link to="/opportunities" className="hover:text-primary transition-smooth">Opportunities</Link></li>
            <li><Link to="/community" className="hover:text-primary transition-smooth">Community</Link></li>
            <li><Link to="/support" className="hover:text-primary transition-smooth">Support</Link></li>
          </ul>
        </div>
        <div>
          <p className="font-semibold text-sm mb-2">Legal</p>
          <ul className="text-sm text-muted-foreground space-y-1.5 flex flex-col">
            <li><Link to="/legal/privacy" className="hover:text-primary transition-smooth">Privacy Policy</Link></li>
            <li><Link to="/legal/terms" className="hover:text-primary transition-smooth">Terms & Conditions</Link></li>
            <li><Link to="/legal/cookies" className="hover:text-primary transition-smooth">Cookie Policy</Link></li>
            <li><Link to="/legal/disclaimer" className="hover:text-primary transition-smooth">Disclaimer</Link></li>
          </ul>
        </div>
	</div>
	<div className="border-t border-border py-4 text-center text-xs text-muted-foreground">
        The Helping Society, Ujjain Engineering College, Indore-Ujjain Road, Ujjain, MP 456010
      </div>
    </footer>
  );
}
