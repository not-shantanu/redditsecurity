'use client';

import { useState, useEffect } from 'react';
import { FileText, Zap, MessageSquare, Check, X, Code, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Card, Textarea, Tabs, TabList, Tab, TabPanels, TabPanel } from '@/components/ui';
import { usePersonaStore } from '@/lib/store/persona-store';
import { createClient } from '@/lib/supabase/client';

const DEFAULT_ANALYSIS_PROMPT = `Analyze this Reddit post/comment to determine if it's relevant for our brand.

Reddit Content: {reddit_post_inserted_here}

Evaluate the content for:
1. Relevance to our products/services
2. User's intent and needs
3. Potential for meaningful engagement
4. Authenticity of the request

Provide a relevance score from 0.0 to 1.0 where:
- 0.0-0.3: Not relevant (off-topic, spam, or no clear need)
- 0.4-0.6: Somewhat relevant (related topic but unclear fit)
- 0.7-1.0: Highly relevant (clear need/problem we can address)

Include a brief explanation of your scoring decision`;

const DEFAULT_REPLY_PROMPT = `You are a helpful Reddit user who genuinely cares about helping people with their learning and education struggles. You're responding to this Reddit post:
\`{reddit_post_inserted_here}\`

Your brand context (use only when naturally relevant):
\`{brand_details_inserted_here}\`

REPLY GUIDELINES:
**Primary Goal**: Be genuinely helpful first, promotional never. Your main job is to provide real value to the person asking.
**Tone & Style**:
- Write like a normal person having a casual conversation
- Use simple everyday language - no corporate speak`;

