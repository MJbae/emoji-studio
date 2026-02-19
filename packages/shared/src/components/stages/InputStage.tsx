import { useState, useId } from 'react';
import { Image as ImageIcon, Sparkles } from 'lucide-react';
import type { UserInput } from '@/types/domain';
import { Button } from '@/components/ui/Button';
import { cn } from '@/utils/cn';

interface InputStageProps {
  onSubmit: (input: UserInput) => void;
  initialData?: UserInput;
}

const LANGUAGES = ['Korean', 'Japanese', 'Traditional Chinese'] as const;

const LANG_META: Record<(typeof LANGUAGES)[number], { flag: string; native: string }> = {
  Korean: { flag: '🇰🇷', native: '한국어' },
  Japanese: { flag: '🇯🇵', native: '日本語' },
  'Traditional Chinese': { flag: '🇹🇼', native: '繁體中文' },
};

function InputStage({ onSubmit, initialData }: InputStageProps) {
  const [data, setData] = useState<UserInput>(
    initialData ?? { concept: '', referenceImage: null, language: 'Korean', noText: false },
  );
  const [preview, setPreview] = useState<string | null>(null);
  const conceptId = useId();
  const fileId = useId();

  const isValid = data.concept.trim().length >= 3;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setPreview(result);
      const base64 = result.split(',')[1] ?? null;
      setData((prev) => ({ ...prev, referenceImage: base64 }));
    };
    reader.readAsDataURL(file);
  };

  return (
    <section data-stage="input" className="max-w-2xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 text-primary rounded-full text-sm font-medium">
          <Sparkles size={14} />
          1단계
        </div>
        <h2 className="text-3xl font-bold text-text">스티커 세트 시작하기</h2>
        <p className="text-text-muted">캐릭터 컨셉을 설명하면 AI가 자동으로 생성합니다.</p>
      </div>

      <div className="bg-white p-8 rounded-2xl shadow-xs border border-slate-100 space-y-6">
        <div className="space-y-1.5">
          <label htmlFor={conceptId} className="block text-sm font-medium text-slate-700">
            캐릭터 컨셉 <span className="text-danger">*</span>
          </label>
          <textarea
            id={conceptId}
            value={data.concept}
            onChange={(e) => setData((prev) => ({ ...prev, concept: e.target.value }))}
            placeholder="예: 해바라기씨와 게임을 좋아하는 귀여운 통통한 햄스터"
            aria-label="Character concept description"
            data-testid="concept-textarea"
            className="w-full h-32 p-4 rounded-xl border border-slate-200 focus:border-primary focus:ring-3 focus:ring-primary/20 transition-all resize-none text-sm"
          />
          <p className="text-xs text-text-muted">
            {data.concept.length < 3
              ? `${3 - data.concept.length}자 더 필요`
              : `${data.concept.length}자`}
          </p>
        </div>

        <fieldset className="space-y-1.5">
          <legend className="block text-sm font-medium text-slate-700 mb-2">Target Language</legend>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" role="radiogroup" aria-label="Target language">
            {LANGUAGES.map((lang) => {
              const meta = LANG_META[lang];
              const isSelected = data.language === lang;

              return (
                <button
                  key={lang}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  aria-label={`Language: ${lang}`}
                  disabled={data.noText}
                  data-testid={`lang-${lang.toLowerCase().replace(/\s+/g, '-')}`}
                  onClick={() => setData((prev) => ({ ...prev, language: lang }))}
                  className={cn(
                    'p-3 rounded-lg border text-sm font-medium transition-all flex flex-col items-center gap-1',
                    isSelected
                      ? 'bg-primary/5 border-primary text-primary-dark'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-600',
                    data.noText && 'opacity-50 cursor-not-allowed bg-slate-100 hover:bg-slate-100 text-slate-400 border-slate-200',
                  )}
                >
                  <span className="text-lg grayscale-[0.5]">{meta.flag}</span>
                  <span>{meta.native}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="flex items-center justify-between p-4 rounded-lg border border-slate-200 bg-slate-50">
          <div>
            <p className="text-sm font-medium text-slate-700">텍스트 없는 스티커</p>
            <p className="text-xs text-text-muted mt-0.5">
              텍스트 없이 이미지만으로 스티커를 생성합니다 (Flash 모델 사용)
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={data.noText ?? false}
            aria-label="텍스트 없는 스티커 모드"
            data-testid="no-text-toggle"
            onClick={() => setData((prev) => ({ ...prev, noText: !prev.noText }))}
            className={cn(
              'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
              data.noText ? 'bg-primary' : 'bg-slate-300',
            )}
          >
            <span
              className={cn(
                'inline-block h-4 w-4 rounded-full bg-white transition-transform',
                data.noText ? 'translate-x-6' : 'translate-x-1',
              )}
            />
          </button>
        </div>

        <div className="space-y-1.5">
          <label htmlFor={fileId} className="block text-sm font-medium text-slate-700">
            참고 이미지 (선택사항)
          </label>
          <div
            className={cn(
              'mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-xl transition-colors cursor-pointer relative',
              'border-slate-200 hover:bg-slate-50',
            )}
          >
            <input
              id={fileId}
              type="file"
              accept="image/*"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={handleImageUpload}
              aria-label="Upload reference image"
              data-testid="reference-image-input"
            />
            <div className="text-center">
              {preview ? (
                <div>
                  <img
                    src={preview}
                    alt="Reference preview"
                    className="mx-auto h-40 object-contain rounded-lg"
                  />
                  <p className="mt-2 text-xs text-text-muted">클릭하여 변경</p>
                </div>
              ) : (
                <>
                  <ImageIcon className="mx-auto h-10 w-10 text-slate-400" />
                  <p className="mt-2 text-sm text-slate-600">
                    <span className="font-medium text-primary">업로드</span> 또는 드래그
                  </p>
                  <p className="text-xs text-text-muted">PNG, JPG 최대 10MB</p>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="pt-3">
          <Button
            onClick={() => onSubmit(data)}
            disabled={!isValid}
            className="w-full"
            size="lg"
            aria-label="Analyze concept and proceed"
            data-testid="analyze-btn"
          >
            컨셉 분석 →
          </Button>
        </div>
      </div>
    </section>
  );
}

export { InputStage };
export type { InputStageProps };
