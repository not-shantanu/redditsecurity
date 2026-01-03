'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { usePersonaStore } from '@/lib/store/persona-store';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Button, Card, Badge } from '@/components/ui';

interface Keyword {
  id?: string;
  keyword: string;
  intent: string;
  seed_weight: number;
}

export default function KeywordsPage() {
  const router = useRouter();
  const { persona } = usePersonaStore();
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadKeywords();
  }, []);

  const loadKeywords = async () => {
    if (!persona?.id) return;

    const supabase = createClient();
    const { data: keywordsData } = await supabase
      .from('keywords')
      .select('*')
      .eq('persona_id', persona.id)
      .order('seed_weight', { ascending: false });

    if (keywordsData) setKeywords(keywordsData);
  };

  const generateKeywords = async () => {
    if (!persona) {
      toast.error('Please complete persona setup first');
      return;
    }

    setGenerating(true);
    try {
      const response = await fetch('/api/generate-keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personaId: persona.id,
          description: persona.brandMission,
          audience: persona.problemDescription,
        }),
      });

      if (!response.ok) throw new Error('Failed to generate keywords');

      const data = await response.json();
      setKeywords(data.keywords);
      toast.success(`Generated ${data.keywords.length} keywords!`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate keywords');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Keywords</h1>
        <p className="text-gray-600 mt-1">AI-generated keyword library for your persona</p>
      </div>

        <Card>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold text-gray-900">Keywords</h2>
            <Button
              onClick={generateKeywords}
              disabled={generating}
              variant="primary"
            >
              <Sparkles className="w-4 h-4" />
              {generating ? 'Generating...' : 'Generate Keywords'}
            </Button>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {keywords.length === 0 ? (
              <p className="text-gray-600 text-center py-8">
                Click &quot;Generate Keywords&quot; to create your keyword library
              </p>
            ) : (
              keywords.map((kw, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.02 }}
                  className="bg-gray-50 p-3 rounded-lg flex justify-between items-center border border-gray-200"
                >
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{kw.keyword}</div>
                    <div className="text-sm text-gray-600 flex items-center gap-2 mt-1">
                      <Badge variant="info">{kw.intent}</Badge>
                      <span>Weight: {kw.seed_weight.toFixed(2)}</span>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </Card>
    </div>
  );
}

