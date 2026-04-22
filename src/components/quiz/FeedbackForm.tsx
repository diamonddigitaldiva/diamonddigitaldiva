import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Star, Loader2, CheckCircle } from 'lucide-react';
import { z } from 'zod';
import { forwardToHQ } from '@/lib/hqTracking';

const feedbackSchema = z.object({
  message: z.string().trim().min(1, 'Please share your feedback').max(1000, 'Feedback must be less than 1000 characters'),
  rating: z.number().min(1).max(5),
});

interface FeedbackFormProps {
  email: string;
  firstName: string;
}

export function FeedbackForm({ email, firstName }: FeedbackFormProps) {
  const { toast } = useToast();
  const [message, setMessage] = useState('');
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async () => {
    const validation = feedbackSchema.safeParse({ message, rating });
    
    if (!validation.success) {
      toast({ 
        variant: 'destructive', 
        title: 'Error', 
        description: validation.error.errors[0]?.message || 'Please complete the form'
      });
      return;
    }

    setIsSubmitting(true);
    
    const { error } = await supabase
      .from('feedback')
      .insert({
        email,
        first_name: firstName,
        message: validation.data.message,
        rating: validation.data.rating
      });

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to submit feedback.' });
    } else {
      forwardToHQ({
        type: 'feedback_submitted',
        rating: validation.data.rating,
        has_message: validation.data.message.length > 0,
      });
      setIsSubmitted(true);
      toast({ title: 'Thank you!', description: 'Your feedback has been submitted.' });
    }
    setIsSubmitting(false);
  };

  if (isSubmitted) {
    return (
      <div className="mt-10 p-6 bg-ivory rounded-sm border border-gold/40 text-center animate-fade-in">
        <CheckCircle className="w-8 h-8 text-amethyst mx-auto mb-2" />
        <p className="text-sm text-charcoal">Thank you for your feedback!</p>
      </div>
    );
  }

  return (
    <div className="mt-10 p-6 bg-ivory rounded-sm border border-gold/40 animate-fade-in">
      <h3 className="font-heading text-xl text-charcoal mb-4 text-center">How was your experience?</h3>

      <div className="flex justify-center gap-1 mb-4">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            onMouseEnter={() => setHoveredRating(star)}
            onMouseLeave={() => setHoveredRating(0)}
            className="p-1 transition-transform hover:scale-110"
          >
            <Star
              className={`w-7 h-7 transition-colors ${
                star <= (hoveredRating || rating)
                  ? 'fill-gold text-gold'
                  : 'text-charcoal/25'
              }`}
            />
          </button>
        ))}
      </div>

      <Textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Share your thoughts about the quiz..."
        className="mb-4 bg-pearl border-border focus-visible:ring-amethyst/40"
        maxLength={1000}
      />

      <Button
        onClick={handleSubmit}
        disabled={isSubmitting || rating === 0}
        className="w-full bg-amethyst hover:bg-amethyst-deep text-pearl uppercase tracking-[0.25em] text-[11px] font-semibold rounded-sm py-6"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Submitting...
          </>
        ) : (
          'Submit Feedback'
        )}
      </Button>
    </div>
  );
}
