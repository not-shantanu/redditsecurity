'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Plus, Sparkles, Rocket, Trash2, Circle, Target } from 'lucide-react';
import { usePersonaStore } from '@/lib/store/persona-store';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Button, Input, Select, Card, Badge, Grid } from '@/components/ui';
import { filterGenericKeywords, filterGenericSubreddits, isGenericKeyword, isGenericSubreddit } from '@/lib/utils/filter-generic';

interface Keyword {
  id?: string;
  keyword: string;
  intent: string;
  seed_weight: number;
  priority?: number;
  category?: string;
}

interface Subreddit {
  id?: string;
  subreddit_name: string;
  crawl_mode: string;
  is_active: boolean;
  relevance_score?: number;
}

export default function DefineMarketPage() {
  const router = useRouter();
  const { persona } = usePersonaStore();
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [subreddits, setSubreddits] = useState<Subreddit[]>([]);
  const [newSubreddit, setNewSubreddit] = useState('');
  const [newKeyword, setNewKeyword] = useState('');
  const [generatingKeywords, setGeneratingKeywords] = useState(false);
  const [discoveringSubreddits, setDiscoveringSubreddits] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return;

    // Try to load persona from database if not in store
    if (!persona?.id) {
      const { data: personas } = await supabase
        .from('personas')
        .select('*')
        .eq('user_id', user.id)
        .limit(1)
        .single();

      if (personas) {
        usePersonaStore.getState().setPersona({
          id: personas.id,
          name: personas.name,
          archetype: personas.archetype,
          brandMission: personas.brand_mission || '',
          productName: personas.product_name || '',
          problemDescription: personas.problem_description || '',
          painPoints: personas.pain_points || [],
          toneProfessionalism: personas.tone_professionalism,
          toneConciseness: personas.tone_conciseness,
          toneEmpathy: personas.tone_empathy,
          authenticityMarkers: personas.authenticity_markers || {
            useLowercaseI: true,
            useContractions: true,
            varySentenceLength: true,
            avoidCorporateSpeak: true,
          },
        });
      } else {
        return; // No persona, but don't redirect - just show empty state
      }
    }

    const currentPersona = usePersonaStore.getState().persona;
    if (!currentPersona?.id) return;
    
    const { data: keywordsData } = await supabase
      .from('keywords')
      .select('*')
      .eq('persona_id', currentPersona.id)
      .order('seed_weight', { ascending: false });

    const { data: subredditsData } = await supabase
      .from('subreddits')
      .select('*')
      .eq('persona_id', currentPersona.id)
      .order('relevance_score', { ascending: false, nullsFirst: false });

    // Filter out generic keywords and subreddits before displaying
    if (keywordsData) {
      const filtered = filterGenericKeywords(keywordsData);
      setKeywords(filtered);
    }
    if (subredditsData) {
      const filtered = filterGenericSubreddits(subredditsData);
      setSubreddits(filtered);
    }
  };

  const generateKeywords = async () => {
    const currentPersona = usePersonaStore.getState().persona;
    if (!currentPersona?.id) {
      toast.error('Please complete brand setup first');
      return;
    }

    setGeneratingKeywords(true);
    try {
      const response = await fetch('/api/generate-keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personaId: currentPersona.id,
          description: currentPersona.brandMission,
          audience: currentPersona.problemDescription,
        }),
      });

      if (!response.ok) throw new Error('Failed to generate keywords');

      const data = await response.json();
      await loadData(); // Reload to get all keywords
      toast.success(`Generated ${data.keywords.length} keywords!`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate keywords');
    } finally {
      setGeneratingKeywords(false);
    }
  };

  const discoverSubreddits = async () => {
    const currentPersona = usePersonaStore.getState().persona;
    if (!currentPersona?.id) {
      toast.error('Please complete brand setup first');
      return;
    }

    if (keywords.length === 0) {
      toast.error('Please add keywords first or generate them from brand setup');
      return;
    }

    setDiscoveringSubreddits(true);
    try {
      const keywordList = keywords.map(k => k.keyword);
      const response = await fetch('/api/discover-subreddits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personaId: currentPersona.id,
          keywords: keywordList,
          brandDescription: currentPersona.brandMission,
          targetAudience: currentPersona.problemDescription,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to discover subreddits');
      }

      const data = await response.json();
      await loadData(); // Reload to get all subreddits
      toast.success(`Discovered ${data.subreddits.length} subreddits! ${data.saved} new ones saved.`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to discover subreddits');
    } finally {
      setDiscoveringSubreddits(false);
    }
  };

  const addSubreddit = async () => {
    if (!newSubreddit.trim()) return;
    
    const subredditName = newSubreddit.trim().replace('r/', '').replace(/^\/+|\/+$/g, '');
    
    // Check if subreddit is generic
    if (isGenericSubreddit(subredditName)) {
      toast.error('This subreddit is too generic. Please use more specific, relevant subreddits.');
      return;
    }
    
    const currentPersona = usePersonaStore.getState().persona;
    if (!currentPersona?.id) {
      toast.error('Please complete brand setup first');
      return;
    }

    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('subreddits')
      .insert({
        persona_id: currentPersona.id,
        subreddit_name: subredditName,
        crawl_mode: 'new',
        is_active: true,
        relevance_score: 0.5, // Default relevance for manually added
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

  const addKeyword = async () => {
    if (!newKeyword.trim()) return;
    
    // Check if keyword is generic
    if (isGenericKeyword(newKeyword)) {
      toast.error('This keyword is too generic. Please use more specific, relevant keywords.');
      return;
    }
    
    const currentPersona = usePersonaStore.getState().persona;
    if (!currentPersona?.id) {
      toast.error('Please complete brand setup first');
      return;
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from('keywords')
      .insert({
        persona_id: currentPersona.id,
        keyword: newKeyword.trim(),
        intent: 'General',
        seed_weight: 0.5,
      })
      .select()
      .single();

    if (error) {
      toast.error(error.message);
      return;
    }

    setKeywords([...keywords, data]);
    setNewKeyword('');
    toast.success('Keyword added!');
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

  const deleteKeyword = async (id: string) => {
    const supabase = createClient();
    const { error } = await supabase.from('keywords').delete().eq('id', id);

    if (error) {
      toast.error(error.message);
      return;
    }

    setKeywords(keywords.filter((k) => k.id !== id));
    toast.success('Keyword removed');
  };

  // Calculate summary stats
  const totalSubreddits = subreddits.length;
  const totalKeywords = keywords.length;
  const highPrioritySubreddits = subreddits.filter(
    s => (s.relevance_score || 0) >= 0.7
  ).length;

  const getRelevanceColor = (score?: number) => {
    if (!score) return 'text-ms-neutralTertiary';
    if (score >= 0.8) return 'text-ms-primary';
    if (score >= 0.6) return 'text-ms-neutralSecondary';
    return 'text-ms-neutralTertiary';
  };

  const getRelevanceBgColor = (score?: number) => {
    if (!score) return 'bg-ms-neutralTertiary';
    if (score >= 0.8) return 'bg-ms-primary';
    if (score >= 0.6) return 'bg-ms-neutralSecondary';
    return 'bg-ms-neutralTertiary';
  };

  const getRelevanceBadge = (score?: number) => {
    if (!score) return { text: 'N/A', color: 'bg-ms-backgroundHover text-ms-neutralSecondary' };
    if (score >= 0.8) return { text: 'High', color: 'bg-ms-backgroundHover text-ms-primary' };
    if (score >= 0.6) return { text: 'Medium', color: 'bg-ms-backgroundHover text-ms-neutralSecondary' };
    return { text: 'Low', color: 'bg-ms-backgroundHover text-ms-neutralTertiary' };
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Define Market</h1>
        <p className="text-gray-600 mt-1">Configure your target keywords and discover relevant subreddits</p>
      </div>

        {/* Summary Cards */}
        <Grid cols={3} gap="lg" className="mb-6">
          <Card>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-ms-backgroundHover rounded-ms">
                <Target className="w-6 h-6 text-ms-primary" />
              </div>
              <div>
                <div className="text-2xl font-semibold text-ms-neutral">{totalSubreddits}</div>
                <div className="text-sm text-ms-neutralSecondary">Subreddits</div>
              </div>
            </div>
          </Card>
          <Card>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-ms-backgroundHover rounded-ms">
                <Search className="w-6 h-6 text-ms-primary" />
              </div>
              <div>
                <div className="text-2xl font-semibold text-ms-neutral">{totalKeywords}</div>
                <div className="text-sm text-ms-neutralSecondary">Keywords</div>
              </div>
            </div>
          </Card>
          <Card>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-ms-backgroundHover rounded-ms">
                <Rocket className="w-6 h-6 text-ms-primary" />
              </div>
              <div>
                <div className="text-2xl font-semibold text-ms-neutral">{highPrioritySubreddits}</div>
                <div className="text-sm text-ms-neutralSecondary">High Priority Subreddits</div>
              </div>
            </div>
          </Card>
        </Grid>

        <Grid cols={2} gap="lg">
          {/* Keywords Section */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-semibold text-ms-neutral">Keywords</h2>
                <Badge variant="default" className="bg-ms-backgroundHover text-ms-neutral">
                  {totalKeywords}
                </Badge>
              </div>
            </div>

            <Button
              onClick={generateKeywords}
              disabled={generatingKeywords}
              variant="primary"
              className="w-full mb-4"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {generatingKeywords ? 'Generating...' : 'AI Generate from Brand Setup'}
            </Button>

            <div className="flex gap-2 mb-4">
              <Input
                type="text"
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addKeyword()}
                placeholder="e.g., social media management"
                className="flex-1"
              />
              <Button
                onClick={addKeyword}
                variant="primary"
                size="md"
              >
                <Plus className="w-5 h-5" />
              </Button>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {keywords.length === 0 ? (
                <p className="text-ms-neutralSecondary text-center py-8">
                  Add keywords manually or generate them from brand setup
                </p>
              ) : (
                keywords.map((kw) => (
                  <div
                    key={kw.id}
                    className="bg-ms-backgroundHover p-3 rounded-ms flex items-center gap-3 border border-ms-border"
                  >
                    <Circle className="h-3 w-3 text-ms-primary fill-ms-primary" />
                    <div className="flex-1">
                      <div className="font-medium text-ms-neutral">{kw.keyword}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="default" className="text-xs bg-ms-backgroundHover text-ms-neutralSecondary">
                          {kw.intent.toLowerCase()}
                        </Badge>
                        <div className="w-24 h-1.5 bg-ms-border rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-ms-primary" 
                            style={{ width: `${(kw.seed_weight || 0.5) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                    <Button
                      onClick={() => deleteKeyword(kw.id!)}
                      variant="ghost"
                      size="sm"
                      className="text-ms-neutralSecondary hover:text-ms-neutral"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Subreddits Section */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-semibold text-ms-neutral">Subreddits</h2>
                <Badge variant="default" className="bg-ms-backgroundHover text-ms-neutral">
                  {totalSubreddits}
                </Badge>
              </div>
            </div>

            <Button
              onClick={discoverSubreddits}
              disabled={discoveringSubreddits || keywords.length === 0}
              variant="primary"
              className="w-full mb-4"
            >
              <Rocket className="w-4 h-4 mr-2" />
              {discoveringSubreddits ? 'Discovering...' : 'AI Discover by Keywords'}
            </Button>

            <div className="flex gap-2 mb-4">
              <Input
                type="text"
                value={newSubreddit}
                onChange={(e) => setNewSubreddit(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addSubreddit()}
                placeholder="e.g., marketing or r/marketing"
                className="flex-1"
              />
              <Button
                onClick={addSubreddit}
                variant="primary"
                size="md"
              >
                <Plus className="w-5 h-5" />
              </Button>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {subreddits.length === 0 ? (
                <p className="text-ms-neutralSecondary text-center py-8">
                  Discover subreddits using AI or add them manually
                </p>
              ) : (
                subreddits.map((sub) => {
                  const relevanceBadge = getRelevanceBadge(sub.relevance_score);
                  return (
                    <div
                      key={sub.id}
                      className="bg-ms-backgroundHover p-3 rounded-ms flex items-center gap-3 border border-ms-border"
                    >
                      <Circle className={`h-3 w-3 ${sub.is_active ? 'text-ms-primary fill-ms-primary' : 'text-ms-neutralTertiary'}`} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <div className="font-medium text-ms-neutral">r/{sub.subreddit_name}</div>
                          {sub.relevance_score !== undefined && (
                            <Badge variant="default" className={`text-xs ${relevanceBadge.color}`}>
                              {relevanceBadge.text}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          {sub.relevance_score !== undefined && (
                            <>
                              <span className="text-xs text-ms-neutralTertiary">Relevance:</span>
                              <div className="w-24 h-1.5 bg-ms-border rounded-full overflow-hidden">
                                <div 
                                  className={`h-full ${getRelevanceBgColor(sub.relevance_score)}`}
                                  style={{ width: `${sub.relevance_score * 100}%` }}
                                ></div>
                              </div>
                              <span className={`text-xs font-medium ${getRelevanceColor(sub.relevance_score)}`}>
                                {(sub.relevance_score * 100).toFixed(0)}%
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <Button
                        onClick={() => deleteSubreddit(sub.id!)}
                        variant="ghost"
                        size="sm"
                        className="text-ms-neutralSecondary hover:text-ms-neutral"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </Grid>
    </div>
  );
}
