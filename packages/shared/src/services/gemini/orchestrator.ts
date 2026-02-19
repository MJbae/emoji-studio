import { Type } from '@google/genai';
import type {
  UserInput,
  PersonaInsight,
  LLMStrategy,
  CharacterSpec,
  EmoteIdea,
  TextStyleOption,
  MetaResult,
  LanguageCode,
  LanguageEntry,
} from '@/types/domain';
import { VISUAL_STYLES } from '@/constants/styles';
import { generateText, generateImage, generateWithFlash } from './client';
import {
  buildMarketAnalystPrompt,
  buildArtDirectorPrompt,
  buildCulturalExpertPrompt,
  buildSynthesisPrompt,
} from './prompts/expertPanel';
import {
  buildBaseCharacterPrompt,
  buildVisualVariationPrompt,
  buildExtractCharacterSpecPrompt,
  buildEmoteIdeasPrompt,
  buildSingleEmotePrompt,
} from './prompts/characterGen';
import { buildMetadataSystemInstruction, metadataResponseSchema } from './prompts/metadata';

function buildContentsWithOptionalImage(
  prompt: string,
  referenceImage: string | null,
):
  | string
  | { parts: Array<{ inlineData: { mimeType: string; data: string } } | { text: string }> } {
  if (referenceImage) {
    return {
      parts: [{ inlineData: { mimeType: 'image/png', data: referenceImage } }, { text: prompt }],
    };
  }
  return prompt;
}

async function consultMarketAnalyst(input: UserInput, useFlash = false): Promise<PersonaInsight> {
  const prompt = buildMarketAnalystPrompt(input.concept, input.language);
  const generateFn = useFlash ? generateWithFlash : generateText;
  const response = await generateFn({
    contents: buildContentsWithOptionalImage(prompt, input.referenceImage),
  });

  const text = response.text;
  if (!text) throw new Error('No response from Market Analyst persona');
  return { persona: 'Market Analyst', analysis: text };
}

async function consultArtDirector(
  input: UserInput,
  marketInsight: string,
  useFlash = false,
): Promise<PersonaInsight> {
  const prompt = buildArtDirectorPrompt(
    input.concept,
    input.language,
    marketInsight,
    VISUAL_STYLES,
  );
  const generateFn = useFlash ? generateWithFlash : generateText;
  const response = await generateFn({
    contents: buildContentsWithOptionalImage(prompt, input.referenceImage),
  });

  const text = response.text;
  if (!text) throw new Error('No response from Art Director persona');
  return { persona: 'Art Director', analysis: text };
}

async function consultCulturalExpert(input: UserInput, useFlash = false): Promise<PersonaInsight> {
  const prompt = buildCulturalExpertPrompt(input.concept, input.language);
  const generateFn = useFlash ? generateWithFlash : generateText;
  const response = await generateFn({ contents: prompt });

  const text = response.text;
  if (!text) throw new Error('No response from Cultural Expert persona');
  return { persona: 'Cultural Expert', analysis: text };
}

async function synthesizeStrategy(
  input: UserInput,
  insights: PersonaInsight[],
  useFlash = false,
): Promise<LLMStrategy> {
  const insightsSummary = insights.map((i) => `=== ${i.persona} ===\n${i.analysis}`).join('\n\n');

  const prompt = buildSynthesisPrompt(
    input.concept,
    input.language,
    insightsSummary,
    VISUAL_STYLES,
  );

  const generateFn = useFlash ? generateWithFlash : generateText;
  const response = await generateFn({
    contents: buildContentsWithOptionalImage(prompt, input.referenceImage),
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          selectedVisualStyleIndex: { type: Type.INTEGER },
          textStyle: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              title: { type: Type.STRING },
              colorDescription: { type: Type.STRING },
              styleDescription: { type: Type.STRING },
              reasoning: { type: Type.STRING },
              score: { type: Type.NUMBER },
            },
            required: ['id', 'title', 'colorDescription', 'styleDescription', 'reasoning', 'score'],
          },
          culturalNotes: { type: Type.STRING },
          salesReasoning: { type: Type.STRING },
        },
        required: ['selectedVisualStyleIndex', 'textStyle', 'culturalNotes', 'salesReasoning'],
      },
    },
  });

  const text = response.text;
  if (!text) throw new Error('No response from synthesis step');

  const data = JSON.parse(text) as {
    selectedVisualStyleIndex: number;
    textStyle: {
      id: string;
      title: string;
      colorDescription: string;
      styleDescription: string;
      reasoning: string;
      score: number;
    };
    culturalNotes: string;
    salesReasoning: string;
  };

  const styleIndex = Math.max(0, Math.min(4, data.selectedVisualStyleIndex));

  return {
    selectedVisualStyleIndex: styleIndex,
    selectedTextStyle: {
      id: data.textStyle.id,
      title: data.textStyle.title,
      colorDescription: data.textStyle.colorDescription,
      styleDescription: data.textStyle.styleDescription,
      reasoning: data.textStyle.reasoning,
      score: data.textStyle.score,
    },
    culturalNotes: data.culturalNotes,
    salesReasoning: data.salesReasoning,
    personaInsights: insights,
  };
}

