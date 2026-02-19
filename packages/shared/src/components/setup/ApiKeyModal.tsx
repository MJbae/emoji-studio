import { useState } from 'react';
import { Sparkles, Eye, EyeOff, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/utils/cn';
import { generateText } from '@/services/gemini/client';

interface ApiKeyModalProps {
  open: boolean;
  onSave: (key: string) => void;
  onClose?: () => void;
  dismissable?: boolean;
}

function ApiKeyModal({ open, onSave, onClose, dismissable = false }: ApiKeyModalProps) {
  const [key, setKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);

  if (!open) return null;

  const isValid = key.trim().length >= 10;

  const handleSave = async () => {
    const trimmed = key.trim();
    if (trimmed.length < 10) {
      setError('API 키는 최소 10자 이상이어야 합니다.');
      return;
    }

    setError(null);
    setValidating(true);

    try {
      await generateText({ contents: 'hi' }, trimmed);
      onSave(trimmed);
    } catch {
      setError('API 키가 유효하지 않습니다. 키를 확인해 주세요.');
    } finally {
      setValidating(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Gemini API Key Setup"
      data-testid="api-key-modal"
    >
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-md animate-[fadeSlideIn_0.3s_ease-out]">
        <div className="p-6 space-y-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                <Sparkles className="text-primary" size={20} />
              </div>
              <div>
                <h2 className="font-bold text-text text-lg">API 키 설정</h2>
                <p className="text-sm text-text-muted">Google Gemini API 키를 입력하세요</p>
              </div>
            </div>
            {dismissable && onClose && (
              <button
                onClick={onClose}
                aria-label="Close modal"
                data-testid="close-modal-btn"
                className="p-1 rounded-lg text-text-muted hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="api-key-input" className="text-sm font-medium text-slate-700">
              Gemini API 키
            </label>
            <div className="relative">
              <input
                id="api-key-input"
                type={showKey ? 'text' : 'password'}
                value={key}
                onChange={(e) => {
                  setKey(e.target.value);
                  setError(null);
                }}
                onKeyDown={(e) => e.key === 'Enter' && isValid && handleSave()}
                placeholder="AIza..."
                aria-label="Gemini API key"
                data-testid="api-key-input"
                className={cn(
                  'w-full px-4 py-2.5 pr-10 rounded-lg border text-sm transition-colors',
                  'focus:outline-none focus:ring-3 focus:ring-primary/20 focus:border-primary',
                  error ? 'border-danger' : 'border-slate-300',
                )}
              />
              <button
                type="button"
                onClick={() => setShowKey((s) => !s)}
                aria-label={showKey ? 'API 키 숨기기' : 'API 키 보기'}
                data-testid="toggle-key-visibility"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"
              >
                {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {error && (
              <p role="alert" className="text-xs text-danger">
                {error}
              </p>
            )}
          </div>

          <div className="bg-slate-50 rounded-lg p-3 text-xs text-text-muted space-y-1">
            <p>키는 브라우저에만 저장되며 외부로 전송되지 않습니다.</p>
            <p>
              키 발급:{' '}
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline font-medium"
              >
                Google AI Studio
              </a>
            </p>
          </div>

          <Button
            onClick={handleSave}
            disabled={!isValid || validating}
            className="w-full"
            size="lg"
            aria-label="Save API key"
            data-testid="save-api-key-btn"
          >
            {validating ? '검증 중...' : '저장 후 계속'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export { ApiKeyModal };
export type { ApiKeyModalProps };
