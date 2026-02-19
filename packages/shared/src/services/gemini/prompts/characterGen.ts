import type { CharacterSpec, EmoteIdea, TextStyleOption } from '@/types/domain';
import { getCulturalContext } from './expertPanel';

export function buildBaseCharacterPrompt(
  concept: string,
  language: string,
  hasReferenceImage: boolean,
): string {
  const culturalContext = getCulturalContext(language);

  return `
Create a character design for LINE messenger stickers.
Character concept: ${concept}
${hasReferenceImage ? 'Reference image provided. Use it as the primary visual reference for the character design.' : ''}

${culturalContext}

CRITICAL REQUIREMENTS:
1. OUTPUT EXACTLY ONE SINGLE CHARACTER. No character sheets, no multiple views.
2. Face/upper body focus, Large head-to-body ratio.
3. THICK, BOLD outlines. High contrast colors.
4. SOLID WHITE BACKGROUND. Do not use transparency.
5. Cute but expressive. Optimized for LINE messenger sticker sales.
DO NOT include any text.
`;
}

export function buildVisualVariationPrompt(
  promptPrefix: string,
  language: string,
): string {
  const culturalContext = getCulturalContext(language);

  return `
${promptPrefix}

${culturalContext}

CRITICAL GENERATION RULES:
1. GENERATE EXACTLY ONE SINGLE CHARACTER centered in the frame.
2. DO NOT create a character sheet, grid, or multiple poses.
3. SOLID WHITE BACKGROUND (No transparency, no patterns).
4. High contrast, clean edges, thick lines suitable for small LINE stickers.
5. Design must be optimized for LINE messenger sticker sales appeal.

Expression: Excited/Happy (Representative Emote)
`;
}

export function buildExtractCharacterSpecPrompt(concept: string): string {
  return `
Analyze this character image and extract a PRECISE character specification for consistent reproduction.
The character concept is: ${concept}

This spec will be used to maintain IDENTICAL character appearance across 45 stickers. Be extremely specific.

Extract:
1. PHYSICAL DESCRIPTION: Body shape (round/slim/square), proportions (head-to-body ratio like 1:1 or 2:1), limb style (stubby/long/noodle), overall silhouette shape.
2. FACIAL FEATURES (CRITICAL FOR CONSISTENCY):
   - Eye shape (round/oval/dot/almond), eye size (large/medium/small relative to face), eye color, pupil style (dot/highlight/star), eye spacing
   - Nose shape (button/triangle/dot/absent)
   - Mouth style (simple curve/cat-mouth/W-shape/dot), default mouth size
   - Eyebrow style (thin/thick/absent/dot)
   - Ear shape and position (if applicable)
   - Cheek marks (blush circles/lines/none), their color
   - Any facial accessories (glasses, freckles, whiskers, etc.)
3. COLOR PALETTE: List EVERY color used with location (e.g., "#FFB6C1 pink - body, #FFFFFF white - belly, #FF69B4 hot pink - cheeks, #000000 black - outlines and eyes")
4. DISTINGUISHING FEATURES: Unique elements that define this character and MUST appear in every sticker (e.g., "red bow on left ear, striped tail, star-shaped belly mark")
5. ART STYLE: Line thickness (thin 1px/medium 2-3px/thick 4px+), outline color, shading style (flat/cel-shaded/gradient), detail level (minimal/moderate/detailed)

Be EXTREMELY specific about facial features - they are the #1 source of inconsistency.
`;
}

function getLanguageSpecificCategories(language: string): string {
  switch (language) {
    case 'Korean':
      return `
Popular Korean LINE sticker categories for high sales:
- Aegyo/Cute reactions
- Daily greetings
- Food & eating reactions
- Work/study life
- K-culture expressions`;
    case 'Japanese':
      return `
Popular Japanese LINE sticker categories for high sales:
- Polite responses & greetings
- Kawaii emotional reactions
- Seasonal & event greetings
- Workplace communication
- Trendy internet expressions`;
    case 'Traditional Chinese':
      return `
Popular Traditional Chinese LINE sticker categories for high sales:
- Festival & lucky greetings
- Humorous daily reactions
- Trendy slang expressions
- Food & lifestyle
- Emotional emphasis`;
    default:
      return '';
  }
}

