import { describe, it, expect } from 'vitest';
import { CC } from '../../engine';
import { attIcons } from '../../components/icons/att-icons';
import { postureIcon } from './postureIcon';

describe('postureIcon', () => {
  it('maps every postureCatalog iconKey to a name present in the AttIcon registry', () => {
    expect(CC.postureCatalog.length).toBeGreaterThan(0);
    for (const cat of CC.postureCatalog) {
      const resolved = postureIcon(cat.iconKey);
      expect(attIcons[resolved]).toBeDefined();
    }
  });

  it('maps the known iconKeys to their expected AT&T icon names', () => {
    expect(postureIcon('net')).toBe('ethernet');
    expect(postureIcon('shield')).toBe('check-shield');
    expect(postureIcon('tag')).toBe('checklist');
    expect(postureIcon('cost')).toBe('bill');
    expect(postureIcon('gauge')).toBe('high-meter');
  });
});
