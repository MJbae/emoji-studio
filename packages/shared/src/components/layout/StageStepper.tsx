import { Check } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { WorkflowStage, WorkflowMode } from '@/store/slices/workflowSlice';

interface StageStepperProps {
  currentStage: WorkflowStage;
  mode: WorkflowMode;
  completedStages: Set<WorkflowStage>;
  onStageClick: (stage: WorkflowStage) => void;
}

interface StepDef {
  id: WorkflowStage;
  label: string;
  shortLabel: string;
}

const FULL_STEPS: StepDef[] = [
  { id: 'input', label: '컨셉 입력', shortLabel: '입력' },
  { id: 'strategy', label: 'AI 전략', shortLabel: '전략' },
  { id: 'character', label: '캐릭터', shortLabel: '캐릭터' },
  { id: 'stickers', label: '이모지', shortLabel: '이모지' },
  { id: 'postprocess', label: '후처리', shortLabel: '후처리' },
  { id: 'metadata', label: '메타데이터', shortLabel: '메타' },
  { id: 'export', label: '내보내기', shortLabel: '내보내기' },
];

const POSTPROCESS_STEPS: StepDef[] = [
  { id: 'postprocess', label: '후처리', shortLabel: '후처리' },
  { id: 'metadata', label: '메타데이터', shortLabel: '메타' },
  { id: 'export', label: '내보내기', shortLabel: '내보내기' },
];

function StageStepper({ currentStage, mode, completedStages, onStageClick }: StageStepperProps) {
  const steps = mode === 'full' ? FULL_STEPS : POSTPROCESS_STEPS;
  const currentIndex = steps.findIndex((s) => s.id === currentStage);

  return (
    <nav aria-label="Workflow stages" className="w-full py-4" data-testid="stage-stepper">
      <div className="overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
        <ol className="flex items-center gap-1 min-w-[320px] sm:min-w-0">
          {steps.map((step, index) => {
            const isCompleted = completedStages.has(step.id);
            const isCurrent = step.id === currentStage;
            const isClickable = isCompleted;

            return (
              <li key={step.id} className="flex-1 flex items-center">
                <button
                  onClick={() => isClickable && onStageClick(step.id)}
                  disabled={!isClickable}
                  aria-label={`Stage ${index + 1}: ${step.label}`}
                  aria-current={isCurrent ? 'step' : undefined}
                  data-stage={step.id}
                  data-testid={`stage-step-${step.id}`}
                  className={cn(
                    'w-full flex flex-col items-center gap-1.5 group relative',
                    isClickable && 'cursor-pointer',
                    !isClickable && !isCurrent && 'cursor-default',
                  )}
                >
                  <div className="flex items-center w-full">
                    {index > 0 && (
                      <div
                        className={cn(
                          'flex-1 h-0.5 transition-colors',
                          index <= currentIndex ? 'bg-primary' : 'bg-slate-200',
                        )}
                      />
                    )}
                    <div
                      className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all',
                        isCompleted && 'bg-primary text-white',
                        isCurrent && !isCompleted && 'bg-primary text-white ring-3 ring-primary/20',
                        !isCurrent && !isCompleted && 'bg-slate-200 text-slate-500',
                      )}
                    >
                      {isCompleted ? <Check size={14} /> : index + 1}
                    </div>
                    {index < steps.length - 1 && (
                      <div
                        className={cn(
                          'flex-1 h-0.5 transition-colors',
                          index < currentIndex ? 'bg-primary' : 'bg-slate-200',
                        )}
                      />
                    )}
                  </div>
                  <span
                    className={cn(
                      'text-[10px] sm:text-xs font-medium transition-colors leading-tight text-center',
                      isCurrent && 'text-primary',
                      isCompleted && !isCurrent && 'text-slate-600',
                      !isCurrent && !isCompleted && 'text-slate-400',
                    )}
                  >
                    <span className="hidden sm:inline">{step.label}</span>
                    <span className="sm:hidden">{step.shortLabel}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
}

export { StageStepper };
export type { StageStepperProps };
