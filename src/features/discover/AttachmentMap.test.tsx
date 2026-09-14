import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import { CC } from '../../engine';
import { buildAttachmentMapModel } from './attachmentModel';
import { AttachmentMap } from './AttachmentMap';

afterEach(cleanup);

describe('AttachmentMap', () => {
  it('renders a button per AWS/Azure workload and per site', () => {
    render(<AttachmentMap />);
    const model = buildAttachmentMapModel(CC);
    for (const g of model.groups) {
      for (const r of g.regions) {
        for (const w of r.workloads) {
          expect(screen.getByRole('button', { name: new RegExp(w.vpc.name) })).toBeInTheDocument();
        }
      }
    }
    for (const s of model.sites) {
      expect(screen.getByRole('button', { name: new RegExp(s.name) })).toBeInTheDocument();
    }
  });

  it('clicking a workload opens the chain drawer with its details', () => {
    render(<AttachmentMap />);
    const model = buildAttachmentMapModel(CC);
    const first = model.groups[0].regions[0].workloads[0];
    fireEvent.click(screen.getByRole('button', { name: new RegExp(first.vpc.name) }));
    const drawer = screen.getByTestId('chain-drawer');
    expect(within(drawer).getByText(first.vpc.cidr, { exact: false })).toBeInTheDocument();
  });

  it('unattached workloads ride dashed public edges; attached ride solid', () => {
    render(<AttachmentMap />);
    const dashed = document.querySelectorAll('[data-edge="public"]');
    const solid = document.querySelectorAll('[data-edge="private"]');
    const model = buildAttachmentMapModel(CC);
    const all = model.groups.flatMap(g => g.regions.flatMap(r => r.workloads));
    expect(dashed.length).toBe(all.filter(w => !w.vpc.attached).length);
    expect(solid.length).toBe(all.filter(w => w.vpc.attached).length);
  });
});
