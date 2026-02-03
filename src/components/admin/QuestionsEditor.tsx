import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Save, Loader2, Plus, Trash2, X } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

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
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

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

  const addOption = (questionId: string) => {
    setQuestions(prev => prev.map(q => {
      if (q.id === questionId) {
        const existingKeys = Object.keys(q.options);
        // Find next available letter
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        let newKey = '';
        for (const letter of alphabet) {
          if (!existingKeys.includes(letter)) {
            newKey = letter;
            break;
          }
        }
        if (!newKey) {
          toast({ variant: 'destructive', title: 'Error', description: 'Maximum options reached.' });
          return q;
        }
        return {
          ...q,
          options: { ...q.options, [newKey]: '' }
        };
      }
      return q;
    }));
  };

  const removeOption = (questionId: string, optionKey: string) => {
    setQuestions(prev => prev.map(q => {
      if (q.id === questionId) {
        const newOptions = { ...q.options };
        delete newOptions[optionKey];
        return { ...q, options: newOptions };
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

  const addQuestion = async () => {
    setIsAdding(true);
    const newIndex = questions.length;
    const { data, error } = await supabase
      .from('quiz_questions')
      .insert({
        question_index: newIndex,
        question_text: 'New question',
        options: { A: 'Option A', B: 'Option B', C: 'Option C' }
      })
      .select()
      .single();

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to add question.' });
    } else if (data) {
      setQuestions(prev => [...prev, {
        id: data.id,
        question_index: data.question_index,
        question_text: data.question_text,
        options: data.options as Record<string, string>
      }]);
      toast({ title: 'Added', description: 'New question created.' });
    }
    setIsAdding(false);
  };

  const deleteQuestion = async (question: QuizQuestion) => {
    setDeletingId(question.id);
    const { error } = await supabase
      .from('quiz_questions')
      .delete()
      .eq('id', question.id);

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete question.' });
    } else {
      setQuestions(prev => prev.filter(q => q.id !== question.id));
      toast({ title: 'Deleted', description: `Question removed.` });
      // Reindex remaining questions
      reindexQuestions();
    }
    setDeletingId(null);
  };

  const reindexQuestions = async () => {
    const remaining = questions.filter(q => q.id !== deletingId);
    for (let i = 0; i < remaining.length; i++) {
      if (remaining[i].question_index !== i) {
        await supabase
          .from('quiz_questions')
          .update({ question_index: i })
          .eq('id', remaining[i].id);
      }
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading questions...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={addQuestion} disabled={isAdding}>
          {isAdding ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Plus className="w-4 h-4 mr-2" />
          )}
          Add Question
        </Button>
      </div>

      {questions.map((question) => (
        <div key={question.id} className="quiz-card space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-heading text-lg">Question {question.question_index + 1}</h3>
            <div className="flex gap-2">
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
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="destructive" disabled={deletingId === question.id}>
                    {deletingId === question.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Question?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete Question {question.question_index + 1}. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => deleteQuestion(question)}>Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
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

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Answer Options</Label>
              <Button size="sm" variant="outline" onClick={() => addOption(question.id)}>
                <Plus className="w-3 h-3 mr-1" />
                Add Option
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.entries(question.options)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([key, value]) => (
                <div key={key} className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                    {key}
                  </span>
                  <Input
                    value={value}
                    onChange={(e) => handleOptionChange(question.id, key, e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => removeOption(question.id, key)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}

      {questions.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No questions yet. Click "Add Question" to create one.
        </div>
      )}
    </div>
  );
}
