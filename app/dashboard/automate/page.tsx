'use client';

import { useState, useEffect } from 'react';
import { Zap, Search, Globe, Hash, Play, Loader2, CheckCircle, XCircle, ExternalLink, Check, X, SkipForward, MoreVertical } from 'lucide-react';
import { usePersonaStore } from '@/lib/store/persona-store';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Button, PageContainer, PageHeader, Card, Select, Input, Badge } from '@/components/ui';
import { filterGenericSubreddits } from '@/lib/utils/filter-generic';

interface PostResult {
  id: string;
  title: string;
  content: string;
  subreddit: string;
  author: string;
  score: number;
  url: string;
  relevanceScore: number;
  generatedResponse?: string;
  responseGenerated: boolean;
  threadState?: 'done' | 'deleted' | 'skip' | null;
  skipExpiresAt?: string | null;
}

export default function AutomatePage() {
  const { persona } = usePersonaStore();
  const [searchMode, setSearchMode] = useState<'subreddit' | 'global'>('subreddit');
  const [numPosts, setNumPosts] = useState(10);
  const [scoreThreshold, setScoreThreshold] = useState(0.7);
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<PostResult[]>([]);
  const [selectedSubreddits, setSelectedSubreddits] = useState<string[]>([]);
  const [availableSubreddits, setAvailableSubreddits] = useState<Array<{ name: string; id: string }>>([]);
  const [showPreviousThreads, setShowPreviousThreads] = useState(false);
  const [previousThreads, setPreviousThreads] = useState<PostResult[]>([]);
  const [isLoadingPrevious, setIsLoadingPrevious] = useState(false);
  const [previousThreadsFilter, setPreviousThreadsFilter] = useState<'all' | 'responded' | 'not_responded' | 'skipped' | 'deleted'>('all');

  useEffect(() => {
    const loadPersonaAndData = async () => {
      // Load persona from database if not in store (same as other pages)
      if (!persona?.id) {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
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
          }
        }
      }
      
      // Now load subreddits and latest run (use the loaded persona)
      const finalPersona = usePersonaStore.getState().persona;
      if (finalPersona?.id) {
        await loadSubreddits();
        await loadLatestRun();
      }
    };

    loadPersonaAndData();
  }, [persona?.id]);

  const loadLatestRun = async () => {
    if (!persona?.id) return;

    try {
      const currentPersona = usePersonaStore.getState().persona;
      if (!currentPersona?.id) return;
      
      const response = await fetch(`/api/automate/runs?personaId=${currentPersona.id}&latest=true`);
      if (!response.ok) {
        // No previous run exists, that's okay
        return;
      }

      const data = await response.json();
      if (data.runs) {
        const run = data.runs;
        // Restore settings
        setSearchMode(run.search_mode);
        setNumPosts(run.num_posts);
        setScoreThreshold(parseFloat(run.score_threshold));
        setSelectedSubreddits(run.selected_subreddits || []);
        
        // Restore results (filter out "done" threads - they should be hidden)
        if (run.results && Array.isArray(run.results)) {
          const filteredResults = run.results.filter((r: PostResult) => r.threadState !== 'done');
          setResults(filteredResults);
        }
      }
    } catch (error) {
      console.error('Error loading latest run:', error);
      // Silently fail - user can start fresh
    }
  };

  const loadSubreddits = async () => {
    const currentPersona = usePersonaStore.getState().persona;
    if (!currentPersona?.id) return;

    const supabase = createClient();
    const { data: subredditsData } = await supabase
      .from('subreddits')
      .select('id, subreddit_name')
      .eq('persona_id', currentPersona.id)
      .order('relevance_score', { ascending: false });

    if (!subredditsData) {
      setAvailableSubreddits([]);
      return;
    }

    // Filter out generic subreddits (same as Define Market)
    const filtered = filterGenericSubreddits(subredditsData);

    if (filtered) {
      setAvailableSubreddits(filtered.map(s => ({ name: s.subreddit_name, id: s.id })));
    }
  };

  const startAutomation = async () => {
    const currentPersona = usePersonaStore.getState().persona;
    if (!currentPersona?.id) {
      toast.error('Please set up your brand first');
      return;
    }

    if (searchMode === 'subreddit' && selectedSubreddits.length === 0) {
      toast.error('Please select at least one subreddit');
      return;
    }

    setIsRunning(true);
    // Don't clear results - keep previous results (except "done" ones which are already filtered)
    // New results will be added to existing ones

    try {
      // Search for posts with AI analysis (relevance scoring happens during search)
      toast.info('Searching for relevant posts using AI...');
      const searchResponse = await fetch('/api/automate/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: searchMode,
          numPosts,
          subreddits: searchMode === 'subreddit' ? selectedSubreddits : null,
          personaId: currentPersona.id,
          minRelevanceScore: scoreThreshold, // Pass threshold to filter during search
        }),
      });

      if (!searchResponse.ok) {
        const errorData = await searchResponse.json();
        throw new Error(errorData.error || 'Failed to search posts');
      }

      const searchData = await searchResponse.json();
      const posts = searchData.posts || [];

      if (posts.length === 0) {
        toast.warning(searchData.error || 'No relevant posts found above the threshold. Try lowering the score threshold.');
        setIsRunning(false);
        return;
      }

      toast.success(`Found ${posts.length} relevant posts (searched ${searchData.searched || 'multiple'} batches)`);

      // Initialize results with posts that already have relevance scores
      // Merge with existing results, but don't add duplicates
      const initialResults: PostResult[] = posts.map((p: PostResult) => ({
        ...p,
        responseGenerated: false,
      }));

      setResults(prev => {
        const existingIds = new Set(prev.map(r => r.id));
        const newResults = initialResults.filter(r => !existingIds.has(r.id));
        // Filter out "done" threads from previous results (they should be hidden)
        const filteredPrev = prev.filter(r => r.threadState !== 'done' && r.threadState !== 'deleted');
        return [...filteredPrev, ...newResults];
      });

      // Generate responses for all posts (they're already above threshold)
      if (posts.length > 0) {
        toast.info(`Generating responses for ${posts.length} posts...`);
        
        // Get persona ID once for the loop
        const personaId = currentPersona.id;
        
        for (const post of posts) {
          try {
            const responseResponse = await fetch('/api/automate/generate-response', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                post: {
                  id: post.id,
                  title: post.title,
                  content: post.content,
                  subreddit: post.subreddit,
                  url: post.url,
                  permalink: post.permalink,
                },
                personaId: personaId,
              }),
            });

            if (responseResponse.ok) {
              const responseData = await responseResponse.json();
              setResults(prev => {
                const updated = prev.map(r => 
                  r.id === post.id 
                    ? { ...r, generatedResponse: responseData.response, responseGenerated: true }
                    : r
                );
                // Save run after each response is generated (incremental save)
                saveRunIncremental(updated);
                return updated;
              });
            }
          } catch (error) {
            console.error('Error generating response for post:', post.id, error);
          }
        }

        toast.success('Automation complete!');
      }
    } catch (error: any) {
      toast.error(error.message || 'Automation failed');
    } finally {
      setIsRunning(false);
    }
  };

  const toggleSubreddit = (subredditId: string) => {
    setSelectedSubreddits(prev => 
      prev.includes(subredditId)
        ? prev.filter(id => id !== subredditId)
        : [...prev, subredditId]
    );
  };

  const saveRunIncremental = async (currentResults: PostResult[]) => {
    const currentPersona = usePersonaStore.getState().persona;
    if (!currentPersona?.id) return;

    try {
      // Don't save "done" or "deleted" threads in the run (they should be hidden)
      const resultsToSave = currentResults.filter(r => 
        r.threadState !== 'done' && r.threadState !== 'deleted'
      );

      await fetch('/api/automate/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personaId: currentPersona.id,
          searchMode: searchMode,
          numPosts: numPosts,
          scoreThreshold: scoreThreshold,
          selectedSubreddits: searchMode === 'subreddit' ? selectedSubreddits : [],
          results: resultsToSave,
        }),
      });
    } catch (error) {
      // Silently fail - not critical
      console.error('Error saving run incrementally:', error);
    }
  };

  const updateThreadState = async (postId: string, state: 'done' | 'deleted' | 'skip') => {
    const currentPersona = usePersonaStore.getState().persona;
    if (!currentPersona?.id) {
      toast.error('Persona not found');
      return;
    }

    try {
      // Try to find post in results first, then in previousThreads
      let post = results.find(r => r.id === postId);
      if (!post) {
        post = previousThreads.find(r => r.id === postId);
      }
      if (!post) return;

      const response = await fetch('/api/automate/update-thread-state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId: postId,
          personaId: currentPersona.id,
          state: state,
          subreddit: post.subreddit,
          postUrl: post.url,
          postTitle: post.title,
          postContent: post.content,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update thread state');
      }

      const data = await response.json();
      
      // Update local state
      // If marked as "done" or "deleted", remove from results (they should disappear)
      // If "skip", keep it but update the state
      if (state === 'done' || state === 'deleted') {
        setResults(prev => {
          const filtered = prev.filter(r => r.id !== postId);
          console.log(`Removed thread ${postId} from results. Remaining: ${filtered.length}`);
          return filtered;
        });
      } else {
        setResults(prev => prev.map(r => 
          r.id === postId
            ? { 
                ...r, 
                threadState: state,
                skipExpiresAt: state === 'skip' ? data.thread?.skip_expires_at : null,
              }
            : r
        ));
      }

      // Also update previous threads if it's in the list
      setPreviousThreads(prev => prev.map(r => 
        r.id === postId
          ? { 
              ...r, 
              threadState: state,
              skipExpiresAt: state === 'skip' ? data.thread?.skip_expires_at : null,
            }
          : r
      ));

      const stateMessages = {
        done: 'Thread marked as done',
        deleted: 'Thread deleted',
        skip: 'Thread skipped (will show again in 14 days)',
      };

      toast.success(stateMessages[state]);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update thread state');
    }
  };

  // Load thread states for results when they change
  // BUT: Don't run this if we just updated a thread state (to avoid double-filtering)
  useEffect(() => {
    const loadThreadStates = async () => {
      const currentPersona = usePersonaStore.getState().persona;
      if (!currentPersona?.id || results.length === 0) return;

      const supabase = createClient();
      const postIds = results.map(r => r.id);
      
      if (postIds.length === 0) return; // Safety check
      
      const { data: processedThreads } = await supabase
        .from('processed_threads')
        .select('post_id, state, skip_expires_at')
        .eq('persona_id', currentPersona.id)
        .in('post_id', postIds);

      if (processedThreads && processedThreads.length > 0) {
        setResults(prev => {
          // Only update threads that are in processedThreads AND don't already have a state
          // This prevents re-filtering threads that were already handled
          const processedIds = new Set(processedThreads.map(pt => pt.post_id));
          
          return prev
            .map(r => {
              // Skip threads that already have a state (they were already handled)
              if (r.threadState !== undefined && r.threadState !== null) {
                return r; // Keep threads that already have states
              }
              
              // Only check threads that are in the processedThreads result
              if (!processedIds.has(r.id)) {
                return r; // Keep as is if not in database (shouldn't be filtered)
              }
              
              const processed = processedThreads.find(pt => pt.post_id === r.id);
              if (processed) {
                // If done or deleted, filter it out (return null to filter later)
                if (processed.state === 'done' || processed.state === 'deleted') {
                  return null;
                }
                // If skip, update the state
                return {
                  ...r,
                  threadState: processed.state as 'skip',
                  skipExpiresAt: processed.skip_expires_at,
                };
              }
              return r;
            })
            .filter((r): r is PostResult => r !== null); // Remove null entries (done/deleted threads)
        });
      }
    };

    // Only load if we have results and they don't already have states loaded
    // Don't run if results array is empty
    if (results.length === 0) return;
    
    // Only load states for threads that don't have a state yet
    // This prevents re-filtering threads that were already marked as done
    const hasUnloadedStates = results.some(r => r.threadState === undefined && r.id);
    if (hasUnloadedStates) {
      loadThreadStates();
    }
  }, [results.map(r => r.id).join(',')]);

  // Filter out "done" and "deleted" threads for display
  const visibleResults = results.filter(r => r.threadState !== 'done' && r.threadState !== 'deleted');

  // Load previous threads (done/deleted) from database
  const loadPreviousThreads = async () => {
    const currentPersona = usePersonaStore.getState().persona;
    if (!currentPersona?.id) return;

    setIsLoadingPrevious(true);
    try {
      const supabase = createClient();
      const { data: processedThreads } = await supabase
        .from('processed_threads')
        .select('*')
        .eq('persona_id', currentPersona.id)
        .in('state', ['done', 'deleted', 'skip'])
        .order('updated_at', { ascending: false })
        .limit(100); // Limit to last 100 threads to have more data for filtering

      if (processedThreads && processedThreads.length > 0) {
        // Convert processed_threads to PostResult format
        // Extract subreddit name from URL or use stored subreddit
        const threads: PostResult[] = processedThreads.map(pt => {
          // Try to extract title from URL (Reddit URLs often have titles in them)
          let title = `Post in r/${pt.subreddit}`;
          if (pt.post_url) {
            // Reddit URLs are like: https://reddit.com/r/subreddit/comments/postid/title/
            const urlParts = pt.post_url.split('/');
            if (urlParts.length > 6) {
              // Last part before query params might be title
              const lastPart = urlParts[urlParts.length - 1].split('?')[0];
              if (lastPart && lastPart.length > 10) {
                title = decodeURIComponent(lastPart.replace(/_/g, ' '));
              }
            }
          }
          
          return {
            id: pt.post_id,
            title: pt.post_title || title,
            content: pt.post_content || 'No content available',
            subreddit: pt.subreddit || 'unknown',
            author: 'unknown',
            score: 0,
            url: pt.post_url || '',
            relevanceScore: 0,
            generatedResponse: pt.generated_response || undefined,
            responseGenerated: !!pt.generated_response,
            threadState: pt.state as 'done' | 'deleted' | 'skip',
            skipExpiresAt: pt.skip_expires_at,
          };
        });

        setPreviousThreads(threads);
      } else {
        setPreviousThreads([]);
      }
    } catch (error) {
      console.error('Error loading previous threads:', error);
      toast.error('Failed to load previous threads');
    } finally {
      setIsLoadingPrevious(false);
    }
  };

  // Load previous threads when toggle is turned on
  useEffect(() => {
    if (showPreviousThreads && previousThreads.length === 0 && !isLoadingPrevious) {
      loadPreviousThreads();
    }
  }, [showPreviousThreads]);

  return (
    <div className="p-6">
      <PageContainer maxWidth="2xl">
        <PageHeader
          title="Automate"
          description="Automatically find and respond to relevant Reddit posts"
          icon={Zap}
        />

        <div className="space-y-6">
          {/* Settings Card */}
          <Card>
            <h2 className="text-lg font-semibold text-ms-neutral mb-4">Automation Settings</h2>
            
            <div className="space-y-4">
              {/* Search Mode */}
              <div>
                <label className="block text-sm font-medium text-ms-neutralSecondary mb-2">
                  Search Mode
                </label>
                <div className="flex gap-4">
                  <button
                    onClick={() => setSearchMode('subreddit')}
                    className={`flex-1 p-4 border-2 rounded-ms transition-colors ${
                      searchMode === 'subreddit'
                        ? 'border-ms-primary bg-ms-backgroundHover'
                        : 'border-ms-border hover:border-ms-borderHover'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Hash className="w-5 h-5 text-ms-primary" />
                      <span className="font-medium text-ms-neutral">Subreddit Search</span>
                    </div>
                    <p className="text-sm text-ms-neutralSecondary">
                      Search in selected subreddits from Define Market
                    </p>
                  </button>
                  
                  <button
                    onClick={() => setSearchMode('global')}
                    className={`flex-1 p-4 border-2 rounded-ms transition-colors ${
                      searchMode === 'global'
                        ? 'border-ms-primary bg-ms-backgroundHover'
                        : 'border-ms-border hover:border-ms-borderHover'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Globe className="w-5 h-5 text-ms-primary" />
                      <span className="font-medium text-ms-neutral">Global Search</span>
                    </div>
                    <p className="text-sm text-ms-neutralSecondary">
                      Search across all of Reddit
                    </p>
                  </button>
                </div>
              </div>

              {/* Subreddit Selection (only if subreddit mode) */}
              {searchMode === 'subreddit' && (
                <div>
                  <label className="block text-sm font-medium text-ms-neutralSecondary mb-2">
                    Select Subreddits
                  </label>
                  {availableSubreddits.length === 0 ? (
                    <p className="text-sm text-ms-neutralTertiary">
                      No subreddits found. Add subreddits in Define Market first.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {availableSubreddits.map((sub) => (
                        <button
                          key={sub.id}
                          onClick={() => toggleSubreddit(sub.id)}
                          className={`px-3 py-1.5 rounded-ms border text-sm transition-colors ${
                            selectedSubreddits.includes(sub.id)
                              ? 'bg-ms-primary text-white border-ms-primary'
                              : 'bg-white border-ms-border text-ms-neutral hover:bg-ms-backgroundHover'
                          }`}
                        >
                          r/{sub.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Number of Posts */}
              <div>
                <label className="block text-sm font-medium text-ms-neutralSecondary mb-2">
                  Number of Posts to Search
                </label>
                <Input
                  type="number"
                  min="1"
                  max="100"
                  value={numPosts}
                  onChange={(e) => setNumPosts(parseInt(e.target.value) || 10)}
                  className="w-32"
                />
              </div>

              {/* Score Threshold */}
              <div>
                <label className="block text-sm font-medium text-ms-neutralSecondary mb-2">
                  Minimum Relevance Score (0.0 - 1.0)
                </label>
                <div className="flex items-center gap-4">
                  <Input
                    type="number"
                    min="0"
                    max="1"
                    step="0.1"
                    value={scoreThreshold}
                    onChange={(e) => setScoreThreshold(parseFloat(e.target.value) || 0.7)}
                    className="w-32"
                  />
                  <div className="flex-1">
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={scoreThreshold}
                      onChange={(e) => setScoreThreshold(parseFloat(e.target.value))}
                      className="w-full"
                    />
                  </div>
                  <span className="text-sm text-ms-neutralSecondary">
                    {scoreThreshold.toFixed(1)}
                  </span>
                </div>
              </div>

              {/* Start Button */}
              <div className="pt-4">
                <Button
                  onClick={startAutomation}
                  disabled={isRunning || (searchMode === 'subreddit' && selectedSubreddits.length === 0)}
                  variant="primary"
                  size="lg"
                  className="w-full"
                >
                  {isRunning ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      Running Automation...
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5 mr-2" />
                      Start Automation
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Card>

          {/* Previous Threads Section */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-ms-neutralPrimary">Previous Threads</h3>
                <p className="text-sm text-ms-neutralSecondary mt-1">
                  View threads you&apos;ve marked as done or deleted
                </p>
              </div>
              <Button
                onClick={() => {
                  setShowPreviousThreads(!showPreviousThreads);
                  if (!showPreviousThreads && previousThreads.length === 0 && !isLoadingPrevious) {
                    loadPreviousThreads();
                  }
                }}
                variant="ghost"
                size="sm"
              >
                {showPreviousThreads ? 'Hide' : 'Show'} Previous Threads
              </Button>
            </div>

            {showPreviousThreads && (
              <div className="mt-4">
                {isLoadingPrevious ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-ms-primary" />
                    <span className="ml-2 text-ms-neutralSecondary">Loading previous threads...</span>
                  </div>
                ) : previousThreads.length === 0 ? (
                  <p className="text-sm text-ms-neutralTertiary py-4 text-center">
                    No previous threads found
                  </p>
                ) : (
                  <>
                    {/* Filter Buttons */}
                    <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b border-ms-border">
                      <Button
                        onClick={() => setPreviousThreadsFilter('all')}
                        variant={previousThreadsFilter === 'all' ? 'primary' : 'ghost'}
                        size="sm"
                      >
                        All ({previousThreads.length})
                      </Button>
                      <Button
                        onClick={() => setPreviousThreadsFilter('responded')}
                        variant={previousThreadsFilter === 'responded' ? 'primary' : 'ghost'}
                        size="sm"
                      >
                        Responded ({previousThreads.filter(t => t.responseGenerated && t.threadState !== 'deleted' && t.threadState !== 'skip').length})
                      </Button>
                      <Button
                        onClick={() => setPreviousThreadsFilter('not_responded')}
                        variant={previousThreadsFilter === 'not_responded' ? 'primary' : 'ghost'}
                        size="sm"
                      >
                        Not Responded ({previousThreads.filter(t => !t.responseGenerated && t.threadState !== 'deleted' && t.threadState !== 'skip').length})
                      </Button>
                      <Button
                        onClick={() => setPreviousThreadsFilter('skipped')}
                        variant={previousThreadsFilter === 'skipped' ? 'primary' : 'ghost'}
                        size="sm"
                      >
                        Skipped ({previousThreads.filter(t => t.threadState === 'skip').length})
                      </Button>
                      <Button
                        onClick={() => setPreviousThreadsFilter('deleted')}
                        variant={previousThreadsFilter === 'deleted' ? 'primary' : 'ghost'}
                        size="sm"
                      >
                        Deleted ({previousThreads.filter(t => t.threadState === 'deleted').length})
                      </Button>
                    </div>

                    {/* Filtered Results */}
                    <div className="space-y-4">
                      {(() => {
                        let filtered = previousThreads;
                        
                        switch (previousThreadsFilter) {
                          case 'responded':
                            // Only show responded threads that are NOT deleted and NOT skipped
                            filtered = previousThreads.filter(t => 
                              t.responseGenerated && 
                              t.threadState !== 'deleted' && 
                              t.threadState !== 'skip'
                            );
                            break;
                          case 'not_responded':
                            // Only show not responded threads that are NOT deleted and NOT skipped
                            filtered = previousThreads.filter(t => 
                              !t.responseGenerated && 
                              t.threadState !== 'deleted' && 
                              t.threadState !== 'skip'
                            );
                            break;
                          case 'skipped':
                            // Only show skipped threads
                            filtered = previousThreads.filter(t => t.threadState === 'skip');
                            break;
                          case 'deleted':
                            // Only show deleted threads
                            filtered = previousThreads.filter(t => t.threadState === 'deleted');
                            break;
                          default:
                            // Show all threads
                            filtered = previousThreads;
                        }

                        if (filtered.length === 0) {
                          return (
                            <p className="text-sm text-ms-neutralTertiary py-4 text-center">
                              No threads found for this filter
                            </p>
                          );
                        }

                        return filtered.map((post) => (
                      <Card key={post.id} className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-medium text-ms-neutralPrimary">{post.title}</h4>
                              <Badge
                                variant={
                                  post.threadState === 'done' 
                                    ? 'success' 
                                    : post.threadState === 'deleted'
                                    ? 'danger'
                                    : post.threadState === 'skip'
                                    ? 'warning'
                                    : 'default'
                                }
                                className="text-xs"
                              >
                                {post.threadState === 'done' 
                                  ? 'Done' 
                                  : post.threadState === 'deleted'
                                  ? 'Deleted'
                                  : post.threadState === 'skip'
                                  ? 'Skipped'
                                  : 'Unknown'}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-ms-neutralTertiary mb-2">
                              <span>r/{post.subreddit}</span>
                              {post.generatedResponse && (
                                <>
                                  <span>•</span>
                                  <span>Response generated</span>
                                </>
                              )}
                            </div>
                          </div>
                          <a
                            href={post.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-4 text-ms-primary hover:underline flex items-center gap-1"
                          >
                            <ExternalLink className="w-4 h-4" />
                            <span className="text-xs">View</span>
                          </a>
                        </div>

                        {/* Original Post Content */}
                        <div className="mt-3 pt-3 border-t border-ms-border">
                          <p className="text-xs font-medium text-ms-neutralSecondary mb-2">
                            Original Post:
                          </p>
                          <p className="text-sm text-ms-neutralPrimary whitespace-pre-wrap mb-3">
                            {post.content}
                          </p>
                        </div>

                        {/* Generated Response */}
                        {post.generatedResponse && (
                          <div className="mt-3 pt-3 border-t border-ms-border">
                            <p className="text-xs font-medium text-ms-neutralSecondary mb-1">
                              Generated Response:
                            </p>
                            <p className="text-sm text-ms-neutralPrimary whitespace-pre-wrap">{post.generatedResponse}</p>
                          </div>
                        )}

                        {/* Status Change Buttons */}
                        <div className="mt-4 pt-3 border-t border-ms-border flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-medium text-ms-neutralSecondary">Change Status:</span>
                          <div className="flex gap-2">
                            <Button
                              onClick={() => updateThreadState(post.id, 'done')}
                              variant={post.threadState === 'done' ? 'primary' : 'ghost'}
                              size="sm"
                              className="text-xs"
                            >
                              <CheckCircle className="w-3 h-3 mr-1" />
                              {post.threadState === 'done' ? 'Done' : 'Mark Done'}
                            </Button>
                            <Button
                              onClick={() => updateThreadState(post.id, 'skip')}
                              variant={post.threadState === 'skip' ? 'primary' : 'ghost'}
                              size="sm"
                              className="text-xs"
                            >
                              <SkipForward className="w-3 h-3 mr-1" />
                              {post.threadState === 'skip' ? 'Skipped' : 'Skip'}
                            </Button>
                            <Button
                              onClick={() => updateThreadState(post.id, 'deleted')}
                              variant={post.threadState === 'deleted' ? 'primary' : 'ghost'}
                              size="sm"
                              className="text-xs"
                            >
                              <X className="w-3 h-3 mr-1" />
                              {post.threadState === 'deleted' ? 'Deleted' : 'Delete'}
                            </Button>
                          </div>
                        </div>
                      </Card>
                        ));
                      })()}
                    </div>
                  </>
                )}
              </div>
            )}
          </Card>

          {/* Results - Filter out "done" and "deleted" threads */}
          {visibleResults.length > 0 && (
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-ms-neutral">
                  Results ({visibleResults.length} posts)
                </h2>
                <div className="flex items-center gap-4 text-sm text-ms-neutralSecondary">
                  <span>
                    Above threshold: {visibleResults.filter(r => r.relevanceScore >= scoreThreshold).length}
                  </span>
                  <span>
                    Responses generated: {visibleResults.filter(r => r.responseGenerated).length}
                  </span>
                </div>
              </div>

              <div className="space-y-4 max-h-[calc(100vh-500px)] overflow-y-auto fluent-scroll">
                {visibleResults.map((post) => {
                  const isAboveThreshold = post.relevanceScore >= scoreThreshold;
                  return (
                    <Card
                      key={post.id}
                      variant={isAboveThreshold ? 'elevated' : 'outlined'}
                      className={`border-l-4 ${
                        isAboveThreshold ? 'border-l-ms-primary' : 'border-l-ms-border'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-ms-neutral">{post.title}</h3>
                            <Badge
                              variant={isAboveThreshold ? 'success' : 'default'}
                              className={
                                isAboveThreshold
                                  ? 'bg-green-100 text-ms-success border-green-200'
                                  : ''
                              }
                            >
                              Score: {post.relevanceScore.toFixed(2)}
                            </Badge>
                            {post.responseGenerated && (
                              <Badge variant="info" className="bg-blue-100 text-ms-primary border-blue-200">
                                Response Ready
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-xs text-ms-neutralSecondary mb-2">
                            <a
                              href={post.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-ms-primary hover:text-ms-primaryHover hover:underline"
                            >
                              <span>r/{post.subreddit}</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                            <span>u/{post.author}</span>
                            <span>{post.score} upvotes</span>
                            <a
                              href={post.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-ms-primary hover:text-ms-primaryHover hover:underline ml-auto"
                            >
                              View Original Post
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        </div>
                      </div>

                      {/* Post Content */}
                      <div className="mb-4 p-3 bg-ms-backgroundHover rounded-ms">
                        <p className="text-sm text-ms-neutral whitespace-pre-wrap">
                          {post.content || 'No content'}
                        </p>
                      </div>

                      {/* Generated Response */}
                      {post.responseGenerated && post.generatedResponse && (
                        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-ms">
                          <div className="flex items-center gap-2 mb-2">
                            <CheckCircle className="w-4 h-4 text-ms-primary" />
                            <h4 className="text-sm font-semibold text-ms-primary">Generated Response</h4>
                          </div>
                          <p className="text-sm text-ms-neutral whitespace-pre-wrap">
                            {post.generatedResponse}
                          </p>
                        </div>
                      )}

                      {isAboveThreshold && !post.responseGenerated && (
                        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-ms">
                          <div className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 text-ms-warning animate-spin" />
                            <span className="text-sm text-ms-warning">Generating response...</span>
                          </div>
                        </div>
                      )}

                      {/* Thread State Management - Always visible */}
                      <div className="mt-4 pt-4 border-t border-ms-border">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {post.threadState ? (
                              <>
                                <Badge
                                  variant="default"
                                  className={
                                    post.threadState === 'done'
                                      ? 'bg-green-100 text-green-700 border-green-200'
                                      : post.threadState === 'deleted'
                                      ? 'bg-red-100 text-red-700 border-red-200'
                                      : 'bg-yellow-100 text-yellow-700 border-yellow-200'
                                  }
                                >
                                  {post.threadState === 'done' && 'Done'}
                                  {post.threadState === 'deleted' && 'Deleted'}
                                  {post.threadState === 'skip' && 'Skipped'}
                                </Badge>
                                {post.threadState === 'skip' && post.skipExpiresAt && (
                                  <span className="text-xs text-ms-neutralSecondary">
                                    (shows again {new Date(post.skipExpiresAt).toLocaleDateString()})
                                  </span>
                                )}
                              </>
                            ) : (
                              <span className="text-xs text-ms-neutralSecondary">No action taken</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              onClick={() => updateThreadState(post.id, 'done')}
                              variant={post.threadState === 'done' ? 'primary' : 'ghost'}
                              size="sm"
                              className={
                                post.threadState === 'done'
                                  ? 'bg-green-600 text-white hover:bg-green-700'
                                  : 'text-green-600 hover:text-green-700 hover:bg-green-50 border border-green-200'
                              }
                            >
                              <Check className="w-4 h-4 mr-1" />
                              Done
                            </Button>
                            <Button
                              onClick={() => updateThreadState(post.id, 'skip')}
                              variant={post.threadState === 'skip' ? 'primary' : 'ghost'}
                              size="sm"
                              className={
                                post.threadState === 'skip'
                                  ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                                  : 'text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50 border border-yellow-200'
                              }
                            >
                              <SkipForward className="w-4 h-4 mr-1" />
                              Skip
                            </Button>
                            <Button
                              onClick={() => updateThreadState(post.id, 'deleted')}
                              variant={post.threadState === 'deleted' ? 'primary' : 'ghost'}
                              size="sm"
                              className={
                                post.threadState === 'deleted'
                                  ? 'bg-red-600 text-white hover:bg-red-700'
                                  : 'text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-200'
                              }
                            >
                              <X className="w-4 h-4 mr-1" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </Card>
          )}
        </div>
      </PageContainer>
    </div>
  );
}

