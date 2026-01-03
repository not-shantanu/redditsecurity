'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { usePersonaStore } from '@/lib/store/persona-store';
import { Card, Badge } from '@/components/ui';

export default function PostGeneratorPage() {
  const router = useRouter();
  const { persona } = usePersonaStore();

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Post Generator</h1>
        <p className="text-gray-600 mt-1">Generate Reddit posts with AI (BETA)</p>
      </div>

      <Card>
        <div className="text-center py-12">
          <Sparkles className="w-16 h-16 text-purple-600 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Post Generator (BETA)</h2>
          <p className="text-gray-600 mb-4">
            This feature is coming soon. Generate engaging Reddit posts using AI.
          </p>
          <Badge variant="default" className="bg-purple-100 text-purple-700">
            Coming Soon
          </Badge>
        </div>
      </Card>
    </div>
  );
}

