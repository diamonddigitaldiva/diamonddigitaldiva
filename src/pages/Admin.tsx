import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw, LogOut, CheckCircle, XCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface QuizSubmission {
  id: string;
  first_name: string;
  email: string;
  primary_stage: string;
  secondary_stage: string | null;
  webhook_sent: boolean;
  webhook_sent_at: string | null;
  retry_count: number;
  created_at: string;
  source: string | null;
}

export default function Admin() {
  const { user, isAdmin, isLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [submissions, setSubmissions] = useState<QuizSubmission[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/auth');
    }
  }, [user, isLoading, navigate]);

  useEffect(() => {
    if (user && isAdmin) {
      fetchSubmissions();
    }
  }, [user, isAdmin]);

  const fetchSubmissions = async () => {
    try {
      const { data, error } = await supabase
        .from('quiz_submissions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setSubmissions(data || []);
    } catch (error) {
      console.error('Error fetching submissions:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load submissions.',
      });
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchSubmissions();
    setIsRefreshing(false);
    toast({
      title: 'Refreshed',
      description: 'Submissions list updated.',
    });
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="quiz-card text-center max-w-md">
          <h1 className="text-2xl font-heading mb-4">Access Denied</h1>
          <p className="text-muted-foreground mb-4">
            You don't have admin privileges. Contact an administrator to request access.
          </p>
          <Button onClick={handleSignOut} variant="outline">
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>
    );
  }

  const failedCount = submissions.filter(s => !s.webhook_sent).length;
  const successCount = submissions.filter(s => s.webhook_sent).length;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container py-4 flex items-center justify-between">
          <h1 className="text-xl font-heading">Quiz Submissions</h1>
          <div className="flex items-center gap-2">
            <Button 
              onClick={handleRefresh} 
              variant="outline" 
              size="sm"
              disabled={isRefreshing}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={handleSignOut} variant="ghost" size="sm">
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="quiz-card">
            <p className="text-sm text-muted-foreground">Total Submissions</p>
            <p className="text-2xl font-heading">{submissions.length}</p>
          </div>
          <div className="quiz-card">
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <CheckCircle className="w-4 h-4 text-green-600" /> Sent to CRM
            </p>
            <p className="text-2xl font-heading">{successCount}</p>
          </div>
          <div className="quiz-card">
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Clock className="w-4 h-4 text-amber-600" /> Pending Retry
            </p>
            <p className="text-2xl font-heading">{failedCount}</p>
          </div>
        </div>

        {/* Table */}
        <div className="quiz-card overflow-hidden">
          {isLoadingData ? (
            <div className="p-8 text-center text-muted-foreground">Loading submissions...</div>
          ) : submissions.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No submissions yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Primary Stage</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Retries</TableHead>
                    <TableHead>Submitted</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {submissions.map((submission) => (
                    <TableRow key={submission.id}>
                      <TableCell className="font-medium">{submission.first_name}</TableCell>
                      <TableCell>{submission.email}</TableCell>
                      <TableCell>{submission.primary_stage}</TableCell>
                      <TableCell>
                        {submission.webhook_sent ? (
                          <Badge variant="default" className="bg-green-600">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Sent
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                            <Clock className="w-3 h-3 mr-1" />
                            Pending
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{submission.retry_count}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(submission.created_at), 'MMM d, yyyy h:mm a')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
