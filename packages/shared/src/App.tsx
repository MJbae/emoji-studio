import { useState, useMemo, useCallback, useEffect } from 'react';
import { useAppStore } from '@/store/appStore';
import { useExposeApi } from '@/hooks/useExposeApi';
import type { WorkflowStage } from '@/store/slices/workflowSlice';
import type {
  UserInput,
  ProcessingOptions as ProcessingOptionsType,
  PlatformId,
  PlatformSpec,
  LanguageCode,
  LanguageEntry,
  Sticker,
  ProcessedImage,
  MetaResult,
  TextStyleOption,
} from '@/types/domain';

import {
  analyzeConcept,
  generateBaseCharacter,
  generateVisualVariation,
  extractCharacterSpec,
  generateEmoteIdeas,
  generateSingleEmote,
  generateMetadata,
  checkTextNaturalness,
} from '@/services/gemini/orchestrator';
import { processImageWithBgRemoval } from '@/services/image/backgroundRemoval';
import { performOutline } from '@/services/image/outlineGeneration';
import { generateStickerZip, generatePostProcessedZip } from '@/services/image/export';
import { VISUAL_STYLES } from '@/constants/styles';
import { TOTAL_STICKERS, CHUNK_SIZE, API_DELAY_MS } from '@/constants/platforms';
import { platform } from '@/platform/adapter';

import { AppShell } from '@/components/layout/AppShell';
import { StageStepper } from '@/components/layout/StageStepper';
import { ApiKeyModal } from '@/components/setup/ApiKeyModal';
import { useMigrateApiKey } from '@/hooks/useMigrateApiKey';
import { InputStage } from '@/components/stages/InputStage';
import { StrategyStage } from '@/components/stages/StrategyStage';
import { CharacterStage } from '@/components/stages/CharacterStage';
import { StickerBatchStage } from '@/components/stages/StickerBatchStage';
import { PostProcessStage } from '@/components/stages/PostProcessStage';
import { MetadataStage } from '@/components/stages/MetadataStage';
import { ExportStage } from '@/components/stages/ExportStage';

const PLATFORM_SPECS: Record<PlatformId, PlatformSpec> = {
  ogq_sticker: {
    label: 'OGQ Sticker',
    description: 'Kakao OGQ sticker format',
    count: 24,
    content: { width: 360, height: 360 },
    main: { width: 480, height: 480 },
    tab: { width: 120, height: 120 },
    fileNameFormat: (i: number) => `sticker_${String(i + 1).padStart(2, '0')}.png`,
  },
  line_sticker: {
    label: 'LINE Sticker',
    description: 'LINE sticker format',
    count: 40,
    content: { width: 370, height: 320 },
    main: { width: 240, height: 240 },
    tab: { width: 96, height: 74 },
    fileNameFormat: (i: number) => `${String(i + 1).padStart(2, '0')}.png`,
  },
  line_emoji: {
    label: 'LINE Emoji',
    description: 'LINE emoji format',
    count: 40,
    content: { width: 180, height: 180 },
    main: null,
    tab: { width: 96, height: 74 },
    fileNameFormat: (i: number) => `${String(i + 1).padStart(3, '0')}.png`,
  },
};

const LANGUAGES: LanguageEntry[] = [
  { code: 'en', label: 'English', flag: '🇺🇸', required: true, nativeName: 'English' },
  { code: 'ko', label: 'Korean', flag: '🇰🇷', required: false, nativeName: '한국어' },
  { code: 'ja', label: 'Japanese', flag: '🇯🇵', required: false, nativeName: '日本語' },
  {
    code: 'zh-TW',
    label: 'Traditional Chinese',
    flag: '🇹🇼',
    required: false,
    nativeName: '繁體中文',
  },
  {
    code: 'zh-CN',
    label: 'Simplified Chinese',
    flag: '🇨🇳',
    required: false,
    nativeName: '简体中文',
  },
];