export async function analyzeConcept(input: UserInput): Promise<LLMStrategy> {
  const useFlash = input.noText ?? false;
  const marketInsight = await consultMarketAnalyst(input, useFlash);

  const [artInsight, culturalInsight] = await Promise.all([
    consultArtDirector(input, marketInsight.analysis, useFlash),
    consultCulturalExpert(input, useFlash),
  ]);

  return synthesizeStrategy(input, [marketInsight, artInsight, culturalInsight], useFlash);
}

export async function extractCharacterSpec(
  mainImage: string,
  concept: string,
): Promise<CharacterSpec> {
  const prompt = buildExtractCharacterSpecPrompt(concept);

  const response = await generateText({
    contents: {
      parts: [{ inlineData: { mimeType: 'image/png', data: mainImage } }, { text: prompt }],
    },
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          physicalDescription: { type: Type.STRING },
          facialFeatures: { type: Type.STRING },
          colorPalette: { type: Type.STRING },
          distinguishingFeatures: { type: Type.STRING },
          artStyle: { type: Type.STRING },
        },
        required: [
          'physicalDescription',
          'facialFeatures',
          'colorPalette',
          'distinguishingFeatures',
          'artStyle',
        ],
      },
    },
  });

  const text = response.text;
  if (!text) throw new Error('Failed to extract character spec from image');

  const data = JSON.parse(text) as CharacterSpec;
  return {
    physicalDescription: data.physicalDescription,
    facialFeatures: data.facialFeatures,
    colorPalette: data.colorPalette,
    distinguishingFeatures: data.distinguishingFeatures,
    artStyle: data.artStyle,
  };
}

export async function generateBaseCharacter(input: UserInput): Promise<string> {
  const prompt = buildBaseCharacterPrompt(input.concept, input.language, !!input.referenceImage);

  const response = await generateImage({
    contents: buildContentsWithOptionalImage(prompt, input.referenceImage),
    config: {
      imageConfig: { aspectRatio: '1:1', imageSize: '1K' },
    },
  });

  for (const part of response.candidates?.[0]?.content?.parts ?? []) {
    if (part.inlineData?.data) {
      return part.inlineData.data;
    }
  }
  throw new Error('Failed to generate base image');
}

export async function generateVisualVariation(
  baseImage: string,
  styleIndex: number,
  language: string,
): Promise<string> {
  const style = VISUAL_STYLES[styleIndex];
  if (!style) throw new Error(`Invalid style index: ${styleIndex}`);

  const prompt = buildVisualVariationPrompt(style.promptPrefix, language);

  const response = await generateImage({
    contents: {
      parts: [{ inlineData: { mimeType: 'image/png', data: baseImage } }, { text: prompt }],
    },
    config: {
      imageConfig: { aspectRatio: '1:1', imageSize: '1K' },
    },
  });

  for (const part of response.candidates?.[0]?.content?.parts ?? []) {
    if (part.inlineData?.data) {
      return part.inlineData.data;
    }
  }
  throw new Error(`Failed to generate style ${style.name}`);
}

export async function generateEmoteIdeas(
  input: UserInput,
  textStyle: TextStyleOption,
  visualStyleName: string,
  characterSpec: CharacterSpec,
  strategyContext: { salesReasoning: string; culturalNotes: string },
): Promise<EmoteIdea[]> {
  const prompt = buildEmoteIdeasPrompt(
    input.concept,
    input.language,
    textStyle,
    visualStyleName,
    characterSpec,
    strategyContext,
  );

  const response = await generateText({
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          ideas: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.INTEGER },
                expression: { type: Type.STRING },
                action: { type: Type.STRING },
                text: { type: Type.STRING },
                category: { type: Type.STRING },
                useCase: { type: Type.STRING },
                imagePrompt: { type: Type.STRING },
              },
              required: [
                'id',
                'expression',
                'action',
                'text',
                'category',
                'useCase',
                'imagePrompt',
              ],
            },
          },
        },
      },
    },
  });

  const text = response.text;
  if (!text) throw new Error('Failed to generate ideas');
  const data = JSON.parse(text) as { ideas: EmoteIdea[] };
  return data.ideas;
}

