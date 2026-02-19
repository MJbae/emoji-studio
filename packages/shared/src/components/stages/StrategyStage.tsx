import { useState } from 'react';
import { Brain, TrendingUp, Palette, Globe, Users, ChevronDown, ChevronUp } from 'lucide-react';
import type { LLMStrategy, PersonaInsight } from '@/types/domain';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Loader } from '@/components/ui/Loader';
import { cn } from '@/utils/cn';

interface StrategyStageProps {
  strategy: LLMStrategy | null;
  loading: boolean;
  error: string | null;
  onContinue: () => void;
  onRetry: () => void;
  onBack: () => void;
}

const PERSONA_COLORS: Record<string, { icon: string; bg: string }> = {
  'Market Analyst': { icon: 'text-indigo-600', bg: 'bg-indigo-100' },
  'Art Director': { icon: 'text-pink-600', bg: 'bg-pink-100' },
  'Cultural Expert': { icon: 'text-teal-600', bg: 'bg-teal-100' },
  'Creative Director': { icon: 'text-amber-600', bg: 'bg-amber-100' },
};

function getPersonaColor(persona: string) {
  return PERSONA_COLORS[persona] ?? { icon: 'text-slate-600', bg: 'bg-slate-100' };
}

function StrategyStage({
  strategy,
  loading,
  error,
  onContinue,
  onRetry,
  onBack,
}: StrategyStageProps) {
  const [expandedInsights, setExpandedInsights] = useState<Record<number, boolean>>({});

  const toggleInsight = (index: number) => {
    setExpandedInsights((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  if (loading) {
    return (
      <section data-stage="strategy" data-phase="loading">
        <Loader text="AI 전문가 패널이 컨셉을 분석 중입니다…" size="lg" />
      </section>
    );
  }

  if (error && !strategy) {
    return (
      <section data-stage="strategy" data-phase="error" className="max-w-2xl mx-auto space-y-6">
        <div className="bg-danger-light border border-red-200 rounded-xl p-6 text-center space-y-4">
          <p role="alert" className="text-danger font-medium">
            {error}
          </p>
          <Button
            variant="outline"
            onClick={onRetry}
            aria-label="Retry analysis"
            data-testid="retry-btn"
          >
            분석 재시도
          </Button>
        </div>
        <Button variant="outline" onClick={onBack} aria-label="Go back" data-testid="back-btn">
          이전
        </Button>
      </section>
    );
  }

  if (!strategy) return null;

  return (
    <section data-stage="strategy" data-phase="complete" className="max-w-6xl mx-auto space-y-8">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 text-primary rounded-full text-sm font-medium">
          <Brain size={14} />
          AI 전문가 패널
        </div>
        <h2 className="text-3xl font-bold text-text">전략 분석</h2>
        <p className="text-text-muted">AI가 생성한 이모지 세트 전략을 검토하세요.</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          {strategy.selectedTextStyle && (
            <CollapsibleStrategyCard
              title="텍스트 스타일"
              icon={<Palette className="w-5 h-5 text-blue-600" />}
              iconBg="bg-blue-100"
              defaultExpanded={true}
              badge={strategy.selectedTextStyle.title}
            >
              <p className="text-sm text-text-muted leading-relaxed break-words whitespace-normal">
                {strategy.selectedTextStyle.styleDescription}
              </p>
            </CollapsibleStrategyCard>
          )}

          {strategy.culturalNotes && (
            <CollapsibleStrategyCard
              title="문화적 고려사항"
              icon={<Globe className="w-5 h-5 text-emerald-600" />}
              iconBg="bg-emerald-100"
            >
              <p className="text-sm text-text-muted leading-relaxed break-words whitespace-normal">
                {strategy.culturalNotes}
              </p>
            </CollapsibleStrategyCard>
          )}

          {strategy.salesReasoning && (
            <CollapsibleStrategyCard
              title="판매 전략"
              icon={<TrendingUp className="w-5 h-5 text-amber-600" />}
              iconBg="bg-amber-100"
            >
              <p className="text-sm text-text-muted leading-relaxed break-words whitespace-normal">
                {strategy.salesReasoning}
              </p>
            </CollapsibleStrategyCard>
          )}
        </div>

        <div className="space-y-4">
          {strategy.personaInsights && strategy.personaInsights.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <Users className="w-4 h-4 text-text-muted" />
                <h3 className="font-bold text-slate-700 text-xs uppercase tracking-wide">
                  전문가 인사이트
                </h3>
              </div>
              {strategy.personaInsights.map((insight: PersonaInsight, index: number) => {
                const isExpanded = expandedInsights[index] ?? false;
                const colors = getPersonaColor(insight.persona);

                return (
                  <Card key={index} className="overflow-hidden">
                    <button
                      onClick={() => toggleInsight(index)}
                      aria-expanded={isExpanded}
                      aria-label={`${insight.persona} insight`}
                      data-testid={`persona-${index}`}
                      className="w-full p-4 flex items-start gap-3 text-left hover:bg-slate-50 transition-colors"
                    >
                      <div className={cn('p-2 rounded-lg shrink-0 mt-0.5', colors.bg)}>
                        <Users className={cn('w-4 h-4', colors.icon)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="font-bold text-slate-900 text-sm">{insight.persona}</h4>
                          <div className="shrink-0 text-slate-400">
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </div>
                        </div>

                        {!isExpanded && (
                          <p className="text-xs text-text-muted truncate mt-1">
                            {insight.analysis}
                          </p>
                        )}

                        {isExpanded && (
                          <p className="text-sm text-text-muted leading-relaxed pt-3 border-t border-slate-100 mt-3 break-words whitespace-normal">
                            {insight.analysis}
                          </p>
                        )}
                      </div>
                    </button>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-between pt-6">
        <Button variant="outline" onClick={onBack} aria-label="Go back" data-testid="back-btn">
          이전
        </Button>
        <Button
          onClick={onContinue}
          size="lg"
          aria-label="Continue to character generation"
          data-testid="continue-btn"
        >
          다음 →
        </Button>
      </div>
    </section>
  );
}

function CollapsibleStrategyCard({
  title,
  icon,
  iconBg,
  children,
  defaultExpanded = false,
  badge,
}: {
  title: string;
  icon: React.ReactNode;
  iconBg: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  badge?: string;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <Card className="overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-5 flex items-start gap-3 text-left hover:bg-slate-50 transition-colors"
        aria-expanded={expanded}
      >
        <div className={cn('p-2 rounded-lg shrink-0 mt-0.5', iconBg)}>{icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-bold text-slate-900 text-sm">{title}</h3>
            {badge && (
              <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded-full whitespace-nowrap ml-auto mr-2">
                {badge}
              </span>
            )}
            <div className="shrink-0 text-slate-400">
              {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
          </div>
          {!expanded && (
            <p className="text-xs text-text-muted truncate mt-1">
              클릭하여 상세 내용 확인
            </p>
          )}
          {expanded && <div className="mt-3 pt-3 border-t border-slate-100 animate-fade-in">{children}</div>}
        </div>
      </button>
    </Card>
  );
}

export { StrategyStage };
export type { StrategyStageProps };
