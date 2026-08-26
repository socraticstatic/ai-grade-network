import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send } from 'lucide-react';
import type { CloudControl } from '../../engine/types';
import { andiAnswer } from '../andi/andiBrain';
import { CanvasArtifact } from './AdvisorCanvas';
import type { Beat, CanvasItem, Reply } from './advisorScript';

/* One flowing thread - the whole advisor. Messages and artifacts interleave
 * in a single column and the PAGE scrolls; nothing lives in a boxed
 * sub-scroll. Reply chips ride with the latest message; free text goes to
 * Andi. Timers pace, the script carries the content. */

type Item =
  | { t: 'msg'; who: 'advisor' | 'you'; text: string }
  | { t: 'artifact'; item: CanvasItem };

export interface AdvisorConversationProps {
  cc: CloudControl;
  beats: Beat[];
  onLeave: (route: string) => void;
  onAcceptTier: (route: string) => void;
  pace?: number;
}

export function AdvisorConversation({ cc, beats, onLeave, onAcceptTier, pace = 1000 }: AdvisorConversationProps) {
  const navigate = useNavigate();
  const [items, setItems] = useState<Item[]>([]);
  const [typing, setTyping] = useState(false);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [input, setInput] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bottom = useRef<HTMLDivElement | null>(null);

  const playBeat = (id: string) => {
    const beat = beats.find(b => b.id === id);
    if (!beat) return;
    setReplies([]);
    let i = 0;
    const sayNext = () => {
      if (i >= beat.say.length) {
        setTyping(false);
        // The artifact lands after the words that introduce it.
        if (beat.canvas) setItems(prev => [...prev, { t: 'artifact', item: beat.canvas as CanvasItem }]);
        if (beat.auto) {
          timer.current = setTimeout(() => playBeat(beat.auto as string), pace);
        } else {
          setReplies(beat.replies);
        }
        return;
      }
      setTyping(true);
      const text = beat.say[i++];
      timer.current = setTimeout(() => {
        setItems(prev => [...prev, { t: 'msg', who: 'advisor', text }]);
        sayNext();
      }, pace);
    };
    sayNext();
  };

  useEffect(() => {
    playBeat('greet');
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // The page scrolls, not a box - jsdom-guarded for tests.
    bottom.current?.scrollIntoView?.({ behavior: 'smooth', block: 'end' });
  }, [items, typing, replies]);

  const tapReply = (r: Reply) => {
    setItems(prev => [...prev, { t: 'msg', who: 'you', text: r.label }]);
    setReplies([]);
    if (r.route) {
      onLeave(r.route);
      navigate(r.route);
      return;
    }
    if (r.next) playBeat(r.next);
  };

  const askFree = () => {
    const q = input.trim();
    if (!q) return;
    setInput('');
    setItems(prev => [...prev, { t: 'msg', who: 'you', text: q }]);
    const a = andiAnswer(cc, q, null);
    const text = a.text ?? 'That one I can only show, not say - open the estate and I will point at it.';
    setItems(prev => [...prev, { t: 'msg', who: 'advisor', text }]);
  };

  return (
    <div data-testid="advisor-conversation">
      <div className="space-y-4 pb-32" aria-live="polite">
        {items.map((it, i) => {
          if (it.t === 'artifact') {
            return (
              <div key={i} className="py-2">
                <CanvasArtifact cc={cc} item={it.item} onAcceptTier={onAcceptTier} />
              </div>
            );
          }
          return it.who === 'advisor' ? (
            <p key={i} className="max-w-[46rem] text-figma-lg leading-relaxed text-fw-heading">
              {it.text}
            </p>
          ) : (
            <p key={i} className="ml-auto w-fit max-w-[70%] rounded-full bg-fw-cobalt-100 px-4 py-2 text-[15px] font-medium text-fw-cobalt-700">
              {it.text}
            </p>
          );
        })}
        {typing && (
          <p className="inline-flex items-center gap-1.5" aria-label="The advisor is typing">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-fw-bodyLight" />
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-fw-bodyLight [animation-delay:150ms]" />
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-fw-bodyLight [animation-delay:300ms]" />
          </p>
        )}
        {replies.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1" data-testid="advisor-replies">
            {replies.map(r => (
              <button
                key={r.label}
                type="button"
                onClick={() => tapReply(r)}
                className="rounded-full bg-fw-cobalt-600 px-5 py-2.5 text-[15px] font-medium text-white shadow-sm hover:bg-fw-cobalt-700"
              >
                {r.label}
              </button>
            ))}
          </div>
        )}
        <div ref={bottom} />
      </div>

      <form
        className="fixed inset-x-0 bottom-0 z-40 border-t border-fw-secondary/60 bg-fw-base/90 px-4 py-3 backdrop-blur"
        onSubmit={e => {
          e.preventDefault();
          askFree();
        }}
      >
        <div className="mx-auto flex max-w-3xl items-center gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            aria-label="Ask the advisor"
            placeholder="Ask anything about what I found…"
            className="min-w-0 flex-1 rounded-full border border-fw-secondary bg-fw-base px-4 py-2.5 text-[15px] text-fw-body placeholder:text-fw-disabled focus:border-fw-cobalt-600 focus:outline-none"
          />
          <button
            type="submit"
            aria-label="Send"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-fw-cobalt-600 text-white hover:bg-fw-cobalt-700"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </form>
    </div>
  );
}