export function buildEmoteIdeasPrompt(
  concept: string,
  language: string,
  textStyle: TextStyleOption,
  visualStyleName: string,
  characterSpec: CharacterSpec,
  strategyContext: { salesReasoning: string; culturalNotes: string },
): string {
  const isNoText = textStyle.id === 'no-text';
  const culturalContext = getCulturalContext(language);
  const languageSpecificCategories = getLanguageSpecificCategories(language);

  return `
Generate 45 unique emote/sticker ideas optimized for LINE messenger sales.
Character: ${concept}
Style: ${visualStyleName}
Text Style: ${isNoText ? 'NO TEXT (Image only)' : textStyle.styleDescription}
Language: ${language}

CHARACTER REFERENCE (use this to write accurate imagePrompt descriptions):
- Appearance: ${characterSpec.physicalDescription}
- Colors: ${characterSpec.colorPalette}
- Key Features: ${characterSpec.distinguishingFeatures}
- Art Style: ${characterSpec.artStyle}

${culturalContext}

${languageSpecificCategories}

Focus on expressions and scenarios that drive the highest engagement and purchases on LINE messenger.
Think about what makes users want to BUY and USE these stickers in daily conversations.

Categories to distribute (45 total):
1. Basic Reactions (12) - Universal emotions that get used most frequently
2. Daily Communication (11) - Greetings, responses, and conversation starters
3. Emotional Emphasis (11) - Strong feelings and dramatic reactions
4. Trending/Cultural (6) - Market-specific trends and cultural references
5. Special Situations (5) - Unique scenarios that make the pack stand out

STRATEGY DIRECTION (each imagePrompt MUST reflect this):
- Sales Strategy: ${strategyContext.salesReasoning}
- Cultural Optimization: ${strategyContext.culturalNotes}

Each imagePrompt must be a SINGLE SENTENCE that:
1. Describes the character (referencing the CHARACTER REFERENCE above) doing a specific action/expression
2. Incorporates the strategy direction naturally (e.g., cultural appeal, sales-driving elements)
3. Is vivid enough to guide image generation but not overly detailed

CRITICAL RULES:
${isNoText ? '- TEXT FIELD MUST BE EMPTY STRING ("") FOR ALL ITEMS. DO NOT GENERATE TEXT.' : `- Text must be 1-4 characters MAX in ${language}.`}
- Distinct silhouettes for each emote.
- Exaggerated expressions for visibility at small sizes.
- Prioritize stickers that users will send MOST OFTEN in LINE conversations.
- For EACH emote, write an "imagePrompt": a SINGLE SENTENCE that captures both the sticker scene AND the strategy direction.
`;
}

export function buildSingleEmotePrompt(
  idea: EmoteIdea,
  characterSpec: CharacterSpec,
  textStyle: TextStyleOption,
): string {
  const isNoText = textStyle.id === 'no-text';

  const textInstruction = isNoText
    ? 'ABSOLUTELY NO TEXT. PURE IMAGE ONLY.'
    : idea.text
      ? `Text overlay: "${idea.text}". Text MUST BE HUGE, BOLD, and highly readable even at small sticker size. Text MUST be rendered IN FRONT OF the character, ON TOP of everything, clearly visible and NEVER hidden behind or occluded by any part of the character. Place text in a prominent position (top or bottom of the sticker). Color: ${textStyle.colorDescription}.`
      : 'No text overlay for this sticker.';

  return `
Generate a LINE messenger sticker.

CHARACTER IDENTITY (MUST MAINTAIN EXACTLY):
- Appearance: ${characterSpec.physicalDescription}
- Colors: ${characterSpec.colorPalette}
- Key Features: ${characterSpec.distinguishingFeatures}
- Art Style: ${characterSpec.artStyle}

FACIAL FEATURES LOCK (CRITICAL - DO NOT DEVIATE):
${characterSpec.facialFeatures}
The face structure, eye shape, nose, mouth, and all facial details MUST be IDENTICAL to the reference image. Only the EXPRESSION changes (e.g., smile vs frown), never the underlying facial structure.

STICKER SCENE: ${idea.imagePrompt}
${textInstruction}

RULES:
1. The character MUST look identical to the reference image - same colors, proportions, facial features.
2. Only the expression, pose, and action should change - NOT the character design.
3. SOLID WHITE BACKGROUND. Square 1:1. SINGLE CHARACTER ONLY.
`;
}
