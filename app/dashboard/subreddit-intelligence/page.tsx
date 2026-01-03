'use client';

import { useState, useEffect } from 'react';
import { BarChart3, RefreshCw, Info, Sparkles, Shield, MessageSquare, TrendingUp, Plus } from 'lucide-react';
import { usePersonaStore } from '@/lib/store/persona-store';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Button, Card, Badge, Grid } from '@/components/ui';
import { filterGenericSubreddits } from '@/lib/utils/filter-generic';

interface SubredditIntel {
  id: string;
  name: string;
  members: number;
  age: number;
  description: string;
  health: {
    overall: number;
    activity: number;
    engagement: number;
    commercial: number;
    moderation: number;
  };
}

export default function SubredditIntelligencePage() {
  const { persona } = usePersonaStore();
  const [subreddits, setSubreddits] = useState<SubredditIntel[]>([]);
  const [selectedSubreddit, setSelectedSubreddit] = useState<SubredditIntel | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadSubreddits();
  }, []);

  const loadSubreddits = async () => {
    if (!persona?.id) return;

    const supabase = createClient();
    const { data: subredditsData } = await supabase
      .from('subreddits')
      .select('*')
      .eq('persona_id', persona.id)
      .eq('is_active', true)
      .order('relevance_score', { ascending: false, nullsFirst: false });

    if (!subredditsData) {
      setSubreddits([]);
      return;
    }

    // Filter out generic subreddits (same as Define Market)
    const filteredSubreddits = filterGenericSubreddits(subredditsData);

    // Mock intelligence data for now (using actual subreddit data from Define Market)
    const mockIntel: SubredditIntel[] = filteredSubreddits.map((sub) => ({
      id: sub.id,
      name: sub.subreddit_name,
      members: Math.floor(Math.random() * 5000000) + 10000,
      age: Math.floor(Math.random() * 20) + 1,
      description: `Community for ${sub.subreddit_name} discussions`,
      health: {
        overall: Math.floor(Math.random() * 100),
        activity: Math.floor(Math.random() * 100),
        engagement: Math.floor(Math.random() * 100),
        commercial: Math.floor(Math.random() * 100),
        moderation: Math.floor(Math.random() * 100),
      },
    }));

    setSubreddits(mockIntel);
    if (mockIntel.length > 0 && !selectedSubreddit) {
      setSelectedSubreddit(mockIntel[0]);
    }
  };

  const refreshSubreddit = async (id: string) => {
    setRefreshing(true);
    // TODO: Implement refresh API
    await new Promise(resolve => setTimeout(resolve, 1000));
    toast.success('Subreddit data refreshed!');
    setRefreshing(false);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-ms-success';
    if (score >= 40) return 'text-ms-warning';
    return 'text-ms-error';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 70) return 'bg-ms-success';
    if (score >= 40) return 'bg-ms-warning';
    return 'bg-ms-error';
  };

  const CircularGauge = ({ score, label, icon: Icon }: { score: number; label: string; icon: any }) => {
    const circumference = 2 * Math.PI * 45;
    const offset = circumference - (score / 100) * circumference;
    const colorClass = getScoreColor(score);
    
    return (
      <div className="flex flex-col items-center">
        <div className="relative w-24 h-24">
          <svg className="transform -rotate-90 w-24 h-24">
            <circle
              cx="48"
              cy="48"
              r="45"
              stroke="currentColor"
              strokeWidth="6"
              fill="none"
              className="text-ms-border"
            />
            <circle
              cx="48"
              cy="48"
              r="45"
              stroke="currentColor"
              strokeWidth="6"
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              className={`${colorClass} transition-all duration-300`}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-lg font-semibold ${colorClass}`}>{score}</span>
          </div>
        </div>
        <div className="flex items-center gap-1 mt-2">
          {Icon && <Icon className="w-3 h-3 text-ms-neutralSecondary" />}
          <span className="text-xs text-ms-neutralSecondary">{label}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Subreddit Intelligence</h1>
          <p className="text-gray-600 mt-1">Analyze community health, rules, and engagement patterns</p>
        </div>
        <div className="flex gap-2">
          <Button variant="primary">
            <Plus className="w-4 h-4 mr-2" />
            Add Subreddit
          </Button>
          <Button variant="secondary" onClick={() => loadSubreddits()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh All
          </Button>
        </div>
      </div>

        <Grid cols={3} gap="lg">
          {/* Left: Monitored Subreddits */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-ms-neutral">Monitored Subreddits</h2>
              <Badge variant="default" className="bg-ms-error text-white">
                {subreddits.length} active / {subreddits.length} total
              </Badge>
            </div>

            <div className="space-y-2 max-h-[600px] overflow-y-auto fluent-scroll">
              {subreddits.length === 0 ? (
                <p className="text-ms-neutralSecondary text-center py-8">No subreddits monitored</p>
              ) : (
                subreddits.map((sub) => (
                  <div
                    key={sub.id}
                    onClick={() => setSelectedSubreddit(sub)}
                    className={`p-3 rounded-ms border cursor-pointer transition-colors ${
                      selectedSubreddit?.id === sub.id
                        ? 'border-ms-primary bg-ms-backgroundHover border-l-4 border-l-ms-primary'
                        : 'border-ms-border hover:border-ms-borderHover hover:bg-ms-backgroundHover'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-semibold text-ms-neutral">r/{sub.name}</div>
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            refreshSubreddit(sub.id);
                          }}
                          variant="ghost"
                          size="sm"
                          disabled={refreshing}
                          className="h-6 w-6 p-0"
                        >
                          <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
                        </Button>
                        <div className="h-2 w-2 rounded-full bg-ms-success"></div>
                      </div>
                    </div>
                    <div className="text-sm text-ms-neutralSecondary">
                      {formatNumber(sub.members)} members
                    </div>
                    <div className="text-xs text-ms-neutralTertiary mt-1">
                      Score: {sub.health.overall}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Right: Subreddit Details */}
          {selectedSubreddit && (
            <div className="lg:col-span-2 space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-ms-neutral">r/{selectedSubreddit.name}</h2>
                <Button
                  onClick={() => refreshSubreddit(selectedSubreddit.id)}
                  variant="secondary"
                  disabled={refreshing}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>

              {/* Community Information */}
              <Card>
                <div className="flex items-center gap-2 mb-4">
                  <Info className="w-5 h-5 text-ms-primary" />
                  <h3 className="text-lg font-semibold text-ms-neutral">Community Information</h3>
                </div>
                <p className="text-ms-neutralSecondary mb-4">{selectedSubreddit.description}</p>
                <Grid cols={2} gap="lg">
                  <div className="bg-ms-error text-white p-4 rounded-ms">
                    <div className="text-sm opacity-90">Community Size</div>
                    <div className="text-2xl font-semibold">{formatNumber(selectedSubreddit.members)}</div>
                  </div>
                  <div className="bg-ms-success text-white p-4 rounded-ms">
                    <div className="text-sm opacity-90">Community Age</div>
                    <div className="text-2xl font-semibold">{selectedSubreddit.age} years</div>
                  </div>
                </Grid>
              </Card>

              {/* Health Analysis */}
              <Card>
                <div className="flex items-center gap-2 mb-6">
                  <Sparkles className="w-5 h-5 text-ms-primary" />
                  <h3 className="text-lg font-semibold text-ms-neutral">Health Analysis</h3>
                </div>
                <Grid cols={3} gap="lg">
                  <CircularGauge
                    score={selectedSubreddit.health.overall}
                    label="Overall"
                    icon={TrendingUp}
                  />
                  <CircularGauge
                    score={selectedSubreddit.health.activity}
                    label="Activity"
                    icon={TrendingUp}
                  />
                  <CircularGauge
                    score={selectedSubreddit.health.engagement}
                    label="Engagement"
                    icon={MessageSquare}
                  />
                </Grid>
              </Card>
            </div>
          )}
        </Grid>
    </div>
  );
}

