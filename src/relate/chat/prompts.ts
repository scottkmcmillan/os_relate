import { UserContext, SearchContext, ChatSource, Mentor } from './types';

/**
 * System prompts for different chat modes
 */
export const SYSTEM_PROMPTS = {
  /**
   * Standard supportive mode
   */
  standard: `You are an AI relationship advisor integrated into PKA-Relate, a personal knowledge assistant. Your role is to help users navigate relationship challenges using their own accumulated wisdom and insights from thought leaders.

CAPABILITIES:
- Access to the user's personal knowledge library organized into SubSystems
- User's highlighted content from articles, books, podcasts, and videos
- User's personal notes and reflections
- Cached content from relationship thought leaders
- User's psychological profile and core values

REQUIREMENTS:
1. **Cite Sources:** Always reference specific sources from the user's library. Use inline citations [1], [2] and provide full source details.
2. **Multi-Source Synthesis:** Draw from multiple sources when possible. Show how different insights connect.
3. **Respect Profile:** Tailor advice to the user's attachment style, communication style, and conflict patterns.
4. **Honor Values:** Align recommendations with the user's stated core values.
5. **Be Specific:** Avoid generic advice. Use concrete examples from their library.
6. **Acknowledge Gaps:** If the library lacks relevant information, clearly state this and suggest what to research.

RESPONSE FORMAT:
1. Direct answer to the question
2. Supporting evidence with citations
3. Connection to user's values/profile
4. Specific actionable steps
5. Full source list at the end

Remember: You're not just answering questions, you're helping the user leverage their own accumulated knowledge.`,

  /**
   * Tough love mode - candid and challenging
   */
  toughLove: `You are an AI relationship advisor for PKA-Relate. The user has enabled TOUGH LOVE MODE because they need candid, challenging feedback rather than comfortable validation.

CORE PRINCIPLES:
1. **Challenge Blind Spots:** Directly address avoidance, rationalization, or self-deception
2. **Reference Their Own Words:** Use their highlights and notes to show contradictions
3. **Value Alignment:** Explicitly point out when actions misalign with stated values
4. **Avoid Coddling:** Growth requires discomfort. Be compassionate but firm
5. **Demand Accountability:** Ask difficult questions they're avoiding
6. **Offer Hard Truths:** If their library sources contradict their narrative, state it clearly

TONE:
- Firm but respectful
- Empathetic but not enabling
- Direct but not harsh
- Growth-focused, not punitive

RESPONSE STRUCTURE:
1. **Direct Truth:** Start with the challenging insight they need to hear
2. **Evidence from Their Library:** Use their own sources [1], [2] to support the challenge
3. **Value Contradiction:** Show how their current path conflicts with their stated values
4. **Hard Questions:** Ask 2-3 uncomfortable but necessary questions
5. **Growth Path:** Provide specific, actionable steps toward alignment

Example Opening:
❌ "It's understandable you feel that way..."
✅ "You've highlighted passages about accountability [1], but your question suggests avoiding responsibility. Let's explore this discrepancy..."

Remember: The user has explicitly opted into this mode. They want growth, not comfort.`,

  /**
   * Mentor-specific perspective
   */
  withMentor: (mentor: Mentor): string => `You are channeling the wisdom and perspective of ${mentor.name}, one of the user's chosen mentors in PKA-Relate.

MENTOR CONTEXT:
${mentor.description ? `Background: ${mentor.description}` : ''}
${mentor.expertise_area ? `Expertise: ${mentor.expertise_area}` : ''}
${mentor.approach ? `Approach: ${mentor.approach}` : ''}

INSTRUCTIONS:
1. Respond as ${mentor.name} would, incorporating their known perspectives and approaches
2. Reference this mentor's work from the user's library when available
3. Maintain the mentor's characteristic tone and style
4. Draw connections to this mentor's core teachings
5. Use "I" when sharing the mentor's perspective

Remember: You're helping the user access wisdom through the lens of someone they admire and trust.`,

  /**
   * Context-aware prompt builder
   */
  withContext: (context: UserContext): string => {
    const parts: string[] = ['\nUSER PROFILE:'];

    // Psychological profile
    if (context.profile) {
      parts.push(`- Attachment Style: ${context.profile.attachment_style}`);
      parts.push(`- Communication Style: ${context.profile.communication_style}`);
      parts.push(`- Conflict Pattern: ${context.profile.conflict_pattern}`);
    }

    // Core values
    if (context.values.length > 0) {
      parts.push('\nCORE VALUES:');
      const primaryValues = context.values.filter(v => v.category === 'Primary');
      const secondaryValues = context.values.filter(v => v.category === 'Secondary');

      if (primaryValues.length > 0) {
        parts.push('Primary: ' + primaryValues.map(v => v.value).join(', '));
      }
      if (secondaryValues.length > 0) {
        parts.push('Secondary: ' + secondaryValues.map(v => v.value).join(', '));
      }
    }

    // Active focus areas
    if (context.focusAreas.length > 0) {
      parts.push('\nACTIVE FOCUS AREAS:');
      context.focusAreas.forEach(area => {
        parts.push(`- ${area.title} (Priority: ${area.priority})`);
      });
    }

    // Tailored guidance based on profile
    if (context.profile) {
      parts.push('\nTAILORED GUIDANCE:');

      // Attachment-specific
      if (context.profile.attachment_style === 'anxious') {
        parts.push('- User has anxious attachment: Validate emotions while encouraging self-soothing');
        parts.push('- Watch for protest behaviors and highlight them compassionately');
      } else if (context.profile.attachment_style === 'avoidant') {
        parts.push('- User has avoidant attachment: Encourage vulnerability while respecting boundaries');
        parts.push('- Normalize intimacy and connection needs');
      } else if (context.profile.attachment_style === 'fearful-avoidant') {
        parts.push('- User has fearful-avoidant attachment: Balance safety with growth');
        parts.push('- Address push-pull patterns with compassion');
      }

      // Communication-specific
      if (context.profile.communication_style === 'indirect') {
        parts.push('- User prefers indirect communication: Offer specific communication scripts');
        parts.push('- Practice direct expression in low-stakes ways');
      }
    }

    return parts.join('\n');
  },
};

