import { describe, it, expect, beforeEach } from 'vitest';
import { create } from 'zustand';
import { createInAppNotificationSlice, InAppNotificationSlice } from './inAppNotificationSlice';

const useTestStore = create<InAppNotificationSlice>()((...args) => ({
  ...createInAppNotificationSlice(...args),
}));

describe('inAppNotificationSlice', () => {
  beforeEach(() => {
    useTestStore.setState({
      activeAlert: null,
      activeWarning: null,
      activeConfirm: null,
      activeBanner: null,
      toasts: [],
    });
  });

  it('showAlert sets activeAlert', () => {
    const config = {
      title: 'Connection failed',
      reassurance: 'Your changes were saved.',
      reason: 'due to a technical issue on our end.',
      fix: 'Please try connecting again.',
      escalation: 'contact your support team',
      supportId: '1430987843e',
      actionLabel: 'Try Again',
    };
    useTestStore.getState().showAlert(config);
    expect(useTestStore.getState().activeAlert).toEqual(config);
  });

  it('dismissAlert clears activeAlert', () => {
    useTestStore.getState().showAlert({
      title: 'x', reassurance: 'x', reason: 'x', fix: 'x',
      escalation: 'x', supportId: 'abc', actionLabel: 'OK',
    });
    useTestStore.getState().dismissAlert();
    expect(useTestStore.getState().activeAlert).toBeNull();
  });

  it('addToast adds item with unique id', () => {
    useTestStore.getState().addToast({ type: 'info', title: 'Done', message: 'All good', duration: 5000 });
    const toasts = useTestStore.getState().toasts;
    expect(toasts).toHaveLength(1);
    expect(toasts[0].id).toBeTruthy();
    expect(toasts[0].type).toBe('info');
  });

  it('addToast caps at 3', () => {
    for (let i = 0; i < 5; i++) {
      useTestStore.getState().addToast({ type: 'info', title: `T${i}`, message: '', duration: 5000 });
    }
    expect(useTestStore.getState().toasts).toHaveLength(3);
  });

  it('removeToast removes by id', () => {
    useTestStore.getState().addToast({ type: 'success', title: 'Done', message: '', duration: 5000 });
    const id = useTestStore.getState().toasts[0].id;
    useTestStore.getState().removeToast(id);
    expect(useTestStore.getState().toasts).toHaveLength(0);
  });

  it('showBanner sets activeBanner', () => {
    useTestStore.getState().showBanner({ title: 'Maintenance', message: 'June 5, 02:00 AM EST' });
    expect(useTestStore.getState().activeBanner?.title).toBe('Maintenance');
  });

  it('dismissBanner clears activeBanner', () => {
    useTestStore.getState().showBanner({ title: 'x', message: 'y' });
    useTestStore.getState().dismissBanner();
    expect(useTestStore.getState().activeBanner).toBeNull();
  });

  it('showConfirm sets activeConfirm', () => {
    const onConfirm = () => {};
    useTestStore.getState().showConfirm({
      title: 'Delete connection?',
      message: 'This cannot be undone.',
      variant: 'destructive',
      confirmLabel: 'Delete',
      onConfirm,
    });
    expect(useTestStore.getState().activeConfirm?.variant).toBe('destructive');
  });

  it('dismissConfirm clears activeConfirm', () => {
    useTestStore.getState().showConfirm({
      title: 'x', message: 'y', variant: 'standard', confirmLabel: 'OK', onConfirm: () => {},
    });
    useTestStore.getState().dismissConfirm();
    expect(useTestStore.getState().activeConfirm).toBeNull();
  });
});
