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

  return (
    <div className="animate-fade-in">
      <h2 className="text-2xl mb-4">Almost done</h2>
      <p className="text-muted-foreground mb-6">
        Enter your details to receive your personalized results.
      </p>

      <div className="space-y-4 mb-6">
        <label className="block">
          <span className="text-sm opacity-90">First name</span>
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="w-full mt-2 px-4 py-3 rounded-lg border-2 border-soft-blush bg-secondary text-foreground font-input focus:outline-none focus:ring-2 focus:ring-soft-blush/50"
            placeholder="Your first name"
          />
        </label>

        <label className="block">
          <span className="text-sm opacity-90">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full mt-2 px-4 py-3 rounded-lg border-2 border-soft-blush bg-secondary text-foreground font-input focus:outline-none focus:ring-2 focus:ring-soft-blush/50"
            placeholder="your@email.com"
          />
        </label>
      </div>

      <div className="flex justify-between gap-3">
        <QuizButton variant="ghost" onClick={onBack} className="border-soft-blush hover:bg-soft-blush/20">
          Back
        </QuizButton>
        <QuizButton onClick={handleSubmit} className="bg-soft-blush hover:bg-soft-blush/80 text-charcoal border-2 border-soft-blush">Get My Result</QuizButton>
      </div>
    </div>
  );
}
