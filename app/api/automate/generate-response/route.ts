import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { post, personaId } = body;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Load persona to get brand context
    const { data: persona } = await supabase
      .from('personas')
      .select('*')
      .eq('id', personaId)
      .single();

    if (!persona) {
      return NextResponse.json({ error: 'Persona not found' }, { status: 404 });
    }

    // Load reply prompt
    // TODO: Load from database, for now use default
    const productName = persona.product_name || '';
    const productWebsite = persona.website_url || '';
    
    // Vary the response style randomly to avoid repetitive patterns
    const responseStyles = [
      {
        opening: ['ugh', 'man', 'dude', 'oh man', 'yikes', 'oof', 'aw man'],
        structure: 'stream',
        tone: 'casual',
      },
      {
        opening: ['yeah', 'honestly', 'tbh', 'ngl', 'i mean'],
        structure: 'direct',
        tone: 'straightforward',
      },
      {
        opening: ['i totally get that', 'i feel you', 'been there', 'same'],
        structure: 'empathetic',
        tone: 'understanding',
      },
      {
        opening: ['so', 'okay', 'well', 'hmm', 'interesting'],
        structure: 'thoughtful',
        tone: 'reflective',
      },
    ];

    const style = responseStyles[Math.floor(Math.random() * responseStyles.length)];
    const randomOpening = style.opening[Math.floor(Math.random() * style.opening.length)];

    // Vary product mention style
    const productMentions = productName ? [
      `i actually found ${productName} helpful for this kind of thing`,
      `there's this thing called ${productName} that might help`,
      `i've been using ${productName} and it's been pretty good`,
      `check out ${productName}, it helped me with something similar`,
      `${productName} has been useful for me`,
      `i stumbled across ${productName} and it's been helpful`,
    ] : [];

    const randomProductMention = productMentions.length > 0 
      ? productMentions[Math.floor(Math.random() * productMentions.length)]
      : '';

    const replyPrompt = `You're a real Reddit user responding to this post. Write like you're texting a friend - casual, genuine, and HUMAN. Every response should feel DIFFERENT and UNIQUE.

Post:
Title: ${post.title}
Content: ${post.content}

CRITICAL - BE UNIQUE AND VARIED:
1. **VARY YOUR OPENING**: Don't always start the same way. Sometimes start with "${randomOpening}", sometimes with a different phrase. Mix it up - use "yeah", "honestly", "i mean", "so", "okay", "well", "ugh", "man", "dude", "tbh", "ngl", or just jump straight into your thought. NEVER use the exact same opening twice.

2. **VARY YOUR STRUCTURE**: 
   - Sometimes write 2 short paragraphs
   - Sometimes write 3-4 medium paragraphs  
   - Sometimes one longer paragraph
   - Sometimes mix short and long sentences
   - Sometimes use line breaks, sometimes don't
   - Vary paragraph length - some super short, some medium

3. **VARY YOUR LANGUAGE**:
   - Sometimes use more casual slang ("lol", "tbh", "ngl", "imo", "fr")
   - Sometimes be slightly more formal but still casual
   - Sometimes use lowercase "i" randomly
   - Sometimes have a typo or two (but not always - be natural about it)
   - Mix contractions and non-contractions randomly
   - Vary punctuation - sometimes use "..." or "!!" or "??", sometimes don't

4. **VARY YOUR EMPATHY EXPRESSIONS**:
   - Don't always say "i totally get that" or "man that sucks"
   - Mix: "that's rough", "oof", "yikes", "aw man", "dude that sucks", "ugh", "i feel you", "been there", "same", "i hear you", "that sounds awful", "that's gotta be tough"
   - Sometimes be more direct, sometimes more empathetic
   - Vary how much empathy you show

5. **VARY YOUR ADVICE STYLE**:
   - Sometimes give quick tips
   - Sometimes share a brief personal story
   - Sometimes be more direct
   - Sometimes be more gentle
   - Don't always structure advice the same way
   - Sometimes ask a question, sometimes don't

6. **PRODUCT MENTION (if relevant)**: ${productName ? `
   - Only mention ${productName} if it genuinely relates to the post
   - Use different phrasings: "${randomProductMention}"
   - Or: "i found this thing ${productWebsite ? `at ${productWebsite}` : ''} that helped"
   - Or: "there's ${productName} which might be worth checking out"
   - Make it sound like a casual personal recommendation, never a sales pitch
   - Sometimes mention it early, sometimes later, sometimes not at all if it doesn't fit
   - Vary how you introduce it` : 'If relevant, mention helpful tools naturally'}

7. **VARY YOUR ENDING**:
   - Sometimes end with "good luck" or "hope that helps"
   - Sometimes end with "you got this" or "hang in there"
   - Sometimes just end naturally without a closing
   - Sometimes end with a question
   - Sometimes end with "lol" or "haha" if appropriate
   - Mix it up - don't always end the same way

8. **NO AI PATTERNS**:
   - NEVER use bullet points or numbered lists
   - NEVER say "Here are a few things:" or "Here's what I'd suggest:"
   - NEVER be overly comprehensive or helpful
   - NEVER use formal structure
   - NEVER say "I hope this helps" in every response
   - Write like you're thinking out loud, not like you're giving a presentation

9. **BE GENUINELY DIFFERENT EACH TIME**:
   - Change sentence structure
   - Change vocabulary
   - Change tone slightly
   - Change length
   - Make each response feel like it came from a different person or a different day
   - Read your response - if it sounds like the last 5 responses, rewrite it differently

Write a short, natural, HUMAN Reddit comment. Make it feel UNIQUE and DIFFERENT from any other response. Like a real person wrote it spontaneously, not a template.`;

    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'AI API key not configured' }, { status: 500 });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: replyPrompt }] }],
          generationConfig: {
            temperature: 0.95 + Math.random() * 0.05, // Vary between 0.95-1.0 for maximum variety
            topP: 0.9 + Math.random() * 0.1, // Vary between 0.9-1.0
            topK: 30 + Math.floor(Math.random() * 20), // Vary between 30-50
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error('AI response generation failed');
    }

    const data = await response.json();
    const generatedResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Failed to generate response';

    // Save to processed_threads table with state "done"
    // Extract post ID from post object (could be id field or from URL)
    let postId = '';
    if (post.id) {
      postId = post.id;
    } else if (post.url) {
      // Try to extract from Reddit URL format: https://www.reddit.com/r/subreddit/comments/xxxxx/title/
      const urlParts = post.url.split('/');
      const commentsIndex = urlParts.findIndex((part: string) => part === 'comments');
      if (commentsIndex !== -1 && urlParts[commentsIndex + 1]) {
        postId = urlParts[commentsIndex + 1];
      } else {
        // Fallback: use last part of URL
        postId = urlParts[urlParts.length - 1] || urlParts[urlParts.length - 2] || '';
      }
    }

    if (postId) {
      const postUrl = post.url || `https://www.reddit.com${post.permalink || ''}`;
      await supabase
        .from('processed_threads')
        .upsert({
          persona_id: personaId,
          post_id: postId,
          subreddit: post.subreddit || '',
          post_url: postUrl,
          post_title: post.title || '',
          post_content: post.content || '',
          state: 'done',
          generated_response: generatedResponse,
          skip_expires_at: null, // done/deleted states don't have expiration
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'persona_id,post_id',
        });
    }

    return NextResponse.json({ response: generatedResponse });
  } catch (error: any) {
    console.error('Error generating response:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate response' },
      { status: 500 }
    );
  }
}

