import { useState } from "react";
import { LegalPage } from "@/components/site/LegalPage";
import { CONTACT_EMAIL } from "@/components/site/SiteFooter";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Mail, CheckCircle2, Loader2 } from "lucide-react";
import { z } from "zod";

const contactSchema = z.object({
  firstName: z.string().trim().min(1, "Please enter your first name").max(80),
  email: z.string().trim().email("Please enter a valid email").max(200),
  message: z.string().trim().min(10, "Message must be at least 10 characters").max(2000),
});

export default function Contact() {
  const { toast } = useToast();
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const parsed = contactSchema.safeParse({ firstName, email, message });
    if (!parsed.success) {
      toast({
        title: "Please check your details",
        description: parsed.error.issues[0]?.message ?? "Invalid input",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from("feedback").insert({
      first_name: parsed.data.firstName,
      email: parsed.data.email,
      message: parsed.data.message,
      rating: null,
    });
    setSubmitting(false);

    if (error) {
      toast({
        title: "Couldn't send your message",
        description: "Please try again in a moment.",
        variant: "destructive",
      });
      return;
    }

    setSent(true);
    setMessage("");
  };

  return (
    <LegalPage eyebrow="Get in touch" title="Contact">
      <p>
        Have a question about your diagnostic, the Creator Access Hub, or a
        privacy request? Send us a note below — a real human will reply,
        usually within 2 business days.
      </p>

      {sent ? (
        <div className="not-prose mt-8 mb-8 p-6 rounded-sm border border-border bg-pearl/60">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-amethyst shrink-0 mt-0.5" />
            <div>
              <div className="font-heading text-xl text-charcoal mb-1">
                Message received
              </div>
              <p className="text-[13px] text-charcoal/70 leading-relaxed">
                Thank you, {firstName.split(" ")[0]}. We'll reply to{" "}
                <strong>{email}</strong> within 2 business days.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSent(false);
                  setFirstName("");
                  setEmail("");
                }}
                className="mt-3 text-[12px] uppercase tracking-[0.2em] text-amethyst hover:underline"
              >
                Send another message
              </button>
            </div>
          </div>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="not-prose mt-8 mb-8 p-6 rounded-sm border border-border bg-pearl/60 space-y-4"
        >
          <div className="eyebrow mb-1">Send us a message</div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="contact-name" className="text-charcoal">
                First name
              </Label>
              <Input
                id="contact-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Your first name"
                required
                maxLength={80}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contact-email" className="text-charcoal">
                Email
              </Label>
              <Input
                id="contact-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                maxLength={200}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="contact-message" className="text-charcoal">
              Your message
            </Label>
            <Textarea
              id="contact-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="How can we help? If this is about your diagnostic, mention the email you used."
              rows={6}
              required
              maxLength={2000}
            />
            <div className="text-[11px] text-charcoal/50 text-right">
              {message.length}/2000
            </div>
          </div>

          <Button
            type="submit"
            disabled={submitting}
            className="w-full sm:w-auto bg-amethyst hover:bg-amethyst/90 text-white"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending…
              </>
            ) : (
              "Send message"
            )}
          </Button>

          <p className="text-[11px] text-charcoal/60 leading-relaxed">
            Prefer email? Write to{" "}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-amethyst hover:underline inline-flex items-center gap-1"
            >
              <Mail className="w-3 h-3" />
              {CONTACT_EMAIL}
            </a>
            . For privacy requests, mention "Privacy request" in your message.
          </p>
        </form>
      )}

      <h2>Our information</h2>
      <ul>
        <li><strong>Business:</strong> Diamond Digital Diva</li>
        <li><strong>Email:</strong> {CONTACT_EMAIL}</li>
        <li><strong>Replies within:</strong> 24–48 hours</li>
        <li><strong>Jurisdiction:</strong> United States</li>
      </ul>
    </LegalPage>
  );
}
