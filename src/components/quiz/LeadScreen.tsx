import { useState } from "react";
import { QuizButton } from "@/components/ui/quiz-button";
import { useToast } from "@/hooks/use-toast";

interface LeadScreenProps {
  onBack: () => void;
  onSubmit: (firstName: string, email: string) => void;
}

export function LeadScreen({ onBack, onSubmit }: LeadScreenProps) {
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
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

    onSubmit(firstName.trim(), email.trim());
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

      <div className="space-y-5 mb-8">
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

      <div className="flex justify-between gap-3">
        <QuizButton variant="ghost" onClick={onBack}>Back</QuizButton>
        <QuizButton onClick={handleSubmit}>Get My Result</QuizButton>
      </div>
    </div>
  );
}