export default function AIPromptsPage() {
  const { persona } = usePersonaStore();
  const [activeTab, setActiveTab] = useState<'analysis' | 'reply'>('analysis');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [analysisPrompt, setAnalysisPrompt] = useState(DEFAULT_ANALYSIS_PROMPT);
  const [replyPrompt, setReplyPrompt] = useState(DEFAULT_REPLY_PROMPT);

  const [analysisCharCount, setAnalysisCharCount] = useState(0);
  const [replyCharCount, setReplyCharCount] = useState(0);
  const [analysisVariables, setAnalysisVariables] = useState<string[]>([]);
  const [replyVariables, setReplyVariables] = useState<string[]>([]);

  // Load persona from database if not in store, then load prompts
  useEffect(() => {
    const loadPersonaAndPrompts = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setIsLoading(false);
        return;
      }

      // Load persona from database if not in store
      let currentPersona = persona;
      if (!currentPersona?.id) {
        const { data: personas } = await supabase
          .from('personas')
          .select('*')
          .eq('user_id', user.id)
          .limit(1)
          .single();

        if (personas) {
          const loadedPersona = {
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
          };
          usePersonaStore.getState().setPersona(loadedPersona);
          currentPersona = loadedPersona;
        } else {
          // No persona found
          setIsLoading(false);
          toast.warning('Please set up your brand first');
          return;
        }
      }

      // Now load prompts
      if (!currentPersona?.id) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/ai-prompts?personaId=${currentPersona.id}`);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('Failed to load prompts:', errorData);
          // If table doesn't exist, that's okay - use defaults
          if (errorData.error?.includes('table') || errorData.error?.includes('PGRST205')) {
            console.warn('ai_prompts table may not exist. Using default prompts.');
            toast.warning('No saved prompts found. Using defaults.');
          }
          setIsLoading(false);
          return;
        }

        const data = await response.json();
        if (data.prompts && data.prompts.analysis_prompt && data.prompts.reply_prompt) {
          setAnalysisPrompt(data.prompts.analysis_prompt);
          setReplyPrompt(data.prompts.reply_prompt);
          console.log('Prompts loaded from database successfully');
        } else {
          console.log('No saved prompts found, using defaults');
        }
      } catch (error: any) {
        console.error('Error loading prompts:', error);
        toast.error('Failed to load prompts. Using defaults.');
      } finally {
        setIsLoading(false);
      }
    };

    loadPersonaAndPrompts();
  }, [persona?.id]);

  useEffect(() => {
    setAnalysisCharCount(analysisPrompt.length);
    extractVariables(analysisPrompt, setAnalysisVariables);
  }, [analysisPrompt]);

  useEffect(() => {
    setReplyCharCount(replyPrompt.length);
    extractVariables(replyPrompt, setReplyVariables);
  }, [replyPrompt]);

  // Auto-save prompts when they change (debounced) - only if valid
  useEffect(() => {
    if (!persona?.id || isLoading) return;
    
    // Don't auto-save if prompts are invalid
    if (!validateAnalysis() || !validateReply()) return;

    const timeoutId = setTimeout(() => {
      savePrompts(false); // Silent save
    }, 3000); // Wait 3 seconds after last change

    return () => clearTimeout(timeoutId);
  }, [analysisPrompt, replyPrompt, persona?.id, isLoading]);

  const extractVariables = (template: string, setter: (vars: string[]) => void) => {
    const variableRegex = /\{([^}]+)\}/g;
    const matches = template.matchAll(variableRegex);
    const vars = Array.from(matches, m => m[1]);
    setter([...new Set(vars)]);
  };

  const validateAnalysis = () => {
    return analysisVariables.includes('reddit_post_inserted_here');
  };

  const validateReply = () => {
    return replyVariables.includes('reddit_post_inserted_here') && 
           replyVariables.includes('brand_details_inserted_here');
  };

  const savePrompts = async (showToast = true) => {
    if (!persona?.id) {
      if (showToast) toast.error('Please set up your brand first');
      return false;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/ai-prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personaId: persona.id,
          analysisPrompt: analysisPrompt,
          replyPrompt: replyPrompt,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Save error:', errorData);
        throw new Error(errorData.error || 'Failed to save prompts');
      }

      const data = await response.json();
      if (showToast) {
        toast.success('Prompts saved successfully!');
      }
      return true;
    } catch (error: any) {
      console.error('Error saving prompts:', error);
      if (showToast) {
        toast.error(error.message || 'Failed to save prompts');
      }
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const saveAnalysisPrompt = async () => {
    if (!validateAnalysis()) {
      toast.error('Analysis prompt must contain {reddit_post_inserted_here}');
      return;
    }
    await savePrompts(true);
  };

  const saveReplyPrompt = async () => {
    if (!validateReply()) {
      toast.error('Reply prompt must contain {reddit_post_inserted_here} and {brand_details_inserted_here}');
      return;
    }
    await savePrompts(true);
  };

  // Auto-save prompts when they change (debounced)
  useEffect(() => {
    if (!persona?.id || isLoading) return;

    const timeoutId = setTimeout(() => {
      // Only auto-save if prompts are valid
      if (validateAnalysis() && validateReply()) {
        savePrompts(false); // Silent save
      }
    }, 2000); // Wait 2 seconds after last change

    return () => clearTimeout(timeoutId);
  }, [analysisPrompt, replyPrompt, persona?.id, isLoading]);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">AI Prompts</h1>
        <p className="text-gray-600 mt-1">Manage your Reddit analysis and reply generation prompts</p>
      </div>

        <Tabs>
          <TabList>
            <Tab
              isSelected={activeTab === 'analysis'}
              onClick={() => setActiveTab('analysis')}
            >
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Analysis Prompt
              </div>
            </Tab>
            <Tab
              isSelected={activeTab === 'reply'}
              onClick={() => setActiveTab('reply')}
            >
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Reply Generation Prompt
              </div>
            </Tab>
          </TabList>

          <TabPanels>
            {/* Analysis Prompt Tab */}
            {activeTab === 'analysis' && (
              <TabPanel>
                <Card className="mt-4">
                {/* Required Variables Info */}
                <div className="mb-4 p-3 bg-ms-backgroundHover border border-ms-border rounded-ms">
                  <div className="flex items-center gap-2 mb-2">
                    <Code className="w-4 h-4 text-ms-primary" />
                    <span className="text-sm font-medium text-ms-neutralSecondary">Required Variable:</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {analysisVariables.includes('reddit_post_inserted_here') ? (
                      <Check className="w-4 h-4 text-ms-success" />
                    ) : (
                      <X className="w-4 h-4 text-ms-error" />
                    )}
                    <code className="text-sm bg-white px-2 py-1 rounded-ms border border-ms-border">
                      {'{reddit_post_inserted_here}'}
                    </code>
                  </div>
                </div>

                <Textarea
                  value={analysisPrompt}
                  onChange={(e) => setAnalysisPrompt(e.target.value)}
                  rows={20}
                  className="font-mono text-sm"
                  placeholder="Enter your analysis prompt template here..."
                />
                
                <div className="flex items-center justify-between mt-3">
                  <div className="text-xs text-ms-neutralSecondary">
                    Characters: {analysisCharCount} | Variables: {analysisVariables.length}
                  </div>
                  <div className="flex items-center gap-2">
                    {validateAnalysis() && (
                      <div className="flex items-center gap-1 text-xs text-ms-success">
                        <Check className="w-4 h-4" />
                        Valid
                      </div>
                    )}
                    <Button
                      onClick={saveAnalysisPrompt}
                      variant="primary"
                      size="sm"
                      disabled={isSaving || isLoading}
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        'Save'
                      )}
                    </Button>
                  </div>
                </div>
              </Card>
              </TabPanel>
            )}

            {/* Reply Prompt Tab */}
            {activeTab === 'reply' && (
              <TabPanel>
                <Card className="mt-4">
                {/* Required Variables Info */}
                <div className="mb-4 p-3 bg-ms-backgroundHover border border-ms-border rounded-ms">
                  <div className="flex items-center gap-2 mb-2">
                    <Code className="w-4 h-4 text-ms-primary" />
                    <span className="text-sm font-medium text-ms-neutralSecondary">Required Variables:</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      {replyVariables.includes('reddit_post_inserted_here') ? (
                        <Check className="w-4 h-4 text-ms-success" />
                      ) : (
                        <X className="w-4 h-4 text-ms-error" />
                      )}
                      <code className="text-sm bg-white px-2 py-1 rounded-ms border border-ms-border">
                        {'{reddit_post_inserted_here}'}
                      </code>
                    </div>
                    <div className="flex items-center gap-2">
                      {replyVariables.includes('brand_details_inserted_here') ? (
                        <Check className="w-4 h-4 text-ms-success" />
                      ) : (
                        <X className="w-4 h-4 text-ms-error" />
                      )}
                      <code className="text-sm bg-white px-2 py-1 rounded-ms border border-ms-border">
                        {'{brand_details_inserted_here}'}
                      </code>
                    </div>
                  </div>
                </div>

                <Textarea
                  value={replyPrompt}
                  onChange={(e) => setReplyPrompt(e.target.value)}
                  rows={20}
                  className="font-mono text-sm"
                  placeholder="Enter your reply generation prompt template here..."
                />
                
                <div className="flex items-center justify-between mt-3">
                  <div className="text-xs text-ms-neutralSecondary">
                    Characters: {replyCharCount} | Variables: {replyVariables.length}
                  </div>
                  <div className="flex items-center gap-2">
                    {validateReply() && (
                      <div className="flex items-center gap-1 text-xs text-ms-success">
                        <Check className="w-4 h-4" />
                        Valid
                      </div>
                    )}
                    <Button
                      onClick={saveReplyPrompt}
                      variant="primary"
                      size="sm"
                      disabled={isSaving || isLoading}
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        'Save'
                      )}
                    </Button>
                  </div>
                </div>
              </Card>
              </TabPanel>
            )}
          </TabPanels>
        </Tabs>
    </div>
  );
}

