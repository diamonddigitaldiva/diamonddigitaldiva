import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Save, Loader2 } from 'lucide-react';

interface QuizQuestion {
  id: string;
  question_index: number;
  question_text: string;
  options: Record<string, string>;
}

export function QuestionsEditor() {
  const { toast } = useToast();
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    const { data, error } = await supabase
      .from('quiz_questions')
      .select('*')
      .order('question_index', { ascending: true });

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to load questions.' });
    } else {
      const mapped = (data || []).map(q => ({
        id: q.id,
        question_index: q.question_index,
        question_text: q.question_text,
        options: q.options as Record<string, string>
      }));
      setQuestions(mapped);
    }
    setIsLoading(false);
  };

  const handleQuestionChange = (id: string, field: 'question_text' | 'options', value: string | Record<string, string>) => {
    setQuestions(prev => prev.map(q => 
      q.id === id ? { ...q, [field]: value } : q
    ));
  };

  const handleOptionChange = (questionId: string, optionKey: string, value: string) => {
    setQuestions(prev => prev.map(q => {
      if (q.id === questionId) {
        return {
          ...q,
          options: { ...q.options, [optionKey]: value }
        };
      }
      return q;
    }));
  };

  const saveQuestion = async (question: QuizQuestion) => {
    setSavingId(question.id);
    const { error } = await supabase
      .from('quiz_questions')
      .update({
        question_text: question.question_text,
        options: question.options
      })
      .eq('id', question.id);

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to save question.' });
    } else {
      toast({ title: 'Saved', description: `Question ${question.question_index + 1} updated.` });
    }
    setSavingId(null);
  };

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading questions...</div>;
  }

  return (
    <div className="space-y-6">
      {questions.map((question) => (
        <div key={question.id} className="quiz-card space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-heading text-lg">Question {question.question_index + 1}</h3>
            <Button 
              size="sm" 
              onClick={() => saveQuestion(question)}
              disabled={savingId === question.id}
            >
              {savingId === question.id ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save
            </Button>
          </div>
          
          <div>
            <Label htmlFor={`q-${question.id}`}>Question Text</Label>
            <Textarea
              id={`q-${question.id}`}
              value={question.question_text}
              onChange={(e) => handleQuestionChange(question.id, 'question_text', e.target.value)}
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Object.entries(question.options).map(([key, value]) => (
              <div key={key} className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                  {key}
                </span>
                <Input
                  value={value}
                  onChange={(e) => handleOptionChange(question.id, key, e.target.value)}
                  className="flex-1"
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
