'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Search, Plus, Trash2 } from 'lucide-react';
import { usePersonaStore } from '@/lib/store/persona-store';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Button, Input, Select, Card } from '@/components/ui';

interface Subreddit {
  id?: string;
  subreddit_name: string;
  crawl_mode: string;
  is_active: boolean;
}

export default function SubredditsPage() {
  const router = useRouter();
  const { persona } = usePersonaStore();
  const [subreddits, setSubreddits] = useState<Subreddit[]>([]);
  const [newSubreddit, setNewSubreddit] = useState('');
  const [newCrawlMode, setNewCrawlMode] = useState('new');

  useEffect(() => {
    loadSubreddits();
  }, []);

  const loadSubreddits = async () => {
    if (!persona?.id) return;

    const supabase = createClient();
    const { data: subredditsData } = await supabase
      .from('subreddits')
      .select('*')
      .eq('persona_id', persona.id);

    if (subredditsData) setSubreddits(subredditsData);
  };

  const addSubreddit = async () => {
    if (!newSubreddit.trim() || !persona?.id) return;

    const supabase = createClient();
    const { data, error } = await supabase
      .from('subreddits')
      .insert({
        persona_id: persona.id,
        subreddit_name: newSubreddit.trim(),
        crawl_mode: newCrawlMode,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      toast.error(error.message);
      return;
    }

    setSubreddits([...subreddits, data]);
    setNewSubreddit('');
    toast.success('Subreddit added!');
  };

  const deleteSubreddit = async (id: string) => {
    const supabase = createClient();
    const { error } = await supabase.from('subreddits').delete().eq('id', id);

    if (error) {
      toast.error(error.message);
      return;
    }

    setSubreddits(subreddits.filter((s) => s.id !== id));
    toast.success('Subreddit removed');
  };

  const toggleSubreddit = async (id: string, isActive: boolean) => {
    const supabase = createClient();
    const { error } = await supabase
      .from('subreddits')
      .update({ is_active: !isActive })
      .eq('id', id);

    if (error) {
      toast.error(error.message);
      return;
    }

    setSubreddits(
      subreddits.map((s) => (s.id === id ? { ...s, is_active: !isActive } : s))
    );
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Subreddit Finding</h1>
        <p className="text-gray-600 mt-1">Manage your target subreddits</p>
      </div>

        <Card>
          <h2 className="text-2xl font-semibold mb-4 text-gray-900">Subreddits</h2>

          <div className="flex gap-2 mb-4">
            <Input
              type="text"
              value={newSubreddit}
              onChange={(e) => setNewSubreddit(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addSubreddit()}
              placeholder="r/subreddit"
              className="flex-1"
            />
            <Select
              value={newCrawlMode}
              onChange={(e) => setNewCrawlMode(e.target.value)}
              className="w-auto"
            >
              <option value="new">New</option>
              <option value="rising">Rising</option>
              <option value="hot">Hot</option>
            </Select>
            <Button
              onClick={addSubreddit}
              variant="success"
            >
              <Plus className="w-5 h-5" />
            </Button>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {subreddits.length === 0 ? (
              <p className="text-gray-600 text-center py-8">
                Add subreddits to monitor
              </p>
            ) : (
              subreddits.map((sub) => (
                <div
                  key={sub.id}
                  className="bg-gray-50 p-3 rounded-lg flex justify-between items-center border border-gray-200"
                >
                  <div className="flex-1">
                    <div className="font-medium">r/{sub.subreddit_name}</div>
                    <div className="text-sm text-gray-600 capitalize">
                      {sub.crawl_mode}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => toggleSubreddit(sub.id!, sub.is_active)}
                      variant={sub.is_active ? 'success' : 'secondary'}
                      size="sm"
                    >
                      {sub.is_active ? 'Active' : 'Inactive'}
                    </Button>
                    <Button
                      onClick={() => deleteSubreddit(sub.id!)}
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
    </div>
  );
}

