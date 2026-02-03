import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Save, Loader2, Plus, Trash2 } from 'lucide-react';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface StageLink {
  id: string;
  stage_code: string;
  stage_name: string;
  link_url: string;
}

export function LinksEditor() {
  const { toast } = useToast();
  const [links, setLinks] = useState<StageLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newLink, setNewLink] = useState({ stage_code: '', stage_name: '', link_url: '' });

  useEffect(() => {
    fetchLinks();
  }, []);

  const fetchLinks = async () => {
    const { data, error } = await supabase
      .from('stage_links')
      .select('*')
      .order('stage_code', { ascending: true });

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to load links.' });
    } else {
      setLinks(data || []);
    }
    setIsLoading(false);
  };

  const handleChange = (id: string, field: keyof StageLink, value: string) => {
    setLinks(prev => prev.map(l => 
      l.id === id ? { ...l, [field]: value } : l
    ));
  };

  const saveLink = async (link: StageLink) => {
    setSavingId(link.id);
    const { error } = await supabase
      .from('stage_links')
      .update({
        stage_name: link.stage_name,
        link_url: link.link_url
      })
      .eq('id', link.id);

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to save link.' });
    } else {
      toast({ title: 'Saved', description: `${link.stage_code} link updated.` });
    }
    setSavingId(null);
  };

  const addLink = async () => {
    if (!newLink.stage_code || !newLink.stage_name || !newLink.link_url) {
      toast({ variant: 'destructive', title: 'Error', description: 'All fields are required.' });
      return;
    }

    setIsAdding(true);
    const { data, error } = await supabase
      .from('stage_links')
      .insert({
        stage_code: newLink.stage_code.toUpperCase(),
        stage_name: newLink.stage_name,
        link_url: newLink.link_url
      })
      .select()
      .single();

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to add link. Stage code may already exist.' });
    } else if (data) {
      setLinks(prev => [...prev, data].sort((a, b) => a.stage_code.localeCompare(b.stage_code)));
      toast({ title: 'Added', description: `${data.stage_code} link created.` });
      setNewLink({ stage_code: '', stage_name: '', link_url: '' });
      setIsAddDialogOpen(false);
    }
    setIsAdding(false);
  };

  const deleteLink = async (link: StageLink) => {
    setDeletingId(link.id);
    const { error } = await supabase
      .from('stage_links')
      .delete()
      .eq('id', link.id);

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete link.' });
    } else {
      setLinks(prev => prev.filter(l => l.id !== link.id));
      toast({ title: 'Deleted', description: `${link.stage_code} link removed.` });
    }
    setDeletingId(null);
  };

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading links...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Link
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Stage Link</DialogTitle>
              <DialogDescription>
                Create a new stage link for the quiz results.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="new-code">Stage Code</Label>
                <Input
                  id="new-code"
                  value={newLink.stage_code}
                  onChange={(e) => setNewLink(prev => ({ ...prev, stage_code: e.target.value }))}
                  placeholder="e.g., NEW"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="new-name">Display Name</Label>
                <Input
                  id="new-name"
                  value={newLink.stage_name}
                  onChange={(e) => setNewLink(prev => ({ ...prev, stage_name: e.target.value }))}
                  placeholder="e.g., NEW – The New Stage"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="new-url">Affiliate URL</Label>
                <Input
                  id="new-url"
                  value={newLink.link_url}
                  onChange={(e) => setNewLink(prev => ({ ...prev, link_url: e.target.value }))}
                  placeholder="https://..."
                  type="url"
                  className="mt-1"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
              <Button onClick={addLink} disabled={isAdding}>
                {isAdding ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Add Link
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {links.map((link) => (
        <div key={link.id} className="quiz-card space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-heading text-lg">{link.stage_code}</h3>
            <div className="flex gap-2">
              <Button 
                size="sm" 
                onClick={() => saveLink(link)}
                disabled={savingId === link.id}
              >
                {savingId === link.id ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="destructive" disabled={deletingId === link.id}>
                    {deletingId === link.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Link?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete the {link.stage_code} link. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => deleteLink(link)}>Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
          
          <div>
            <Label htmlFor={`name-${link.id}`}>Display Name</Label>
            <Input
              id={`name-${link.id}`}
              value={link.stage_name}
              onChange={(e) => handleChange(link.id, 'stage_name', e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor={`url-${link.id}`}>Affiliate URL</Label>
            <Input
              id={`url-${link.id}`}
              value={link.link_url}
              onChange={(e) => handleChange(link.id, 'link_url', e.target.value)}
              className="mt-1"
              type="url"
            />
          </div>
        </div>
      ))}

      {links.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No links yet. Click "Add Link" to create one.
        </div>
      )}
    </div>
  );
}
