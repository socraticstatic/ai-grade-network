import { useEffect, useRef } from 'react';
import { VNF } from '../types/vnf';
import { Hub } from '../types/hub';

interface SyncMessage {
  type: 'VNF_UPDATED' | 'HUBS_UPDATED' | 'FULL_SYNC' | 'REQUEST_SYNC' | 'VNF_UPDATED_FROM_DETACHED' | 'DETACHED_CLOSED' | 'PARENT_CLOSED';
  payload?: {
    vnfs?: VNF[];
    hubs?: Hub[];
  };
  windowId?: string;
}

interface UseVNFSyncProps {
  vnfs: VNF[];
  hubs: Hub[];
  connectionId: string;
  onVNFsUpdate?: (vnfs: VNF[]) => void;
  onHubsUpdate?: (hubs: Hub[]) => void;
}

export function useVNFSync({
  vnfs,
  hubs,
  connectionId,
  onVNFsUpdate,
  onHubsUpdate
}: UseVNFSyncProps) {
  const channelRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    // Create broadcast channel for cross-window communication
    const channel = new BroadcastChannel('vnf-sync');
    channelRef.current = channel;

    const handleMessage = (event: MessageEvent<SyncMessage>) => {
      const { type, payload, windowId } = event.data;

      switch (type) {
        case 'REQUEST_SYNC':
          // Detached window is requesting initial data
          channel.postMessage({
            type: 'FULL_SYNC',
            payload: {
              vnfs,
              hubs
            }
          });
          break;

        case 'VNF_UPDATED_FROM_DETACHED':
          // Detached window made changes, update local state
          if (payload?.vnfs && onVNFsUpdate) {
            onVNFsUpdate(payload.vnfs);
          }
          break;

        case 'DETACHED_CLOSED':
          // Detached window closed, no action needed
          break;
      }
    };

    channel.addEventListener('message', handleMessage);

    // Cleanup on unmount
    return () => {
      // Notify detached windows that parent is closing
      channel.postMessage({ type: 'PARENT_CLOSED' });
      channel.removeEventListener('message', handleMessage);
      channel.close();
      channelRef.current = null;
    };
  }, []);

  // Sync VNFs when they change
  useEffect(() => {
    if (channelRef.current) {
      channelRef.current.postMessage({
        type: 'VNF_UPDATED',
        payload: { vnfs }
      });
    }
  }, [vnfs]);

  // Sync hubs when they change
  useEffect(() => {
    if (channelRef.current) {
      channelRef.current.postMessage({
        type: 'HUBS_UPDATED',
        payload: { hubs }
      });
    }
  }, [hubs]);

  return {
    broadcast: (message: SyncMessage) => {
      if (channelRef.current) {
        channelRef.current.postMessage(message);
      }
    }
  };
}
