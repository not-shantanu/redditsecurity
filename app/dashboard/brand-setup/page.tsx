'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Globe, Zap, FileText, Edit, RefreshCw } from 'lucide-react';
import { usePersonaStore } from '@/lib/store/persona-store';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Button, Input, Card, Badge, Textarea } from '@/components/ui';

interface BrandData {
  id?: string;
  website_url?: string;
  productName?: string;
  brandName?: string;
  description?: string;
  targetAudience?: string;
  keyFeatures?: string[];
  painPoints?: string[];
  additionalInsights?: string;
  last_analyzed?: string;
}

export default function BrandSetupPage() {
  const router = useRouter();
  const { persona } = usePersonaStore();
  const [brandData, setBrandData] = useState<BrandData>({});
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    loadBrandData();
  }, []); // Load on mount

  useEffect(() => {
    if (persona?.id) {
      loadBrandData();
    }
  }, [persona?.id]); // Reload when persona changes

  const loadBrandData = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return;

    // Always fetch fresh data from database
    let currentPersona = persona;
    if (!currentPersona?.id) {
      const { data: personas } = await supabase
        .from('personas')
        .select('*')
        .eq('user_id', user.id)
        .limit(1)
        .single();

      if (personas) {
        currentPersona = {
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
        usePersonaStore.getState().setPersona(currentPersona);
      } else {
        // No persona found, reset to empty state
        setBrandData({
          website_url: '',
          productName: '',
          brandName: '',
          description: '',
          targetAudience: '',
          keyFeatures: [],
          painPoints: [],
          additionalInsights: '',
          last_analyzed: undefined,
        });
        setWebsiteUrl('');
        return;
      }
    }

    // Always fetch fresh brand data from database
    if (currentPersona?.id) {
      const { data: personaData, error } = await supabase
        .from('personas')
        .select('website_url, product_name, brand_mission, target_audience, key_features, pain_points, problem_description, last_analyzed')
        .eq('id', currentPersona.id)
        .single();

      if (error) {
        console.error('Error loading brand data from database:', error);
        // Fallback to persona store data
        setBrandData({
          website_url: '',
          productName: currentPersona.productName || '',
          brandName: currentPersona.productName || '',
          description: currentPersona.brandMission || '',
          targetAudience: '',
          keyFeatures: [],
          painPoints: currentPersona.painPoints || [],
          additionalInsights: currentPersona.problemDescription || '',
          last_analyzed: undefined,
        });
        setWebsiteUrl('');
        return;
      }

      if (personaData) {
        // Load brand data from database
        setBrandData({
          website_url: personaData.website_url || '',
          productName: personaData.product_name || '',
          brandName: personaData.product_name || '',
          description: personaData.brand_mission || '',
          targetAudience: personaData.target_audience || '',
          keyFeatures: personaData.key_features || [],
          painPoints: personaData.pain_points || [],
          additionalInsights: personaData.problem_description || '',
          last_analyzed: personaData.last_analyzed || null,
        });
        setWebsiteUrl(personaData.website_url || '');
      } else {
        // Fallback to persona store data
        setBrandData({
          website_url: '',
          productName: currentPersona.productName || '',
          brandName: currentPersona.productName || '',
          description: currentPersona.brandMission || '',
          targetAudience: '',
          keyFeatures: [],
          painPoints: currentPersona.painPoints || [],
          additionalInsights: currentPersona.problemDescription || '',
          last_analyzed: undefined,
        });
        setWebsiteUrl('');
      }
    }
  };

  const analyzeWebsite = async (url?: string) => {
    // Ensure we have a valid string URL
    let urlToAnalyze: string;
    if (url) {
      urlToAnalyze = typeof url === 'string' ? url.trim() : String(url).trim();
    } else if (websiteUrl) {
      urlToAnalyze = typeof websiteUrl === 'string' ? websiteUrl.trim() : String(websiteUrl).trim();
    } else if (brandData.website_url) {
      urlToAnalyze = typeof brandData.website_url === 'string' ? brandData.website_url.trim() : String(brandData.website_url).trim();
    } else {
      urlToAnalyze = '';
    }

    // Validate URL format - be very lenient
    if (!urlToAnalyze || urlToAnalyze === '[object Object]') {
      toast.error('Please enter a valid website URL');
      return;
    }
    
    // Remove any extra whitespace
    const trimmedUrl = urlToAnalyze.trim();
    
    // Check minimum length
    if (trimmedUrl.length < 3) {
      toast.error('URL is too short. Please enter a valid website URL');
      return;
    }
    
    // Basic validation - check if it looks like a URL (has dot or starts with http)
    const hasDomain = trimmedUrl.includes('.') || trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://');
    
    if (!hasDomain) {
      toast.error('Please enter a valid website URL (e.g., charmup.website or https://charmup.website)');
      return;
    }
    
    // Log the URL being sent for debugging
    console.log('Analyzing website with URL:', trimmedUrl);

    setAnalyzing(true);
    try {
      const response = await fetch('/api/scrape-brand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmedUrl }),
      });

      if (!response.ok) {
        let errorMessage = 'Failed to analyze website';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          // If response is not JSON, use status text
          errorMessage = `Error ${response.status}: ${response.statusText || errorMessage}`;
        }
        toast.error(errorMessage);
        console.error('API Error:', errorMessage, 'Status:', response.status);
        setAnalyzing(false);
        return;
      }

      const data = await response.json();
      
      // Check if the response contains an error
      if (data.error) {
        toast.error(data.error);
        setAnalyzing(false);
        return;
      }

      const newBrandData = {
        website_url: data.website_url || urlToAnalyze,
        productName: data.productName || data.brandName || '',
        brandName: data.brandName || data.productName || '',
        description: data.description || data.mission || '',
        targetAudience: data.targetAudience || '',
        keyFeatures: data.keyFeatures || [],
        painPoints: data.painPoints || [],
        additionalInsights: data.useCases?.join('. ') || data.problemSolved || '',
        last_analyzed: new Date().toISOString(),
      };
      setBrandData(newBrandData);
      setWebsiteUrl(data.website_url || urlToAnalyze);
      
      // Data is automatically saved to database by the API route
      toast.success('Brand information extracted and saved successfully!');
    } catch (error: any) {
      console.error('Error analyzing website:', error);
      toast.error(error.message || 'Failed to analyze website. Please check the URL and try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleUrlBlur = () => {
    const url = (websiteUrl || '').toString().trim();
    if (url && url !== brandData.website_url && url !== '[object Object]') {
      analyzeWebsite(url);
    }
  };

  const handleUrlKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      const url = (websiteUrl || '').toString().trim();
      if (url && url.length >= 3 && url !== '[object Object]') {
        // Only analyze if URL looks valid (has dot or starts with http)
        if (url.includes('.') || url.startsWith('http://') || url.startsWith('https://')) {
          analyzeWebsite(url);
        } else {
          toast.error('Please enter a valid website URL (e.g., charmup.website or https://charmup.website)');
        }
      } else {
        toast.error('Please enter a valid website URL');
      }
    }
  };

  const saveBrandData = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast.error('Please sign in first');
      return;
    }

    // Load or create persona
    let currentPersona = persona;
    if (!currentPersona?.id) {
      const { data: personas } = await supabase
        .from('personas')
        .select('*')
        .eq('user_id', user.id)
        .limit(1)
        .single();

      if (personas) {
        currentPersona = {
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
        usePersonaStore.getState().setPersona(currentPersona);
      }
    }

    // Update persona with all brand data in database
    if (currentPersona?.id) {
      const { error } = await supabase
        .from('personas')
        .update({
          product_name: brandData.productName || currentPersona.productName,
          brand_mission: brandData.description || currentPersona.brandMission,
          problem_description: brandData.additionalInsights || currentPersona.problemDescription,
          pain_points: brandData.painPoints && brandData.painPoints.length > 0 
            ? brandData.painPoints 
            : currentPersona.painPoints,
          // Save all brand analysis fields
          website_url: brandData.website_url || null,
          target_audience: brandData.targetAudience || null,
          key_features: brandData.keyFeatures && brandData.keyFeatures.length > 0 
            ? brandData.keyFeatures 
            : null,
          last_analyzed: brandData.last_analyzed || undefined,
        })
        .eq('id', currentPersona.id);

      if (error) {
        toast.error('Failed to save brand data');
        return;
      }

      // Update persona store
      usePersonaStore.getState().updatePersona({
        productName: brandData.productName || currentPersona.productName,
        brandMission: brandData.description || currentPersona.brandMission,
        problemDescription: brandData.additionalInsights || currentPersona.problemDescription,
        painPoints: brandData.painPoints && brandData.painPoints.length > 0 
          ? brandData.painPoints 
          : currentPersona.painPoints,
      });
    }

    toast.success('Brand data saved!');
    setEditing(false);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Brand Analysis</h1>
        <p className="text-gray-600 mt-1">AI-powered analysis of your brand for intelligent Reddit marketing</p>
      </div>

        {/* Website Analysis */}
        <Card className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-500" />
              <h2 className="text-xl font-semibold text-gray-900">Website Analysis</h2>
            </div>
            <div className="text-sm text-gray-600">
              Last analyzed: {formatDate(brandData.last_analyzed)}
            </div>
          </div>
          
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  type="text"
                  value={websiteUrl || brandData.website_url || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    setWebsiteUrl(typeof value === 'string' ? value : String(value || ''));
                  }}
                  onBlur={handleUrlBlur}
                  onKeyPress={handleUrlKeyPress}
                  placeholder="charmup.website or https://yourbrand.com"
                  className="pl-10"
                />
            </div>
            <Button
              onClick={() => analyzeWebsite()}
              disabled={analyzing}
              variant="danger"
              className="bg-red-600 hover:bg-red-700"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${analyzing ? 'animate-spin' : ''}`} />
              {analyzing ? 'Analyzing...' : 'Analyze'}
            </Button>
          </div>
        </Card>

        {/* Brand Information - Separator Layout */}
        <Card className="mb-6">
          {/* Description */}
          <div className="pb-6">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-ms-neutralTertiary" />
              <h2 className="text-xl font-semibold text-ms-neutral">Description</h2>
            </div>

            {editing ? (
              <Textarea
                value={brandData.description || ''}
                onChange={(e) => setBrandData({ ...brandData, description: e.target.value })}
                rows={6}
                placeholder="Enter your brand description..."
              />
            ) : (
              <div className="bg-ms-backgroundHover border border-ms-border rounded-ms p-4 text-ms-neutral whitespace-pre-wrap min-h-[120px]">
                {brandData.description || persona?.brandMission || 'No description available. Enter a website URL above to auto-extract, or click Edit to add one manually.'}
              </div>
            )}
          </div>

          <div className="border-t border-ms-border my-6"></div>

          {/* Target Audience */}
          <div className="pb-6">
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="w-5 h-5 text-ms-neutralTertiary" />
              <h2 className="text-xl font-semibold text-ms-neutral">Target Audience</h2>
            </div>

            {editing ? (
              <Textarea
                value={brandData.targetAudience || ''}
                onChange={(e) => setBrandData({ ...brandData, targetAudience: e.target.value })}
                rows={6}
                placeholder="Describe your target audience..."
              />
            ) : (
              <div className="bg-ms-backgroundHover border border-ms-border rounded-ms p-4 text-ms-neutral whitespace-pre-wrap min-h-[120px]">
                {brandData.targetAudience || 'No target audience defined. Click Edit to add one.'}
              </div>
            )}
          </div>

          <div className="border-t border-ms-border my-6"></div>

          {/* Key Features */}
          <div className="pb-6">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-5 h-5 text-ms-neutralTertiary" />
              <h2 className="text-xl font-semibold text-ms-neutral">Key Features</h2>
            </div>

            {editing ? (
              <Textarea
                value={brandData.keyFeatures?.join('\n') || ''}
                onChange={(e) => {
                  const features = e.target.value.split('\n').filter(f => f.trim());
                  setBrandData({ ...brandData, keyFeatures: features });
                }}
                rows={6}
                placeholder="Enter key features, one per line..."
              />
            ) : (
              <div className="bg-ms-backgroundHover border border-ms-border rounded-ms p-4 min-h-[120px]">
                {brandData.keyFeatures && brandData.keyFeatures.length > 0 ? (
                  <ul className="list-disc list-inside text-ms-neutral space-y-2">
                    {brandData.keyFeatures.map((feature, idx) => (
                      <li key={idx}>{feature}</li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-ms-neutralTertiary">No features defined. Click Edit to add them.</div>
                )}
              </div>
            )}
          </div>

          <div className="border-t border-ms-border my-6"></div>

          {/* Pain Points Addressed */}
          <div className="pb-6">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-ms-neutralTertiary" />
              <h2 className="text-xl font-semibold text-ms-neutral">Pain Points Addressed</h2>
            </div>

            {editing ? (
              <Textarea
                value={brandData.painPoints?.join('\n') || ''}
                onChange={(e) => {
                  const painPoints = e.target.value.split('\n').filter(p => p.trim());
                  setBrandData({ ...brandData, painPoints: painPoints });
                }}
                rows={6}
                placeholder="Enter pain points addressed, one per line..."
              />
            ) : (
              <div className="bg-ms-backgroundHover border border-ms-border rounded-ms p-4 min-h-[120px]">
                {brandData.painPoints && brandData.painPoints.length > 0 ? (
                  <ul className="list-disc list-inside text-ms-neutral space-y-2">
                    {brandData.painPoints.map((pain, idx) => (
                      <li key={idx}>{pain}</li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-ms-neutralTertiary">No pain points defined. Click Edit to add them.</div>
                )}
              </div>
            )}
          </div>

          <div className="border-t border-ms-border my-6"></div>

          {/* Additional Insights */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-ms-neutralTertiary" />
              <h2 className="text-xl font-semibold text-ms-neutral">Additional Insights</h2>
            </div>

            {editing ? (
              <Textarea
                value={brandData.additionalInsights || ''}
                onChange={(e) => setBrandData({ ...brandData, additionalInsights: e.target.value })}
                rows={6}
                placeholder="Enter any additional insights about your brand..."
              />
            ) : (
              <div className="bg-ms-backgroundHover border border-ms-border rounded-ms p-4 text-ms-neutral whitespace-pre-wrap min-h-[120px]">
                {brandData.additionalInsights || 'No additional insights. Click Edit to add them.'}
              </div>
            )}
          </div>
        </Card>

        {/* Edit/Save Button - Single Control */}
        <div className="flex gap-2 justify-end">
          {!editing ? (
            <Button
              onClick={() => setEditing(true)}
              variant="danger"
              className="bg-red-600 hover:bg-red-700"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit All
            </Button>
          ) : (
            <>
              <Button
                onClick={saveBrandData}
                variant="success"
                className="bg-green-600 hover:bg-green-700"
              >
                Save All Changes
              </Button>
              <Button
                onClick={() => setEditing(false)}
                variant="secondary"
              >
                Cancel
              </Button>
            </>
          )}
        </div>
    </div>
  );
}

