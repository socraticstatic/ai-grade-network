import { describe, it, expect } from 'vitest';
import { CC } from './index';

interface Vpc { id: string; name: string; attached: boolean; cidr: string; subnets: number }
const vpcs = () => (CC as unknown as { vpcs: Record<string, Vpc[]> }).vpcs;
const bag = () => (CC as unknown as { _: { pushUndo: (l: string) => void } })._;

/* F3. snapshot() records one entry per VPC that existed when it was taken;
   restore() used to walk the LIVE arrays and index s.vp[k][i] blindly. A
   rescan pushes a newly discovered VPC and deliberately records no undo entry
   (discovery is not a user mutation), so any snapshot taken before a rescan
   and restored after it dereferenced undefined and threw.

   Decision: a rescanned VPC SURVIVES undo. Discovery reports what is already
   out there; it pushed no undo entry, so undo has no claim on it. Un-finding
   a workload the user can still see in their own cloud console because they
   undid an unrelated action would be the engine lying about the estate.
   restore() therefore reconciles only the VPCs both sides know about and
   leaves the surplus alone. */
describe('restore() across an estate that changed size', () => {
  it('read-only: the pristine estate has 15 VPCs and gcp/usc1 has not been rescanned', () => {
    expect(CC.counts().vpcs).toBe(15);
    expect(vpcs().usc1.some(v => v.id === 'vpcml')).toBe(false);
  });

  it('undoing across a rescan does not throw, and the discovered VPC survives', () => {
    expect(CC.applyFix('shiftAws')).toBe(true); // pushes an undo snapshot of 15 VPCs
    expect(CC.fixes.shiftAws).toBe(true);

    const found = CC.rescanAccount('gcp');
    expect(found).toBe('vpc-ml-suite');
    expect(CC.counts().vpcs).toBe(16);

    let undone: boolean | undefined;
    expect(() => { undone = CC.undo(); }).not.toThrow();
    expect(undone).toBe(true);

    // the mutation the snapshot DID cover is rolled back...
    expect(CC.fixes.shiftAws).toBe(false);
    // ...and the discovery it never covered is still here
    expect(CC.counts().vpcs).toBe(16);
    expect(vpcs().usc1.some(v => v.id === 'vpcml')).toBe(true);
  });

  it('restores cleanly when the live estate has FEWER VPCs than the snapshot', () => {
    bag().pushUndo('shrink check');
    const removed = vpcs().usc1.pop() as Vpc;
    expect(removed.id).toBe('vpcml');

    let undone: boolean | undefined;
    expect(() => { undone = CC.undo(); }).not.toThrow();
    expect(undone).toBe(true);
    // restore() reconciles fields; it does not resurrect a VPC that is gone
    expect(vpcs().usc1.some(v => v.id === 'vpcml')).toBe(false);
  });
});
