'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Play, Pause, Globe, Hash, Settings } from 'lucide-react';
import { usePersonaStore } from '@/lib/store/persona-store';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Button, PageContainer, PageHeader, Card, Grid } from '@/components/ui';

export default function CommandCenterPage() {
  const router = useRouter();
  const { persona } = usePersonaStore();
  const [huntMode, setHuntMode] = useState<'global' | 'subreddit'>('global');
  const [isRunning, setIsRunning] = useState(false);
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [stats, setStats] = useState({
    leadsFound: 0,
    repliesPosted: 0,
    totalUpvotes: 0,
  });

  useEffect(() => {
    loadCampaign();
    loadStats();
  }, []);

  const loadCampaign = async () => {
    if (!persona?.id) return;

    const supabase = createClient();
    const { data } = await supabase
      .from('campaigns')
      .select('*')
      .eq('persona_id', persona.id)
      .eq('is_active', true)
      .single();

    if (data) {
      setCampaignId(data.id);
      setIsRunning(data.is_active);
      setHuntMode(data.hunt_mode as 'global' | 'subreddit');
    }
  };

  const loadStats = async () => {
    if (!persona?.id) return;

    const supabase = createClient();
    const { data: leads } = await supabase
      .from('lead_store')
      .select('reply_upvotes')
      .eq('persona_id', persona.id);

    if (leads) {
      setStats({
        leadsFound: leads.length,
        repliesPosted: leads.filter((l) => l.reply_upvotes !== null).length,
        totalUpvotes: leads.reduce((sum, l) => sum + (l.reply_upvotes || 0), 0),
      });
    }
  };

  const startHunt = async () => {
    if (!persona?.id) {
      toast.error('Please complete persona setup first');
      return;
    }

    setIsRunning(true);
    try {
      const supabase = createClient();
      
      let campaign;
      if (campaignId) {
        const { data, error } = await supabase
          .from('campaigns')
          .update({
            is_active: true,
            hunt_mode: huntMode,
            updated_at: new Date().toISOString(),
          })
          .eq('id', campaignId)
          .select()
          .single();

        if (error) throw error;
        campaign = data;
      } else {
        const { data, error } = await supabase
          .from('campaigns')
          .insert({
            persona_id: persona.id,
            hunt_mode: huntMode,
            is_active: true,
            daily_post_cap: 2,
            current_daily_count: 0,
          })
          .select()
          .single();

        if (error) throw error;
        campaign = data;
        setCampaignId(campaign.id);
      }

      const response = await fetch('/api/start-hunt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId: campaign.id,
          personaId: persona.id,
          huntMode,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to start hunt');
      }

      toast.success('Hunt started!');
      router.push('/dashboard');
    } catch (error: any) {
      toast.error(error.message || 'Failed to start hunt');
      setIsRunning(false);
    }
  };

  const stopHunt = async () => {
    if (!campaignId) return;

    setIsRunning(false);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('campaigns')
        .update({ is_active: false })
        .eq('id', campaignId);

      if (error) throw error;
      toast.success('Hunt stopped');
    } catch (error: any) {
      toast.error(error.message || 'Failed to stop hunt');
      setIsRunning(true);
    }
  };

  return (
    <div className="p-6">
      <PageContainer maxWidth="lg">
        <PageHeader
          title="Command Center"
          description="Launch and manage your Reddit hunt"
          icon={Settings}
        />

        {/* Stats Cards */}
        <Grid cols={3} gap="lg" className="mb-6">
          <Card>
            <div className="text-3xl font-bold text-blue-600">{stats.leadsFound}</div>
            <div className="text-gray-600 mt-2">Leads Found</div>
          </Card>

          <Card>
            <div className="text-3xl font-bold text-green-600">{stats.repliesPosted}</div>
            <div className="text-gray-600 mt-2">Replies Posted</div>
          </Card>

          <Card>
            <div className="text-3xl font-bold text-yellow-600">{stats.totalUpvotes}</div>
            <div className="text-gray-600 mt-2">Total Upvotes</div>
          </Card>
        </Grid>

        {/* Hunt Mode Selection */}
        <Card className="mb-6">
          <h2 className="text-2xl font-semibold mb-4 text-gray-900">Hunt Mode</h2>
          
          <Grid cols={2} gap="lg">
            <Button
              onClick={() => setHuntMode('global')}
              disabled={isRunning}
              variant="ghost"
              className={`p-6 h-auto rounded-lg border-2 transition-all text-left justify-start ${
                huntMode === 'global'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 bg-gray-50 hover:border-gray-400'
              } disabled:opacity-50`}
            >
              <div className="w-full">
                <Globe className="w-8 h-8 mb-2 text-blue-600" />
                <div className="font-semibold text-lg text-gray-900">Global Search</div>
                <div className="text-sm text-gray-600 mt-2">
                  Search across all of Reddit using your keyword library
                </div>
              </div>
            </Button>

            <Button
              onClick={() => setHuntMode('subreddit')}
              disabled={isRunning}
              variant="ghost"
              className={`p-6 h-auto rounded-lg border-2 transition-all text-left justify-start ${
                huntMode === 'subreddit'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 bg-gray-50 hover:border-gray-400'
              } disabled:opacity-50`}
            >
              <div className="w-full">
                <Hash className="w-8 h-8 mb-2 text-blue-600" />
                <div className="font-semibold text-lg text-gray-900">Subreddit Crawl</div>
                <div className="text-sm text-gray-600 mt-2">
                  Deep-dive into your target subreddits
                </div>
              </div>
            </Button>
          </Grid>
        </Card>

        {/* Control Panel */}
        <Card>
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-semibold mb-2 text-gray-900">Hunt Status</h2>
              <p className="text-gray-600">
                {isRunning
                  ? 'Hunt is currently running'
                  : 'Hunt is stopped'}
              </p>
            </div>

            <div className="flex gap-4">
              {isRunning ? (
                <Button
                  onClick={stopHunt}
                  variant="danger"
                  size="lg"
                >
                  <Pause className="w-5 h-5" />
                  Stop Hunt
                </Button>
              ) : (
                <Button
                  onClick={startHunt}
                  variant="success"
                  size="lg"
                >
                  <Play className="w-5 h-5" />
                  Start Hunt
                </Button>
              )}
            </div>
          </div>
        </Card>
      </PageContainer>
    </div>
  );
}