function App() {
  useExposeApi();
  useMigrateApiKey();

  const apiKey = useAppStore((s) => s.apiKey);
  const keyHydrated = useAppStore((s) => s.keyHydrated);
  const loadApiKeyAsync = useAppStore((s) => s.loadApiKeyAsync);
  const setApiKeyAsync = useAppStore((s) => s.setApiKeyAsync);
  const stage = useAppStore((s) => s.stage);
  const mode = useAppStore((s) => s.mode);
  const setStage = useAppStore((s) => s.setStage);
  const nextStage = useAppStore((s) => s.nextStage);
  const prevStage = useAppStore((s) => s.prevStage);

  useEffect(() => {
    loadApiKeyAsync();
  }, [loadApiKeyAsync]);

  const strategy = useAppStore((s) => s.strategy);
  const mainImage = useAppStore((s) => s.mainImage);
  const characterSpec = useAppStore((s) => s.characterSpec);
  const stickers = useAppStore((s) => s.stickers);
  const setUserInput = useAppStore((s) => s.setUserInput);
  const metadata = useAppStore((s) => s.metadata);
  const defaultPlatform = useAppStore((s) => s.defaultPlatform);
  const setDefaultPlatform = useAppStore((s) => s.setDefaultPlatform);

  const [showApiModal, setShowApiModal] = useState(false);
  const [completedStages, setCompletedStages] = useState<Set<WorkflowStage>>(new Set());
  const [selectedImageIds, setSelectedImageIds] = useState<Set<string>>(new Set());
  const [processingOptions, setProcessingOptions] = useState<ProcessingOptionsType>({
    isBgRemovalEnabled: true,
    isOutlineEnabled: false,
    outlineStyle: 'white',
    outlineThickness: 4,
    outlineOpacity: 100,
  });
  const [metaLanguages, setMetaLanguages] = useState<Set<LanguageCode>>(new Set(['en']));
  const [naturalCheckLoading, setNaturalCheckLoading] = useState(false);
  const [excludedStickers, setExcludedStickers] = useState<Map<number, string>>(new Map());

  // Per-stage async state
  const [strategyLoading, setStrategyLoading] = useState(false);
  const [strategyError, setStrategyError] = useState<string | null>(null);
  const [characterLoading, setCharacterLoading] = useState(false);
  const [characterError, setCharacterError] = useState<string | null>(null);
  const [stickerGenerating, setStickerGenerating] = useState(false);
  const [postProcessing, setPostProcessing] = useState(false);
  const [metadataLoading, setMetadataLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [selectedMetaMap, setSelectedMetaMap] = useState<Map<LanguageCode, MetaResult>>(new Map());

  const hasApiKey = !!apiKey;

  const markCompleted = useCallback((s: WorkflowStage) => {
    setCompletedStages((prev) => new Set([...prev, s]));
  }, []);

  const handleInputSubmit = useCallback(
    (input: UserInput) => {
      setUserInput(input);
      markCompleted('input');
      nextStage();
    },
    [setUserInput, markCompleted, nextStage],
  );

  const handleStageClick = useCallback(
    (s: WorkflowStage) => {
      if (completedStages.has(s)) {
        setStage(s);
      }
    },
    [completedStages, setStage],
  );

  const gridItems = useMemo(
    () =>
      stickers
        .filter((s) => s.status === 'done' && s.imageUrl)
        .map((s) => ({
          id: String(s.id),
          src: `data:image/png;base64,${s.imageUrl}`,
          name: s.idea.expression,
        })),
    [stickers],
  );

  useEffect(() => {
    if (stage !== 'postprocess' || gridItems.length === 0) return;

    setSelectedImageIds(new Set(gridItems.map((i) => i.id)));

    async function runNaturalnessCheck() {
      setNaturalCheckLoading(true);
      setExcludedStickers(new Map());
      try {
        const state = useAppStore.getState();
        const doneStickers = state.stickers.filter((s) => s.status === 'done' && s.imageUrl);
        const images = doneStickers.map((s) => s.imageUrl!);
        const results = await checkTextNaturalness(images, state.userInput?.language ?? 'Korean');

        const excluded = new Map<number, string>();
        const excludedIds = new Set<string>();
        for (const r of results) {
          const sticker = doneStickers[r.index];
          if (!r.isNatural && sticker) {
            excluded.set(sticker.id, r.reason);
            excludedIds.add(String(sticker.id));
          }
        }

        setExcludedStickers(excluded);
        setSelectedImageIds((prev) => {
          const next = new Set(prev);
          excludedIds.forEach((id) => next.delete(id));
          return next;
        });
      } catch (e) {
        console.error('Text naturalness check failed:', e);
      } finally {
        setNaturalCheckLoading(false);
      }
    }

    runNaturalnessCheck();
  }, [stage, gridItems]);

  // ---------------------------------------------------------------------------
  // Strategy Stage — auto-trigger on entry
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (stage !== 'strategy' || strategy !== null || strategyLoading || strategyError) return;

    async function runAnalyzeConcept() {
      const userInput = useAppStore.getState().userInput;
      if (!userInput) return;
      setStrategyLoading(true);
      setStrategyError(null);
      try {
        const result = await analyzeConcept(userInput);
        useAppStore.getState().setStrategy(result);
      } catch (e) {
        setStrategyError(e instanceof Error ? e.message : '분석에 실패했습니다');
      } finally {
        setStrategyLoading(false);
      }
    }

    runAnalyzeConcept();
  }, [stage, strategy, strategyLoading, strategyError]);

  const retryStrategy = useCallback(() => {
    setStrategyError(null);
    useAppStore.setState({ strategy: null });
  }, []);

  // ---------------------------------------------------------------------------
  // Character Stage — auto-trigger on entry
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (stage !== 'character' || mainImage !== null || characterLoading || characterError) return;

    async function runCharacterGeneration() {
      const state = useAppStore.getState();
      const userInput = state.userInput;
      const currentStrategy = state.strategy;
      if (!userInput || !currentStrategy) return;
      setCharacterLoading(true);
      setCharacterError(null);
      try {
        const baseImage = await generateBaseCharacter(userInput);
        const styledImage = await generateVisualVariation(
          baseImage,
          currentStrategy.selectedVisualStyleIndex,
          userInput.language,
        );
        useAppStore.getState().setMainImage(styledImage);
        const spec = await extractCharacterSpec(styledImage, userInput.concept);
        useAppStore.getState().setCharacterSpec(spec);
      } catch (e) {
        setCharacterError(e instanceof Error ? e.message : '캐릭터 생성에 실패했습니다');
      } finally {
        setCharacterLoading(false);
      }
    }

    runCharacterGeneration();
  }, [stage, mainImage, characterLoading, characterError]);

  const regenerateCharacter = useCallback(() => {
    setCharacterError(null);
    useAppStore.setState({ mainImage: null, characterSpec: null });
  }, []);

  // ---------------------------------------------------------------------------
  // Sticker Batch Stage — auto-trigger on entry
  // ---------------------------------------------------------------------------
  const runStickerGeneration = useCallback(async () => {
    const state = useAppStore.getState();
    if (!state.userInput || !state.strategy || !state.mainImage || !state.characterSpec) return;
    setStickerGenerating(true);
    try {
      const isNoText = state.userInput.noText ?? false;
      const effectiveTextStyle: TextStyleOption = isNoText
        ? {
            id: 'no-text',
            title: 'No Text',
            colorDescription: '',
            styleDescription: 'Image only, no text',
            reasoning: 'User selected no-text mode',
            score: 0,
          }
        : state.strategy.selectedTextStyle;

      const selectedStyle = VISUAL_STYLES[state.strategy.selectedVisualStyleIndex];
      const ideas = await generateEmoteIdeas(
        state.userInput,
        effectiveTextStyle,
        selectedStyle?.name ?? 'Original',
        state.characterSpec,
        {
          salesReasoning: state.strategy.salesReasoning,
          culturalNotes: state.strategy.culturalNotes,
        },
      );
      // Initialize stickers with pending status
      const initialStickers: Sticker[] = ideas.map((idea) => ({
        id: idea.id,
        idea,
        imageUrl: null,
        status: 'pending' as const,
      }));
      state.setStickers(initialStickers);

      // Generate in chunks of CHUNK_SIZE
      for (let i = 0; i < ideas.length; i += CHUNK_SIZE) {
        const chunk = ideas.slice(i, i + CHUNK_SIZE);
        const promises = chunk.map(async (idea) => {
          useAppStore.getState().updateSticker(idea.id, { status: 'loading' });
          try {
            const imageData = await generateSingleEmote(
              idea,
              state.mainImage!,
              effectiveTextStyle,
              state.characterSpec!,
              isNoText,
            );
            useAppStore.getState().updateSticker(idea.id, { imageUrl: imageData, status: 'done' });
          } catch {
            useAppStore.getState().updateSticker(idea.id, { status: 'error' });
          }
        });
        await Promise.all(promises);
        // Delay between chunks
        if (i + CHUNK_SIZE < ideas.length) {
          await new Promise<void>((r) => setTimeout(r, API_DELAY_MS));
        }
      }
    } catch (e) {
      console.error('Sticker generation failed:', e);
    } finally {
      setStickerGenerating(false);
    }
  }, []);

  const stickerAutoTriggered = useState(false);
  useEffect(() => {
    if (stage !== 'stickers') {
      stickerAutoTriggered[1](false);
      return;
    }
    if (stickerAutoTriggered[0] || stickerGenerating || stickers.length > 0) return;
    stickerAutoTriggered[1](true);
    runStickerGeneration();
  }, [stage, stickerGenerating, stickers.length, runStickerGeneration]);

  const regenerateSingleSticker = useCallback(async (id: number) => {
    const state = useAppStore.getState();
    if (!state.mainImage || !state.strategy || !state.characterSpec) return;

    const sticker = state.stickers.find((s) => s.id === id);
    if (!sticker) return;

    const isNoText = state.userInput?.noText ?? false;
    const effectiveTextStyle: TextStyleOption = isNoText
      ? {
          id: 'no-text',
          title: 'No Text',
          colorDescription: '',
          styleDescription: 'Image only, no text',
          reasoning: 'User selected no-text mode',
          score: 0,
        }
      : state.strategy.selectedTextStyle;

    useAppStore.getState().updateSticker(id, { status: 'loading' });
    try {
      const imageData = await generateSingleEmote(
        sticker.idea,
        state.mainImage,
        effectiveTextStyle,
        state.characterSpec,
        isNoText,
      );
      useAppStore.getState().updateSticker(id, { imageUrl: imageData, status: 'done' });
    } catch {
      useAppStore.getState().updateSticker(id, { status: 'error' });
    }
  }, []);

  const editStickerIdea = useCallback(
    async (id: number, updates: { imagePrompt?: string; text?: string }) => {
      const state = useAppStore.getState();
      const sticker = state.stickers.find((s) => s.id === id);
      if (!sticker) return;

      const updatedIdea = { ...sticker.idea, ...updates };
      state.updateSticker(id, { idea: updatedIdea });

      if (!state.mainImage || !state.strategy || !state.characterSpec) return;

      const isNoText = state.userInput?.noText ?? false;
      const effectiveTextStyle: TextStyleOption = isNoText
        ? {
            id: 'no-text',
            title: 'No Text',
            colorDescription: '',
            styleDescription: 'Image only, no text',
            reasoning: 'User selected no-text mode',
            score: 0,
          }
        : state.strategy.selectedTextStyle;

      state.updateSticker(id, { status: 'loading' });
      try {
        const imageData = await generateSingleEmote(
          updatedIdea,
          state.mainImage,
          effectiveTextStyle,
          state.characterSpec,
          isNoText,
        );
        useAppStore.getState().updateSticker(id, { imageUrl: imageData, status: 'done' });
      } catch {
        useAppStore.getState().updateSticker(id, { status: 'error' });
      }
    },
    [],
  );

  const handleMetaSelect = useCallback((result: MetaResult) => {
    setSelectedMetaMap((prev) => {
      const next = new Map(prev);
      const existing = next.get(result.language);
      if (existing && existing.optionType === result.optionType) {
        next.delete(result.language);
      } else {
        next.set(result.language, result);
      }
      return next;
    });
  }, []);

  const toggleMetaLanguage = useCallback((lang: LanguageCode) => {
    setMetaLanguages((prev) => {
      const next = new Set(prev);
      if (next.has(lang)) {
        next.delete(lang);
      } else {
        next.add(lang);
      }
      return next;
    });
  }, []);

  // ---------------------------------------------------------------------------
  // PostProcess Stage — apply processing + preview
  // ---------------------------------------------------------------------------
  const applyPostProcessing = useCallback(async () => {
    setPostProcessing(true);
    try {
      const state = useAppStore.getState();
      const selectedStickers = state.stickers.filter(
        (s) => s.status === 'done' && s.imageUrl && selectedImageIds.has(String(s.id)),
      );
      const results: ProcessedImage[] = [];
      for (const sticker of selectedStickers) {
        let data = `data:image/png;base64,${sticker.imageUrl}`;
        if (processingOptions.isBgRemovalEnabled) {
          data = await processImageWithBgRemoval(data);
        }
        if (processingOptions.isOutlineEnabled && processingOptions.outlineStyle !== 'none') {
          data = await performOutline(
            data,
            processingOptions.outlineStyle,
            processingOptions.outlineThickness,
            processingOptions.outlineOpacity / 100,
          );
        }
        results.push({ id: String(sticker.id), name: sticker.idea.expression, data });
      }
      state.setProcessedImages(results);
    } finally {
      setPostProcessing(false);
    }
  }, [selectedImageIds, processingOptions]);

  // Preview: generate preview using the first selected image
  useEffect(() => {
    if (stage !== 'postprocess') {
      setPreviewSrc(null);
      return;
    }

    if (selectedImageIds.size === 0) {
      setPreviewSrc(null);
      return;
    }

    const selectedId = [...selectedImageIds][0]!;
    const sticker = stickers.find(
      (s) => String(s.id) === selectedId && s.status === 'done' && s.imageUrl,
    );
    if (!sticker) {
      setPreviewSrc(null);
      return;
    }

    let cancelled = false;

    async function generatePreview() {
      let data = `data:image/png;base64,${sticker!.imageUrl}`;
      try {
        if (processingOptions.isBgRemovalEnabled) {
          data = await processImageWithBgRemoval(data);
        }
        if (processingOptions.isOutlineEnabled && processingOptions.outlineStyle !== 'none') {
          data = await performOutline(
            data,
            processingOptions.outlineStyle,
            processingOptions.outlineThickness,
            processingOptions.outlineOpacity / 100,
          );
        }
        if (!cancelled) {
          setPreviewSrc(data);
        }
      } catch {
        if (!cancelled) {
          setPreviewSrc(null);
        }
      }
    }

    generatePreview();

    return () => {
      cancelled = true;
    };
  }, [stage, selectedImageIds, stickers, processingOptions]);

  // ---------------------------------------------------------------------------
  // Metadata Stage
  // ---------------------------------------------------------------------------
  const runMetadataGeneration = useCallback(async () => {
    setMetadataLoading(true);
    try {
      const state = useAppStore.getState();
      const validStickers = state.stickers.filter((s) => s.status === 'done' && s.imageUrl);
      const sampleImages = validStickers.slice(0, 6).map((s) => s.imageUrl!);
      const allResults: MetaResult[] = [];
      for (const lang of metaLanguages) {
        const results = await generateMetadata(
          sampleImages,
          lang,
          LANGUAGES,
          state.strategy,
          state.characterSpec,
        );
        allResults.push(...results);
      }
      state.setMetadata(allResults);
    } catch (e) {
      console.error('Metadata generation failed:', e);
    } finally {
      setMetadataLoading(false);
    }
  }, [metaLanguages]);

  const regenerateMetadata = useCallback(() => {
    useAppStore.getState().setMetadata([]);
    runMetadataGeneration();
  }, [runMetadataGeneration]);

  // ---------------------------------------------------------------------------
  // Export Stage
  // ---------------------------------------------------------------------------
  const runExport = useCallback(async () => {
    setExporting(true);
    setExportProgress(0);
    try {
      const state = useAppStore.getState();
      const processedImages = state.processedImages;
      let blob: Blob;
      setExportProgress(30);
      const selectedMetaArray = Array.from(selectedMetaMap.values());
      const metaForExport = selectedMetaArray.length > 0 ? selectedMetaArray : undefined;
      if (processedImages.length > 0) {
        blob = await generatePostProcessedZip(processedImages, defaultPlatform, metaForExport);
      } else {
        const mainImg = state.mainImage;
        if (!mainImg) throw new Error('내보낼 이미지가 없습니다');
        blob = await generateStickerZip(state.stickers, defaultPlatform, mainImg, metaForExport);
      }
      setExportProgress(80);
      const arrayBuffer = await blob.arrayBuffer();
      const data = new Uint8Array(arrayBuffer);
      const fileName = `emoticon_${defaultPlatform}_${Date.now()}.zip`;
      await platform.saveFile(data, fileName);
      setExportProgress(100);
    } catch (e) {
      console.error('Export failed:', e);
    } finally {
      setExporting(false);
    }
  }, [defaultPlatform, selectedMetaMap]);

  // ---------------------------------------------------------------------------

  if (keyHydrated === 'unknown') {
    return null;
  }

  const showSetup = stage === 'setup' && !hasApiKey;

  const renderStage = () => {
    if (stage === 'setup') {
      if (hasApiKey) {
        setStage('input');
        return null;
      }
      return null;
    }

    switch (stage) {
      case 'input':
        return (
          <InputStage
            onSubmit={handleInputSubmit}
            initialData={useAppStore.getState().userInput ?? undefined}
          />
        );
      case 'strategy':
        return (
          <StrategyStage
            strategy={strategy}
            loading={strategyLoading}
            error={strategyError}
            onContinue={() => {
              markCompleted('strategy');
              nextStage();
            }}
            onRetry={retryStrategy}
            onBack={prevStage}
          />
        );
      case 'character':
        return (
          <CharacterStage
            characterImage={mainImage}
            characterSpec={characterSpec}
            loading={characterLoading}
            error={characterError}
            onRegenerate={regenerateCharacter}
            onContinue={() => {
              markCompleted('character');
              nextStage();
            }}
            onBack={prevStage}
          />
        );
      case 'stickers':
        return (
          <StickerBatchStage
            stickers={stickers}
            totalCount={TOTAL_STICKERS}
            isGenerating={stickerGenerating}
            onRegenerate={regenerateSingleSticker}
            onEditIdea={editStickerIdea}
            onContinue={() => {
              markCompleted('stickers');
              nextStage();
            }}
            onBack={prevStage}
          />
        );
      case 'postprocess':
        return (
          <PostProcessStage
            selectedIds={selectedImageIds}
            processingOptions={processingOptions}
            onOptionsChange={setProcessingOptions}
            previewSrc={previewSrc}
            isProcessing={postProcessing}
            naturalCheckLoading={naturalCheckLoading}
            excludedStickers={excludedStickers}
            onContinue={async () => {
              await applyPostProcessing();
              markCompleted('postprocess');
              nextStage();
            }}
            onBack={prevStage}
          />
        );
      case 'metadata':
        return (
          <MetadataStage
            results={metadata}
            languages={LANGUAGES}
            selectedLanguages={metaLanguages}
            onLanguageToggle={toggleMetaLanguage}
            loading={metadataLoading}
            onGenerate={runMetadataGeneration}
            onSelect={handleMetaSelect}
            selectedMetaMap={selectedMetaMap}
            onRegenerate={regenerateMetadata}
            onContinue={() => {
              markCompleted('metadata');
              nextStage();
            }}
            onBack={prevStage}
          />
        );
      case 'export':
        return (
          <ExportStage
            platforms={PLATFORM_SPECS}
            selectedPlatform={defaultPlatform}
            onPlatformChange={setDefaultPlatform}
            stickerCount={stickers.filter((s) => s.status === 'done').length}
            isExporting={exporting}
            exportProgress={exportProgress}
            onExport={runExport}
            onBack={prevStage}
          />
        );
      default:
        return null;
    }
  };

  return (
    <AppShell hasApiKey={hasApiKey} onOpenSettings={() => setShowApiModal(true)}>
      <ApiKeyModal
        open={showSetup || showApiModal}
        onSave={(key) => {
          setApiKeyAsync(key);
          setShowApiModal(false);
          if (stage === 'setup') {
            setStage('input');
          }
        }}
        onClose={() => setShowApiModal(false)}
        dismissable={hasApiKey}
      />

      {stage !== 'setup' && (
        <StageStepper
          currentStage={stage}
          mode={mode}
          completedStages={completedStages}
          onStageClick={handleStageClick}
        />
      )}

      {renderStage()}
    </AppShell>
  );
}

export default App;
