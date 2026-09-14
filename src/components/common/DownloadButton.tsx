import { Download } from 'lucide-react';
import { Button } from './Button';
import { downloadIconInventory } from '../../utils/downloadCSV';

/**
 * Button component to download the icon inventory CSV
 */
export function DownloadIconInventoryButton() {
  return (
    <Button
      variant="outline"
      icon={Download}
      onClick={downloadIconInventory}
    >
      Download Icon Inventory
    </Button>
  );
}