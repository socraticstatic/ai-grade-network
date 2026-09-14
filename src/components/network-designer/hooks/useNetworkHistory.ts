import { useDesignerStore } from '../store/useDesignerStore';

export function useNetworkHistory() {
  const saveToHistory = useDesignerStore((s) => s.saveToHistory);
  const undo = useDesignerStore((s) => s.undo);
  const historyIndex = useDesignerStore((s) => s.historyIndex);

  const canUndo = historyIndex > 0;

  return { saveToHistory, undo, canUndo };
}
