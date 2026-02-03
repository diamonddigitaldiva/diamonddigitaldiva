import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Save, Loader2 } from 'lucide-react';

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

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading links...</div>;
  }

  return (
    <div className="space-y-4">
      {links.map((link) => (
        <div key={link.id} className="quiz-card space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-heading text-lg">{link.stage_code}</h3>
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
    </div>
  );
}
