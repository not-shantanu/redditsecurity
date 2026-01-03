'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ExternalLink, Copy, ChevronDown, ChevronUp, Search, Filter, AlertTriangle, Sparkles } from 'lucide-react';
import { usePersonaStore } from '@/lib/store/persona-store';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Button, Card, Badge, Input, Select, Grid } from '@/components/ui';

interface Lead {
  id: string;
  post_id: string;
  post_title: string;
  post_body: string;
  post_url: string;
  subreddit: string;
  chilly_score: number;
  reasoning: string;
  intent_detected: string;
  generation_state: string;
  generated_reply: string;
  reply_upvotes: number;
  reply_comments: number;
  author?: string;
  author_karma?: number;
  upvotes?: number;
  comments?: number;
  created_at: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const { persona } = usePersonaStore();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [expandedLead, setExpandedLead] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterScore, setFilterScore] = useState('overall');
  const [highValueOnly, setHighValueOnly] = useState(false);

  useEffect(() => {
    loadLeads();
  }, []);

  const loadLeads = async () => {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      setLoading(false);
      return;
    }

    // Load persona if not in store
    let currentPersona = persona;
    if (!currentPersona?.id) {
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
        currentPersona = usePersonaStore.getState().persona;
      }
    }

    if (!currentPersona?.id) {
      setLoading(false);
      return;
    }
    
    const { data, error } = await supabase
      .from('lead_store')
      .select('*')
      .eq('persona_id', currentPersona.id)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      toast.error(error.message);
    } else if (data) {
      // Add mock data for missing fields
      const enrichedLeads = data.map(lead => ({
        ...lead,
        author: `user${Math.floor(Math.random() * 1000)}`,
        author_karma: Math.floor(Math.random() * 5000),
        upvotes: Math.floor(Math.random() * 100),
        comments: Math.floor(Math.random() * 50),
      }));
      setLeads(enrichedLeads);
    }

    setLoading(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const calculateScores = (lead: Lead) => {
    // Mock scores based on chilly_score
    const base = lead.chilly_score;
    return {
      relevance: Math.min(100, base * 100 + Math.random() * 20),
      urgency: Math.min(100, base * 80 + Math.random() * 30),
      competition: Math.min(100, (1 - base) * 100 + Math.random() * 20),
      authority: Math.min(100, base * 90 + Math.random() * 15),
    };
  };

  const filteredLeads = leads.filter(lead => {
    // Search filter - check both title and body
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesTitle = lead.post_title.toLowerCase().includes(query);
      const matchesBody = lead.post_body?.toLowerCase().includes(query) || false;
      if (!matchesTitle && !matchesBody) {
        return false;
      }
    }
    
    // High value filter
    if (highValueOnly && lead.chilly_score < 0.7) {
      return false;
    }
    
    // Filter by type (intent)
    if (filterType !== 'all') {
      const intent = lead.intent_detected?.toLowerCase() || '';
      if (filterType === 'high-intent' && !intent.includes('direct') && !intent.includes('ask')) {
        return false;
      }
      if (filterType === 'problem' && !intent.includes('problem')) {
        return false;
      }
      if (filterType === 'industry' && !intent.includes('industry') && !intent.includes('discussion')) {
        return false;
      }
    }
    
    // Filter by score type (this affects sorting, not filtering)
    // The actual filtering is done above
    
    return true;
  }).sort((a, b) => {
    // Sort by selected score type
    if (filterScore === 'relevance') {
      const scoresA = calculateScores(a);
      const scoresB = calculateScores(b);
      return scoresB.relevance - scoresA.relevance;
    }
    if (filterScore === 'urgency') {
      const scoresA = calculateScores(a);
      const scoresB = calculateScores(b);
      return scoresB.urgency - scoresA.urgency;
    }
    if (filterScore === 'competition') {
      const scoresA = calculateScores(a);
      const scoresB = calculateScores(b);
      return scoresB.competition - scoresA.competition;
    }
    // Default: sort by chilly_score (overall)
    return b.chilly_score - a.chilly_score;
  });

  const stats = {
    total: leads.length,
    highValue: leads.filter(l => l.chilly_score >= 0.7).length,
    withResponses: leads.filter(l => l.generated_reply).length,
    subreddits: new Set(leads.map(l => l.subreddit)).size,
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`;
  };

  // Microsoft Fluent Design System Page Layout
  // Reference: https://fluent2.microsoft.design/layout
  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Summary Cards */}
        <Grid cols={4} gap="lg" className="mb-6">
          <Card>
            <div className="text-2xl font-semibold text-ms-neutral">{stats.total}</div>
            <div className="text-sm text-ms-neutralSecondary mt-1">Total Opportunities</div>
          </Card>
          <Card>
            <div className="text-2xl font-semibold text-ms-neutral">{stats.highValue}</div>
            <div className="text-sm text-ms-neutralSecondary mt-1">High Value</div>
          </Card>
          <Card>
            <div className="text-2xl font-semibold text-ms-neutral">{stats.withResponses}</div>
            <div className="text-sm text-ms-neutralSecondary mt-1">With Responses</div>
          </Card>
          <Card>
            <div className="text-2xl font-semibold text-ms-neutral">{stats.subreddits}</div>
            <div className="text-sm text-ms-neutralSecondary mt-1">Subreddits</div>
          </Card>
        </Grid>

        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-3 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search opportunities..."
              className="pl-10"
            />
          </div>
          <Select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="text-sm"
          >
            <option value="all">All Types</option>
            <option value="high-intent">High Intent</option>
            <option value="problem">Problem Intent</option>
            <option value="industry">Industry Intent</option>
          </Select>
          <Select
            value={filterScore}
            onChange={(e) => setFilterScore(e.target.value)}
            className="text-sm"
          >
            <option value="overall">Overall Score</option>
            <option value="relevance">Relevance</option>
            <option value="urgency">Urgency</option>
            <option value="competition">Competition</option>
          </Select>
          <Button
            onClick={() => setHighValueOnly(!highValueOnly)}
            variant={highValueOnly ? 'primary' : 'secondary'}
            className={highValueOnly ? 'bg-red-600 hover:bg-red-700 text-white' : ''}
          >
            <Filter className="w-4 h-4 mr-2" />
            High Value Only
          </Button>
        </div>

        {/* Leads List */}
        <div className="space-y-4">
          {loading && leads.length === 0 ? (
            <Card>
              <div className="p-8 text-center text-gray-600">Loading opportunities...</div>
            </Card>
          ) : filteredLeads.length === 0 ? (
            <Card>
              <div className="p-8 text-center text-gray-600">No opportunities found</div>
            </Card>
          ) : (
            filteredLeads.map((lead) => {
              const scores = calculateScores(lead);
              const isExpanded = expandedLead === lead.id;
              
              return (
                <Card
                  key={lead.id}
                  className={`border-2 transition-colors ${
                    isExpanded ? 'border-red-600' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {/* Post Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-medium text-gray-900">
                          r/{lead.subreddit}
                        </span>
                        <AlertTriangle className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-500">
                          {getTimeAgo(lead.created_at)}
                        </span>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {lead.post_title}
                      </h3>
                      <div className="text-sm text-gray-600 line-clamp-3">
                        {lead.post_body || 'No body content'}
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                        <span>{lead.author} ({lead.author_karma} karma)</span>
                        <span>{lead.upvotes} upvotes</span>
                        <span>{lead.comments} comments</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="w-16 h-16 rounded-full bg-red-600 text-white flex items-center justify-center font-bold text-lg">
                        {Math.round(lead.chilly_score * 100)}
                      </div>
                      <Button
                        onClick={() => setExpandedLead(isExpanded ? null : lead.id)}
                        variant="ghost"
                        size="sm"
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Score Bars */}
                  <div className="grid grid-cols-4 gap-4 mb-4">
                    <div>
                      <div className="flex justify-between text-xs text-gray-600 mb-1">
                        <span>Relevance</span>
                        <span>{Math.round(scores.relevance)}</span>
                      </div>
                      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-red-600"
                          style={{ width: `${scores.relevance}%` }}
                        ></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs text-gray-600 mb-1">
                        <span>Urgency</span>
                        <span>{Math.round(scores.urgency)}</span>
                      </div>
                      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-red-600"
                          style={{ width: `${scores.urgency}%` }}
                        ></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs text-gray-600 mb-1">
                        <span>Competition</span>
                        <span>{Math.round(scores.competition)}</span>
                      </div>
                      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-red-600"
                          style={{ width: `${scores.competition}%` }}
                        ></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs text-gray-600 mb-1">
                        <span>Authority</span>
                        <span>{Math.round(scores.authority)}</span>
                      </div>
                      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-red-600"
                          style={{ width: `${scores.authority}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  {/* AI Generated Response */}
                  {lead.generated_reply && (
                    <div className="border-t border-gray-200 pt-4 mt-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-gray-600" />
                          <h4 className="font-semibold text-gray-900">AI Generated Response</h4>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => setExpandedLead(isExpanded ? null : lead.id)}
                            variant="ghost"
                            size="sm"
                          >
                            {isExpanded ? 'Collapse' : 'Expand'}
                          </Button>
                          <Button
                            onClick={() => copyToClipboard(lead.generated_reply)}
                            variant="ghost"
                            size="sm"
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      {isExpanded ? (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-900 whitespace-pre-wrap">
                          {lead.generated_reply}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-600 line-clamp-2">
                          {lead.generated_reply}
                        </div>
                      )}
                      <div className="flex gap-2 mt-3">
                        <Badge variant="default" className="bg-gray-200 text-gray-700">
                          beginner
                        </Badge>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2 mt-4 pt-4 border-t border-gray-200">
                    <Button
                      onClick={() => window.open(lead.post_url, '_blank')}
                      variant="secondary"
                      className="flex-1"
                    >
                      View on Reddit
                    </Button>
                    <Button
                      variant="success"
                      className="flex-1"
                    >
                      Mark as Viewed
                    </Button>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
