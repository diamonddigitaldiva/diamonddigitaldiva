import { useState } from "react";
import { QuizButton } from "@/components/ui/quiz-button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

interface LeadScreenProps {
  onBack: () => void;
  onSubmit: (firstName: string, email: string, hubConsent: boolean) => void;
}

export function LeadScreen({ onBack, onSubmit }: LeadScreenProps) {
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [hubConsent, setHubConsent] = useState(false);
  const { toast } = useToast();

  const handleSubmit = () => {
    if (!firstName.trim() || !email.trim()) {
      toast({
        title: "Please fill in all fields",
        description: "We need your first name and email to show your results.",
        variant: "destructive",
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    onSubmit(firstName.trim(), email.trim(), hubConsent);
  };

  const inputClass =
    "w-full mt-2 px-4 py-3 rounded-sm border border-border bg-pearl text-charcoal " +
    "font-input text-lg focus:outline-none focus:border-amethyst focus:ring-1 focus:ring-amethyst/40 transition-colors";

  return (
    <div className="animate-fade-in max-w-xl mx-auto">
      <div className="text-center mb-8">
        <div className="eyebrow mb-3">Almost There</div>
        <h2 className="font-heading text-3xl md:text-4xl text-charcoal mb-3">Your results await</h2>
        <p className="text-charcoal/70 text-[15px]">
          Enter your details to receive your personalized blueprint.
        </p>
      </div>

      <div className="space-y-5 mb-6">
        <label className="block">
          <span className="eyebrow text-charcoal/70">First name</span>
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className={inputClass}
            placeholder="Your first name"
          />
        </label>

        <label className="block">
          <span className="eyebrow text-charcoal/70">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            placeholder="your@email.com"
          />
        </label>
      </div>

      <label
        htmlFor="hub-consent"
        className="flex items-start gap-3 p-4 mb-8 rounded-sm border border-border bg-pearl/60 cursor-pointer hover:border-amethyst/50 transition-colors"
      >
        <Checkbox
          id="hub-consent"
          checked={hubConsent}
          onCheckedChange={(v) => setHubConsent(v === true)}
          className="mt-0.5"
        />
        <span className="text-[13px] leading-relaxed text-charcoal/80">
          I authorize Diamond Digital Diva to send my <strong>name, email, and diagnostic
          results</strong> to the <strong>Creator Access Hub</strong> so Ava can give me
          tailored recommendations and so my activity can be linked to my results for
          reporting. I can withdraw consent at any time by contacting support.
        </span>
      </label>

      <p className="text-[11px] leading-relaxed text-charcoal/60 text-center mb-6">
        By continuing you agree to our{" "}
        <a href="/terms" target="_blank" rel="noopener noreferrer" className="underline hover:text-amethyst">Terms</a>{" "}
        and{" "}
        <a href="/privacy" target="_blank" rel="noopener noreferrer" className="underline hover:text-amethyst">Privacy Policy</a>,
        and to receive resources and occasional marketing emails (unsubscribe anytime).
      </p>

      <div className="flex justify-between gap-3">
        <QuizButton variant="ghost" onClick={onBack}>Back</QuizButton>
        <QuizButton onClick={handleSubmit}>Get My Result</QuizButton>
      </div>
    </div>
  );
}
