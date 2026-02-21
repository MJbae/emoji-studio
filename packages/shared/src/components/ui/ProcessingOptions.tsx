import { useId } from 'react';
import { Wand2, Layers } from 'lucide-react';
import type { ProcessingOptions as ProcessingOptionsType, OutlineStyle } from '@/types/domain';
import { cn } from '@/utils/cn';

interface ProcessingOptionsProps {
  options: ProcessingOptionsType;
  onChange: (options: ProcessingOptionsType) => void;
}

function Toggle({
  checked,
  onToggle,
  label,
}: {
  checked: boolean;
  onToggle: () => void;
  label: string;
}) {
  const id = useId();

  return (
    <div className="flex items-center justify-between">
      <label htmlFor={id} className="text-slate-700 text-sm font-medium cursor-pointer">
        {label}
      </label>
      <button
        id={id}
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={onToggle}
        data-testid={`toggle-${label.toLowerCase().replace(/\s+/g, '-')}`}
        className={cn(
          'w-11 h-6 rounded-full transition-colors relative',
          checked ? 'bg-primary' : 'bg-slate-300',
        )}
      >
        <div
          className={cn(
            'w-4 h-4 bg-white rounded-full absolute top-1 transition-transform',
            checked ? 'translate-x-6' : 'translate-x-1',
          )}
        />
      </button>
    </div>
  );
}

function ProcessingOptions({ options, onChange }: ProcessingOptionsProps) {
  const thicknessId = useId();
  const opacityId = useId();

  const update = <K extends keyof ProcessingOptionsType>(
    key: K,
    value: ProcessingOptionsType[K],
  ) => {
    onChange({ ...options, [key]: value });
  };

  const outlineStyles: { value: OutlineStyle; label: string; dotClass: string }[] = [
    { value: 'white', label: '흰색', dotClass: 'bg-white border border-slate-300' },
    { value: 'black', label: '검정', dotClass: 'bg-black' },
  ];

  return (
    <div className="space-y-5">
      <section className="bg-white p-5 rounded-xl border border-slate-200 space-y-3">
        <h3 className="font-semibold text-sm flex items-center gap-2 text-slate-800">
          <Wand2 size={16} className="text-primary" />
          정리
        </h3>
        <Toggle
          checked={options.isBgRemovalEnabled}
          onToggle={() => update('isBgRemovalEnabled', !options.isBgRemovalEnabled)}
          label="배경 제거"
        />
        <p className="text-xs text-text-muted">좌측 상단 픽셀 색상과 일치하는 배경을 제거합니다.</p>
      </section>

      <section className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
        <h3 className="font-semibold text-sm flex items-center gap-2 text-slate-800">
          <Layers size={16} className="text-primary" />
          외곽선 효과
        </h3>

        <Toggle
          checked={options.isOutlineEnabled}
          onToggle={() => update('isOutlineEnabled', !options.isOutlineEnabled)}
          label="외곽선 활성화"
        />

        {options.isOutlineEnabled && (
          <div className="space-y-4 pt-2 border-t border-slate-100">
            <fieldset>
              <legend className="text-xs font-medium text-slate-600 mb-2">스타일</legend>
              <div className="grid grid-cols-2 gap-2">
                {outlineStyles.map((s) => (
                  <button
                    key={s.value}
                    aria-label={`Outline style: ${s.label}`}
                    aria-pressed={options.outlineStyle === s.value}
                    data-testid={`outline-style-${s.value}`}
                    onClick={() => update('outlineStyle', s.value)}
                    className={cn(
                      'py-2 px-3 rounded-xl text-sm border flex items-center justify-center gap-2',
                      options.outlineStyle === s.value
                        ? 'border-primary bg-primary/5 text-primary-dark font-medium'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600',
                    )}
                  >
                    <div className={cn('w-3 h-3 rounded-full', s.dotClass)} />
                    {s.label}
                  </button>
                ))}
              </div>
            </fieldset>

            <div>
              <label
                htmlFor={thicknessId}
                className="text-xs font-medium text-slate-600 block mb-1.5"
              >
                Thickness ({options.outlineThickness}px)
              </label>
              <input
                id={thicknessId}
                type="range"
                min={1}
                max={12}
                value={options.outlineThickness}
                onChange={(e) => update('outlineThickness', Number(e.target.value))}
                aria-label={`Outline thickness: ${options.outlineThickness} pixels`}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary"
              />
            </div>

            <div>
              <label
                htmlFor={opacityId}
                className="text-xs font-medium text-slate-600 block mb-1.5"
              >
                Opacity ({options.outlineOpacity}%)
              </label>
              <input
                id={opacityId}
                type="range"
                min={0}
                max={100}
                value={options.outlineOpacity}
                onChange={(e) => update('outlineOpacity', Number(e.target.value))}
                aria-label={`Outline opacity: ${options.outlineOpacity} percent`}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary"
              />
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

export { ProcessingOptions };
export type { ProcessingOptionsProps };