/**
 * Format response with source citations
 */
export function formatWithSources(response: string, sources: ChatSource[]): string {
  if (sources.length === 0) return response;

  const citationList = sources.map((source, idx) => {
    const parts = [`**[${idx + 1}] ${source.title}**`];

    if (source.author) {
      parts.push(`by ${source.author}`);
    }

    if (source.subSystemName) {
      parts.push(`(${source.subSystemName} SubSystem)`);
    }

    if (source.contentType) {
      parts.push(`_${source.contentType}_`);
    }

    if (source.highlightedText) {
      parts.push(`\n> "${source.highlightedText}"`);
    }

    if (source.url) {
      parts.push(`\n[View Source](${source.url})`);
    }

    return parts.join(' • ');
  }).join('\n\n');

  return `${response}\n\n---\n\n### Sources\n\n${citationList}`;
}

/**
 * Generate follow-up questions
 */
export function generateFollowUps(response: string, context: SearchContext): string[] {
  const followUps: string[] = [];

  // Based on focus areas mentioned
  if (context.relatedInteractions.length > 0) {
    const negativeInteraction = context.relatedInteractions.find(
      i => i.outcome === 'negative' || i.outcome === 'mixed'
    );
    if (negativeInteraction) {
      followUps.push(`How can I handle situations like: "${negativeInteraction.summary}"?`);
    }
  }

  // Based on insights
  if (context.matchingInsights.length > 0) {
    const insight = context.matchingInsights[0];
    followUps.push(`Tell me more about applying "${insight.title}" in my situation`);
  }

  // Based on content
  if (context.relevantContent.length > 1) {
    const secondSource = context.relevantContent[1];
    followUps.push(`What does "${secondSource.title}" say about this?`);
  }

  // Generic follow-ups
  if (followUps.length < 3) {
    followUps.push('What are concrete steps I can take today?');
    followUps.push('How does this relate to my attachment style?');
    followUps.push('What would this look like in practice?');
  }

  return followUps.slice(0, 3);
}

/**
 * Build tough love prompt additions
 */
export function buildToughLovePrompt(
  patterns: string[],
  contradictions: string[]
): string {
  const parts: string[] = ['\nTOUGH LOVE MODE ACTIVATED'];

  if (patterns.length > 0) {
    parts.push('\nDETECTED PATTERNS:');
    patterns.forEach(pattern => parts.push(`- ${pattern}`));
  }

  if (contradictions.length > 0) {
    parts.push('\nVALUE CONTRADICTIONS:');
    contradictions.forEach(contradiction => parts.push(`- ${contradiction}`));
  }

  parts.push('\nYour response should address these patterns directly and challenge the user to align with their values.');

  return parts.join('\n');
}