export async function generateSingleEmote(
  idea: EmoteIdea,
  referenceImage: string,
  textStyle: TextStyleOption,
  characterSpec: CharacterSpec,
  useFlash?: boolean,
): Promise<string> {
  const prompt = buildSingleEmotePrompt(idea, characterSpec, textStyle);

  const generateFn = useFlash ? generateWithFlash : generateImage;
  const response = await generateFn({
    contents: {
      parts: [{ inlineData: { mimeType: 'image/png', data: referenceImage } }, { text: prompt }],
    },
    config: useFlash ? {} : { imageConfig: { aspectRatio: '1:1', imageSize: '1K' } },
  });

  for (const part of response.candidates?.[0]?.content?.parts ?? []) {
    if (part.inlineData?.data) {
      return part.inlineData.data;
    }
  }
  throw new Error('Failed to generate sticker image');
}

export async function checkTextNaturalness(
  stickerImages: string[],
  language: string,
): Promise<{ index: number; isNatural: boolean; reason: string }[]> {
  const BATCH_SIZE = 6;
  const allResults: { index: number; isNatural: boolean; reason: string }[] = [];

  for (let i = 0; i < stickerImages.length; i += BATCH_SIZE) {
    const batch = stickerImages.slice(i, i + BATCH_SIZE);
    const batchSize = batch.length;

    const prompt = `Analyze the text in each sticker image. Check for:
1. Spelling/grammar correctness in ${language}
2. Cultural naturalness (does the text feel native?)
3. Readability (is the text clear and legible?)

For each image (numbered 1 to ${batchSize}), respond with:
- isNatural: true/false
- reason: brief explanation (in Korean)

If there is NO text in the image, mark it as isNatural: true.
Only mark isNatural: false if the text has clear errors or is culturally unnatural.`;

    const contents = {
      parts: [
        ...batch.map((image) => ({
          inlineData: { mimeType: 'image/png' as const, data: image },
        })),
        { text: prompt },
      ],
    };

    const response = await generateWithFlash({
      contents,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            results: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  imageIndex: { type: Type.INTEGER },
                  isNatural: { type: Type.BOOLEAN },
                  reason: { type: Type.STRING },
                },
                required: ['imageIndex', 'isNatural', 'reason'],
              },
            },
          },
          required: ['results'],
        },
      },
    });

    const text = response.text;
    if (!text) continue;

    const data = JSON.parse(text) as {
      results: { imageIndex: number; isNatural: boolean; reason: string }[];
    };

    for (const result of data.results) {
      allResults.push({
        index: i + result.imageIndex - 1,
        isNatural: result.isNatural,
        reason: result.reason,
      });
    }
  }

  return allResults;
}

export async function generateMetadata(
  stickerImages: string[],
  targetLanguage: LanguageCode,
  languages: LanguageEntry[],
  strategy?: LLMStrategy | null,
  characterSpec?: CharacterSpec | null,
): Promise<MetaResult[]> {
  const systemInstruction = buildMetadataSystemInstruction(
    targetLanguage,
    languages,
    strategy,
    characterSpec,
  );

  const representativeImages = stickerImages.slice(0, 6);

  const contents = {
    parts: [
      ...representativeImages.map((image) => ({
        inlineData: { mimeType: 'image/png', data: image },
      })),
      {
        text: 'Analyze these sticker images and generate three distinct metadata options (personality focus, utility focus, and creative focus) optimized for platform discovery and sales.',
      },
    ],
  };

  const response = await generateWithFlash({
    contents,
    config: {
      systemInstruction,
      responseMimeType: 'application/json',
      responseSchema: metadataResponseSchema,
    },
  });

  const text = response.text;
  if (!text) throw new Error('Failed to generate metadata');

  const data = JSON.parse(text) as {
    options: Array<{
      optionType: 'personality' | 'utility' | 'creative';
      title: string;
      description: string;
      tags: string[];
      evaluation: {
        naturalness: number;
        tone: number;
        searchability: number;
        creativity: number;
      };
      reasoning: string;
    }>;
  };

  return data.options.map((option) => ({
    language: targetLanguage,
    optionType: option.optionType,
    title: option.title,
    description: option.description,
    tags: option.tags,
    evaluation: option.evaluation,
    reasoning: option.reasoning,
  }));
}
