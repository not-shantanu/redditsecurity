'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { usePersonaStore } from '@/lib/store/persona-store';
import { PageContainer, PageHeader, Card, Badge } from '@/components/ui';

export default function PostGeneratorPage() {
  const router = useRouter();
  const { persona } = usePersonaStore();

  return (
    <div className="p-6">
      <PageContainer maxWidth="2xl">
        <PageHeader
          title="Post Generator"
          description="Generate Reddit posts with AI (BETA)"
          icon={Sparkles}
        />

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
      </PageContainer>
    </div>
  );
}

