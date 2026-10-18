import { useAppStore } from '@/state/appStore';

/** Visible message for a rejected number input (e.g. beyond 24 integer / 12 fraction digits). Click to dismiss. */
export function InputErrorBanner() {
  const inputError = useAppStore((s) => s.inputError);
  const setInputError = useAppStore((s) => s.setInputError);
  if (!inputError) return null;
  return (
    <div className="grid-input-error" role="alert" onClick={() => setInputError(null)}
      style={{ padding: '4px 8px', background: '#fdecea', color: '#b3261e', fontSize: 12, cursor: 'pointer' }}>
      {inputError}
    </div>
  );
}
