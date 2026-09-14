import { useState, useRef } from 'react';
import { MessageSquare, X, Send, Zap } from 'lucide-react';
import { Button } from './common/Button';

export function SmartAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSendMessage = () => {
    if (!message.trim()) return;
    
    // In a real application, this would process the message and show a response
    window.addToast({
      type: 'info',
      title: 'Message Received',
      message: 'Your question has been received. An agent will respond shortly.',
      duration: 3000
    });
    
    setMessage('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="fixed bottom-20 right-4 z-50">
      {/* Assistant Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className="w-12 h-12 !p-0 shadow-lg"
        aria-label="Open assistant"
      >
        <MessageSquare className="h-6 w-6" />
      </Button>

      {/* Assistant Panel */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 mb-2 w-80 bg-fw-base rounded-2xl shadow-xl border border-fw-secondary overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-fw-secondary bg-fw-accent">
            <div className="flex items-center">
              <Zap className="h-4 w-4 text-fw-link mr-2" />
              <h3 className="text-figma-base font-medium text-fw-heading">NetBond Assistant</h3>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 text-fw-bodyLight hover:text-fw-body rounded-full"
              aria-label="Close assistant"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Content */}
          <div className="p-3 h-64 overflow-y-auto bg-fw-wash">
            <div className="p-4 bg-fw-base rounded-lg border border-fw-secondary">
              <p className="text-figma-base font-medium text-fw-body">
                How can I help you with your network connections today?
              </p>
            </div>
          </div>

          {/* Input */}
          <div className="p-3 border-t border-fw-secondary">
            <div className="relative flex items-center bg-fw-wash rounded-full border border-fw-secondary">
              <input
                ref={inputRef}
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your question..."
                className="flex-1 py-2 pl-4 pr-10 bg-transparent border-none focus:outline-none text-figma-base"
              />
              <button
                onClick={handleSendMessage}
                disabled={!message.trim()}
                className="absolute right-2 p-1.5 rounded-full text-white bg-fw-primary hover:bg-fw-primary/90 disabled:bg-fw-neutral disabled:cursor-not-allowed"
                aria-label="Send message"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}