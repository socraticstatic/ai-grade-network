import { useState } from 'react';

export function useTemplatesManager() {
  const [showTemplatesDrawer, setShowTemplatesDrawer] = useState(false);

  const openTemplatesDrawer = () => setShowTemplatesDrawer(true);
  const closeTemplatesDrawer = () => setShowTemplatesDrawer(false);

  return {
    showTemplatesDrawer,
    openTemplatesDrawer,
    closeTemplatesDrawer
  };
}
