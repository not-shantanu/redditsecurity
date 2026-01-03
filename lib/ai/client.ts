// AI Client for Google Gemini API calls
// Note: In production, you should use environment variables for the API key

export interface KeywordResult {
  keyword: string;
  intent: string;
  seed_weight: number;
}

export interface PostAnalysisResult {
  chilly_score: number;
  reasoning: string;
  intent_detected: string;
  should_reply: boolean;
}

export interface AIResponse<T> {
  data: T;
  tokensUsed: number;
}

export async function generateKeywords(
  description: string,
  audience: string,
  apiKey: string
): Promise<{ keywords: KeywordResult[]; tokensUsed: number }> {
  const prompt = `You are a Reddit SEO & Intent Expert.

Product Description: ${description}
Target Audience: ${audience}

TASK: Generate a library of 50 EXTREMELY RELEVANT and SPECIFIC search terms.

CRITICAL REQUIREMENTS - AVOID GENERIC TERMS:
- DO NOT include generic terms like "ai", "ai apps", "ai tools", "artificial intelligence", "chatgpt", "openai", "automation", "software", "tools", "apps", "technology", "tech", "platform", "solution", "service"
- DO NOT include single generic words like "ai", "app", "tool", "software", "tech"
- ONLY include SPECIFIC, RELEVANT keywords that are directly related to the product's unique features, use cases, or target audience
- Focus on problem-specific terms, industry-specific terms, and feature-specific terms
- Keywords should be 2-4 words that clearly relate to the product's specific value proposition

CATEGORIES:
1. High Intent: "Best tool for [specific use case]", "Alternative to [specific competitor]", "[Specific problem] solution"
2. Problem Intent: "How do I [specific problem]?", "Struggling with [specific pain point]", "[Specific challenge] help"
3. Industry Intent: Discussions around [specific category/industry], [specific role] tools, [specific workflow] automation

SCORING: Assign each keyword a "Seed Weight" (0.1 to 1.0) based on conversion likelihood.

OUTPUT: JSON array of objects: [{"keyword": string, "intent": string, "seed_weight": number}]

Return ONLY valid JSON array, no markdown formatting.`;

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: `System: You are a helpful assistant that returns only valid JSON arrays.\n\nUser: ${prompt}`
        }]
      }],
      generationConfig: {
        temperature: 0.7,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to generate keywords');
  }

  const data = await response.json();
  let content = data.candidates[0].content.parts[0].text.trim();
  
  // Remove markdown code blocks if present
  if (content.startsWith('```')) {
    content = content.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }
  
  const parsed = JSON.parse(content);
  
  // Handle both array and object with array property
  const keywords = Array.isArray(parsed) ? parsed : (parsed.keywords || []);
  
  // Extract token usage
  const tokensUsed = data.usageMetadata?.totalTokenCount || 0;
  
  return { keywords, tokensUsed };
}

export async function analyzePost(
  productName: string,
  problemDescription: string,
  painPoints: string[],
  subreddit: string,
  postTitle: string,
  postBody: string,
  apiKey: string
): Promise<{ analysis: PostAnalysisResult; tokensUsed: number }> {
  const prompt = `You are the RedditFrost Lead Qualification Specialist.

OBJECTIVE: Analyze the provided Reddit Post for commercial intent.

PRODUCT CONTEXT:
- Name: ${productName}
- Problem Solved: ${problemDescription}
- Key Pain Points: ${painPoints.join(', ')}

POST CONTENT:
- Subreddit: r/${subreddit}
- Title: ${postTitle}
- Body: ${postBody || 'No body content'}

SCORING CRITERIA (0.0 to 1.0):
- Contextual Fit (40%): Does the post discuss the specific problems we solve?
- Buying Intent (40%): Is the user asking for a tool, a recommendation, or venting about a competitor?
- Sentiment (20%): Is the user in a constructive mindset (seeking help) or destructive (trolling)?

REJECTION RULES:
- If the post is a meme or meta-discussion about the sub.
- If the post is older than 48 hours and has 0 comments (low visibility).

OUTPUT (JSON ONLY, no markdown):
{
  "chilly_score": number,
  "reasoning": "15-word max explanation",
  "intent_detected": "Direct Ask | Problem Awareness | Competitor Switch",
  "should_reply": boolean
}`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a helpful assistant that returns only valid JSON.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to analyze post');
  }

  const data = await response.json();
  const tokensUsed = data.usageMetadata?.totalTokenCount || 0;
  const analysis = JSON.parse(data.candidates[0].content.parts[0].text);
  
  return { analysis, tokensUsed };
}

export async function generateReply(
  personaName: string,
  personaArchetype: string,
  professionalism: number,
  conciseness: number,
  empathy: number,
  authenticityMarkers: {
    useLowercaseI: boolean;
    useContractions: boolean;
    varySentenceLength: boolean;
    avoidCorporateSpeak: boolean;
  },
  productName: string,
  postContent: string,
  chillyScore: number,
  apiKey: string
): Promise<{ reply: string; tokensUsed: number }> {
  const authenticityRules = [
    authenticityMarkers.useLowercaseI ? 'Use lowercase "i" instead of "I"' : '',
    authenticityMarkers.useContractions ? 'Use contractions (don\'t, can\'t, etc.)' : '',
    authenticityMarkers.varySentenceLength ? 'Vary sentence lengths' : '',
    authenticityMarkers.avoidCorporateSpeak ? 'Avoid corporate speak' : '',
  ].filter(Boolean).join('. ');

  const prompt = `You are ${personaName}, a ${personaArchetype} on Reddit.

VOICE SETTINGS:
- Tone: Professionalism=${professionalism}/10, Conciseness=${conciseness}/10, Empathy=${empathy}/10
- Authenticity: ${authenticityRules}

CONSTRAINTS:
1. VALUE FIRST: The first 2 sentences must help the user WITHOUT mentioning the product.
2. NO CORPORATE SPEAK: Avoid "delighted," "robust," "solution," "unleash," or "comprehensive."
3. AUTHENTICITY: Use natural phrasing. ${authenticityRules}
4. THE BRIDGE: If relevant, mention ${productName} as a personal find or something you worked on.
5. NO LINKS (unless requested): ${chillyScore < 0.9 ? 'Do not include the URL, just the name.' : 'You may include a link if it adds value.'}

POST TO REPLY TO:
"${postContent}"

STRUCTURE:
[Hook/Empathy] -> [Actionable Tip/Insight] -> [Soft Brand Mention] -> [Low-pressure Closing]

OUTPUT: Plain text of the comment only, no markdown formatting, no quotes.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a helpful Reddit commenter. Return only the comment text, no markdown, no quotes.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.8,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to generate reply');
  }

  const data = await response.json();
  const tokensUsed = data.usageMetadata?.totalTokenCount || 0;
  const reply = data.candidates[0].content.parts[0].text.trim();
  
  return { reply, tokensUsed };
}

