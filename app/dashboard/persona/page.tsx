'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';
import { usePersonaStore } from '@/lib/store/persona-store';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Button, Input, Textarea, Select, Card } from '@/components/ui';

const PERSONA_ARCHETYPES = [
  { value: 'The Helpful Expert', label: 'The Helpful Expert', description: 'Knowledgeable and supportive' },
  { value: 'The Sarcastic Peer', label: 'The Sarcastic Peer', description: 'Witty and relatable' },
  { value: 'The Concerned Community Member', label: 'The Concerned Community Member', description: 'Empathetic and caring' },
];

export default function PersonaPage() {
  const router = useRouter();
  const { persona, updatePersona, setPersona } = usePersonaStore();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [brandUrl, setBrandUrl] = useState('');

  const currentPersona = persona || {
    name: '',
    archetype: 'The Helpful Expert',
    brandMission: '',
    productName: '',
    problemDescription: '',
    painPoints: [],
    toneProfessionalism: 7,
    toneConciseness: 6,
    toneEmpathy: 8,
    authenticityMarkers: {
      useLowercaseI: true,
      useContractions: true,
      varySentenceLength: true,
      avoidCorporateSpeak: true,
    },
  };

  const handleScrapeBrand = async () => {
    if (!brandUrl) {
      toast.error('Please enter a URL');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/scrape-brand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: brandUrl }),
      });

      if (response.ok) {
        const data = await response.json();
        updatePersona({
          brandMission: data.mission || '',
          productName: data.productName || '',
        });
        toast.success('Brand information extracted!');
      } else {
        toast.error('Failed to scrape brand. Please enter manually.');
      }
    } catch (error) {
      toast.error('Failed to scrape brand. Please enter manually.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!currentPersona.name || !currentPersona.productName || !currentPersona.brandMission) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast.error('Please sign in first');
        router.push('/auth/login');
        return;
      }

      const { data, error } = await supabase
        .from('personas')
        .insert({
          user_id: user.id,
          name: currentPersona.name,
          archetype: currentPersona.archetype,
          brand_mission: currentPersona.brandMission,
          product_name: currentPersona.productName,
          problem_description: currentPersona.problemDescription,
          pain_points: currentPersona.painPoints,
          tone_professionalism: currentPersona.toneProfessionalism,
          tone_conciseness: currentPersona.toneConciseness,
          tone_empathy: currentPersona.toneEmpathy,
          authenticity_markers: currentPersona.authenticityMarkers,
        })
        .select()
        .single();

      if (error) throw error;

      setPersona({ ...currentPersona, id: data.id });
      toast.success('Persona saved!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save persona');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Persona Engine</h1>
        <p className="text-gray-600 mt-1">Create your digital brand twin</p>
      </div>

        <Card>
          {/* Step 1: Basic Info */}
          {step === 1 && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <Input
                label="Persona Name *"
                type="text"
                value={currentPersona.name}
                onChange={(e) => updatePersona({ name: e.target.value })}
                placeholder="e.g., TechHelper Pro"
              />

              <Select
                label="Persona Archetype *"
                value={currentPersona.archetype}
                onChange={(e) => updatePersona({ archetype: e.target.value })}
              >
                {PERSONA_ARCHETYPES.map((arch) => (
                  <option key={arch.value} value={arch.value}>
                    {arch.label} - {arch.description}
                  </option>
                ))}
              </Select>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">Brand URL (Optional)</label>
                <div className="flex gap-2">
                  <Input
                    type="url"
                    value={brandUrl}
                    onChange={(e) => setBrandUrl(e.target.value)}
                    placeholder="https://yourbrand.com"
                    className="flex-1"
                  />
                  <Button
                    onClick={handleScrapeBrand}
                    disabled={loading}
                    variant="primary"
                  >
                    {loading ? 'Scraping...' : 'Scrape'}
                  </Button>
                </div>
              </div>

              <Textarea
                label="Brand Mission *"
                value={currentPersona.brandMission}
                onChange={(e) => updatePersona({ brandMission: e.target.value })}
                rows={4}
                placeholder="What does your brand stand for?"
              />

              <Input
                label="Product Name *"
                type="text"
                value={currentPersona.productName}
                onChange={(e) => updatePersona({ productName: e.target.value })}
                placeholder="e.g., TaskMaster Pro"
              />
            </motion.div>
          )}

          {/* Step 2: Problem & Pain Points */}
          {step === 2 && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <Textarea
                label="Problem Description"
                value={currentPersona.problemDescription}
                onChange={(e) => updatePersona({ problemDescription: e.target.value })}
                rows={4}
                placeholder="What problem does your product solve?"
              />

              <Textarea
                label="Key Pain Points (one per line)"
                value={currentPersona.painPoints.join('\n')}
                onChange={(e) =>
                  updatePersona({
                    painPoints: e.target.value.split('\n').filter((p) => p.trim()),
                  })
                }
                rows={6}
                placeholder="Enter pain points, one per line"
              />
            </motion.div>
          )}

          {/* Step 3: Tone Sliders */}
          {step === 3 && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-8"
            >
              <div>
                <label className="block text-sm font-medium mb-4">
                  Professionalism: {currentPersona.toneProfessionalism}/10
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={currentPersona.toneProfessionalism}
                  onChange={(e) =>
                    updatePersona({ toneProfessionalism: parseInt(e.target.value) })
                  }
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-4">
                  Conciseness: {currentPersona.toneConciseness}/10
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={currentPersona.toneConciseness}
                  onChange={(e) =>
                    updatePersona({ toneConciseness: parseInt(e.target.value) })
                  }
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-4">
                  Empathy: {currentPersona.toneEmpathy}/10
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={currentPersona.toneEmpathy}
                  onChange={(e) =>
                    updatePersona({ toneEmpathy: parseInt(e.target.value) })
                  }
                  className="w-full"
                />
              </div>
            </motion.div>
          )}

          {/* Step 4: Authenticity Markers */}
          {step === 4 && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              <h3 className="text-lg font-semibold mb-4">Authenticity Markers</h3>
              
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={currentPersona.authenticityMarkers.useLowercaseI}
                  onChange={(e) =>
                    updatePersona({
                      authenticityMarkers: {
                        ...currentPersona.authenticityMarkers,
                        useLowercaseI: e.target.checked,
                      },
                    })
                  }
                  className="w-5 h-5"
                />
                <span>Use lowercase &quot;i&quot; instead of &quot;I&quot;</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={currentPersona.authenticityMarkers.useContractions}
                  onChange={(e) =>
                    updatePersona({
                      authenticityMarkers: {
                        ...currentPersona.authenticityMarkers,
                        useContractions: e.target.checked,
                      },
                    })
                  }
                  className="w-5 h-5"
                />
                <span>Use contractions (don&apos;t, can&apos;t, etc.)</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={currentPersona.authenticityMarkers.varySentenceLength}
                  onChange={(e) =>
                    updatePersona({
                      authenticityMarkers: {
                        ...currentPersona.authenticityMarkers,
                        varySentenceLength: e.target.checked,
                      },
                    })
                  }
                  className="w-5 h-5"
                />
                <span>Vary sentence lengths</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={currentPersona.authenticityMarkers.avoidCorporateSpeak}
                  onChange={(e) =>
                    updatePersona({
                      authenticityMarkers: {
                        ...currentPersona.authenticityMarkers,
                        avoidCorporateSpeak: e.target.checked,
                      },
                    })
                  }
                  className="w-5 h-5"
                />
                <span>Avoid corporate speak</span>
              </label>
            </motion.div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-8">
            <Button
              onClick={() => setStep(Math.max(1, step - 1))}
              disabled={step === 1}
              variant="secondary"
            >
              Previous
            </Button>

            {step < 4 ? (
              <Button
                onClick={() => setStep(step + 1)}
                variant="primary"
              >
                Next <ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                onClick={handleSave}
                disabled={loading}
                variant="success"
              >
                {loading ? 'Saving...' : 'Save Persona'} <ArrowRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </Card>
    </div>
  );
}

