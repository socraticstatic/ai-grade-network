import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send } from 'lucide-react';
import type { CloudControl } from '../../engine/types';
import { andiAnswer } from '../andi/andiBrain';
import type { Beat, CanvasItem, Reply } from './advisorScript';

/* The conversation thread - the spine of the advisor page. Beats arrive as
 * advisor bubbles with typing pacing; one-tap replies advance the script;
 * free text routes to Andi's grounded brain. The parent owns the canvas
 * and receives every canvas directive as beats land. Timers pace, the
 * script carries the content - nothing here invents a number. */

interface Msg {
  who: 'advisor' | 'you';
  text: string;
}

export interface AdvisorConversationProps {
  cc: CloudControl;
  beats: Beat[];
  onCanvas: (item: CanvasItem) => void;
  onLeave: (route: string) => void;
  /** ms per advisor bubble; tests pass 0 to run the script instantly. */
  pace?: number;
}

export function AdvisorConversation({ cc, beats, onCanvas, onLeave, pace = 1100 }: AdvisorConversationProps) {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [typing, setTyping] = useState(false);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [input, setInput] = useState('');
  const beatRef = useRef<string>('greet');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bottom = useRef<HTMLDivElement | null>(null);

  const playBeat = (id: string) => {
    const beat = beats.find(b => b.id === id);
    if (!beat) return;
    beatRef.current = id;
    setReplies([]);
    if (beat.canvas) onCanvas(beat.canvas);
    let i = 0;
    const sayNext = () => {
      if (i >= beat.say.length) {
        setTyping(false);
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
        setMessages(m => [...m, { who: 'advisor', text }]);
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
    // jsdom has no scrollIntoView - guard so tests can render the thread.
    bottom.current?.scrollIntoView?.({ behavior: 'smooth', block: 'end' });
  }, [messages, typing, replies]);

  const tapReply = (r: Reply) => {
    setMessages(m => [...m, { who: 'you', text: r.label }]);
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
    setMessages(m => [...m, { who: 'you', text: q }]);
    const a = andiAnswer(cc, q, null);
    const text = a.text ?? 'That one I can only show, not say - open the estate and I will point at it.';
    setMessages(m => [...m, { who: 'advisor', text }]);
  };

  return (
    <div className="flex h-full min-h-0 flex-col" data-testid="advisor-conversation">
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1" aria-live="polite">
        {messages.map((m, i) =>
          m.who === 'advisor' ? (
            <div key={i} className="max-w-[85%] rounded-2xl rounded-tl-md bg-fw-wash px-4 py-3 text-figma-sm leading-relaxed text-fw-body">
              {m.text}
            </div>
          ) : (
            <div key={i} className="ml-auto max-w-[75%] rounded-2xl rounded-tr-md bg-fw-cobalt-600 px-4 py-2.5 text-figma-sm font-medium text-white">
              {m.text}
            </div>
          ),
        )}
        {typing && (
          <div className="inline-flex items-center gap-1.5 rounded-2xl rounded-tl-md bg-fw-wash px-4 py-3" aria-label="The advisor is typing">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-fw-bodyLight" />
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-fw-bodyLight [animation-delay:150ms]" />
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-fw-bodyLight [animation-delay:300ms]" />
          </div>
        )}
        {replies.length > 0 && (
          <div className="flex flex-wrap justify-end gap-2 pt-1" data-testid="advisor-replies">
            {replies.map(r => (
              <button
                key={r.label}
                type="button"
                onClick={() => tapReply(r)}
                className="rounded-full border border-fw-cobalt-600 px-4 py-2 text-figma-sm font-medium text-fw-cobalt-600 hover:bg-fw-cobalt-100"
              >
                {r.label}
              </button>
            ))}
          </div>
        )}
        <div ref={bottom} />
      </div>

      <form
        className="mt-3 flex shrink-0 items-center gap-2"
        onSubmit={e => {
          e.preventDefault();
          askFree();
        }}
      >
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          aria-label="Ask the advisor"
          placeholder="Ask anything about what I found…"
          className="min-w-0 flex-1 rounded-full border border-fw-secondary bg-fw-base px-4 py-2.5 text-figma-sm text-fw-body placeholder:text-fw-disabled focus:border-fw-cobalt-600 focus:outline-none"
        />
        <button
          type="submit"
          aria-label="Send"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-fw-cobalt-600 text-white hover:bg-fw-cobalt-700"
        >
          <Send className="h-4 w-4" aria-hidden="true" />
        </button>
      </form>
    </div>
  );
}
