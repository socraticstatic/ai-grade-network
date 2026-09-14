import { useState, useEffect, useRef } from 'react';
import { Zap, Send, Brain, ArrowRight, Move } from 'lucide-react';
import { CloudProvider, ConnectionType, BandwidthOption, LocationOption } from '../../types/connection';

interface NetworkAIProps {
  provider?: CloudProvider;
  type?: ConnectionType;
  bandwidth?: BandwidthOption;
  location?: LocationOption;
  step: number;
  onNextStep?: () => void;
  onSuggestion?: (suggestion: any) => void;
}

export function NetworkAI({
  provider,
  type,
  bandwidth,
  location,
  step,
  onNextStep,
  onSuggestion
}: NetworkAIProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{role: 'assistant' | 'user', content: string}[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [typingIndex, setTypingIndex] = useState(0);
  const [currentTypingMessage, setCurrentTypingMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const dragRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (dragRef.current) {
      setIsDragging(true);
      const rect = dragRef.current.getBoundingClientRect();
      setDragStart({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragStart.x,
          y: e.clientY - dragStart.y
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart]);
  
  // Provide contextual recommendations based on the current step
  useEffect(() => {
    setIsThinking(true);
    
    const generateRecommendation = async () => {
      // Simulate network request
      await new Promise(resolve => setTimeout(resolve, 1000));
      let newMessage = '';
      
      switch(step) {
        case 0: // Initial question about network purpose
          newMessage = `👋 Hello! I'm Niva, your AI-grade network Assistant. I'll help you create the optimal cloud connection. Based on your organization profile, I recommend considering **AWS** or **Azure** as they match your business needs. What type of workloads will you be running?`;
          break;
          
        case 1: // Connection type
          if (provider) {
            newMessage = `Based on your selection of ${provider}, I recommend an "Internet to Cloud" connection type for maximum flexibility. This will provide secure, reliable connectivity while maintaining cost efficiency. Need any specific security features?`;
          } else {
            newMessage = `I recommend selecting a connection type based on your security and performance requirements. "Internet to Cloud" works well for most use cases.`;
          }
          break;
          
        case 2: // Bandwidth and location
          if (provider && type) {
            newMessage = `For ${provider} ${type}, I recommend a location closest to your primary data center. For bandwidth, I analyzed your traffic patterns and recommend **10 Gbps** as optimal for your current and projected needs. This provides 25% headroom for growth.`;
          } else {
            newMessage = `Select a location closest to your primary data center to minimize latency. For bandwidth, consider your peak usage plus 20-30% headroom for growth.`;
          }
          break;
          
        case 3: // Advanced settings
          if (provider && type && bandwidth) {
            newMessage = `For your ${bandwidth} connection to ${provider}, I recommend enabling BFD for faster failover detection and using a dual stack configuration for IPv4/IPv6 support. Would you like me to suggest optimal QoS settings based on your application profile?`;
          } else {
            newMessage = `For advanced settings, I recommend enabling BFD and using a dual stack configuration. This provides optimal performance and future-proofing.`;
          }
          break;
          
        case 4: // Review
          if (provider && type && bandwidth && location) {
            newMessage = `I've analyzed your configuration for ${type} to ${provider} at ${bandwidth} in ${location}. This configuration meets industry best practices and provides an optimal balance of performance, security, and cost. Is there anything specific you'd like me to explain about this configuration?`;
          } else {
            newMessage = `I've analyzed your configuration and it looks good. Before creating the connection, I can offer optimization recommendations if you'd like.`;
          }
          break;
          
        default:
          newMessage = `How can I help you with your network configuration?`;
      }
      
      setIsThinking(false);
      
      // Start typing animation instead of immediately showing the message
      setCurrentTypingMessage(newMessage);
      setTypingIndex(0);
    };
    
    generateRecommendation();
    
  }, [step, provider, type, bandwidth, location]);
  
  // Typing animation effect - ULTRA FAST TYPING SPEED
  useEffect(() => {
    if (currentTypingMessage && typingIndex < currentTypingMessage.length) {
      // Ultra-fast typing - random delay between 2ms and 5ms
      const typingDelay = Math.random() * 3 + 2;
      
      const typingTimer = setTimeout(() => {
        setTypingIndex(prev => prev + 1);
      }, typingDelay);
      
      return () => clearTimeout(typingTimer);
    } else if (currentTypingMessage && typingIndex === currentTypingMessage.length) {
      // When typing is complete, add the message to the messages array
      setMessages(prev => [...prev, { role: 'assistant', content: currentTypingMessage }]);
      setCurrentTypingMessage('');
      setTypingIndex(0);
    }
  }, [currentTypingMessage, typingIndex]);
  
  const handleSubmit = async () => {
    if (!inputValue.trim()) return;
    
    // Add user message
    setMessages(prev => [...prev, { role: 'user', content: inputValue }]);
    const userQuestion = inputValue;
    setInputValue('');
    
    // Simulate AI thinking
    setIsThinking(true);
    
    // Wait for a bit to simulate processing
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Generate response based on user input
    let response = '';
    
    if (userQuestion.toLowerCase().includes('recommend') || 
        userQuestion.toLowerCase().includes('suggest') ||
        userQuestion.toLowerCase().includes('best')) {
      
      if (step === 0) {
        response = `Based on your industry and workload requirements, I'd recommend **AWS** for its comprehensive set of services and robust connectivity options. AWS Interconnect – last mile provides consistent network performance and reduced bandwidth costs compared to internet-based connections.`;
        
        // Offer to select AWS for the user
        if (onSuggestion) {
          response += `\n\nWould you like me to select AWS for you?`;
        }
      } else if (step === 1) {
        response = `For connecting to ${provider}, I recommend using "Internet to Cloud" connection type. It offers a good balance of security, performance, and cost. This type uses the secure AT&T AI-grade network service to provide reliable connectivity over the internet to your cloud resources.`;
      } else if (step === 2) {
        response = `Based on your workload profile and connection type, I recommend **10 Gbps** bandwidth in the **US East** region. This provides optimal performance for your applications while maintaining cost efficiency. This configuration will support approximately 8,500 concurrent users with your current application profile.`;
      }
    }
    else if (userQuestion.toLowerCase().includes('difference') || 
             userQuestion.toLowerCase().includes('compare') ||
             userQuestion.toLowerCase().includes('vs')) {
      
      if (step === 0) {
        response = `Let me compare the major cloud providers for you:\n\n**AWS**: Best for breadth of services, global reach, and mature offerings\n**Azure**: Ideal for Microsoft-centric enterprises and hybrid deployments\n**Google Cloud**: Great for data analytics, ML/AI workloads, and hubized applications\n\nBased on your industry profile, AWS or Azure would likely be the best fit.`;
      } else if (step === 1) {
        response = `Here's how the connection types differ:\n\n**Internet to Cloud**: Uses secure internet connections, most flexible\n**Hub**: Best for multi-cloud, higher throughput\n**AWS Interconnect – last mile**: Highest security, lowest latency, dedicated connection\n\nFor your needs, Internet to Cloud offers the best balance of features and cost.`;
      }
    }
    else if (userQuestion.toLowerCase().includes('bandwith') || userQuestion.toLowerCase().includes('speed')) {
      response = `Bandwidth determines the maximum amount of data that can flow through your connection at once. Here's a guideline:\n\n**1 Gbps**: Suitable for small businesses with < 100 users\n**10 Gbps**: Mid-size organizations with 100-1000 users\n**100 Gbps**: Large enterprises with 1000+ users or data-intensive workloads\n\nAnalyzing your traffic patterns, I recommend 10 Gbps for optimal performance.`;
    }
    else if (userQuestion.toLowerCase().includes('security') || userQuestion.toLowerCase().includes('encrypt')) {
      response = `All AT&T AI-grade network connections include enterprise-grade security features:\n\n- AES-256 encryption\n- DDoS protection\n- Private connectivity that doesn't traverse the public internet\n- Integrated firewall capabilities\n\nThe connection you're configuring meets financial industry compliance requirements including PCI-DSS, SOX, and GDPR.`;
    }
    else if (userQuestion.toLowerCase().includes('cost') || userQuestion.toLowerCase().includes('price') || userQuestion.toLowerCase().includes('pricing')) {
      let pricing = "Pricing depends on connection type, bandwidth, and billing plan. ";
      
      if (bandwidth) {
        pricing += `For a ${bandwidth} connection to ${provider || 'a cloud provider'}, typical pricing is approximately $${bandwidth === '10 Gbps' ? '1,500-2,500' : bandwidth === '1 Gbps' ? '500-1,000' : '2,000-5,000'}/month with a 12-month commitment.`;
      } else {
        pricing += "I recommend reviewing the billing section after configuration for an accurate cost estimate.";
      }
      
      response = pricing + " You can also save 15-25% with longer-term commitments.";
    }
    else {
      // Generic responses based on step
      if (step === 0) {
        response = `I can help you select the ideal cloud provider for your needs. I recommend analyzing your workload characteristics, compliance requirements, and existing technology investments. ${provider || 'AWS, Azure, and Google Cloud'} all offer excellent connectivity options through the AT&T AI-grade network.`;
      } else if (step === 1) {
        response = `The connection type determines how your network traffic flows between your infrastructure and the cloud provider. For most enterprise use cases, "Internet to Cloud" provides the best balance of security, performance, and cost.`;
      } else if (step === 2) {
        response = `When selecting location and bandwidth, consider your geographic proximity to users and applications, expected traffic patterns, and growth projections. I can analyze your network needs to provide custom recommendations.`;
      } else if (step === 3) {
        response = `Advanced settings allow you to fine-tune your connection for optimal performance. I recommend enabling BFD for faster failover detection and using a dual-stack configuration to support both IPv4 and IPv6 traffic.`;
      } else {
        response = `I'm here to help optimize your cloud connectivity configuration. Feel free to ask any questions about network design, performance considerations, or security features.`;
      }
    }
    
    // Add offer to advance to next step
    if (onNextStep && Math.random() > 0.5) {
      response += `\n\nShall I advance you to the next step?`;
    }
    
    setIsThinking(false);
    
    // Start typing animation for the response
    setCurrentTypingMessage(response);
    setTypingIndex(0);
  };
  
  const handleAdvanceStep = () => {
    if (onNextStep) {
      onNextStep();
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "I've moved you to the next step of the configuration wizard." 
      }]);
    }
  };
  
  const handleApplySuggestion = () => {
    if (onSuggestion) {
      if (step === 0) {
        onSuggestion({ provider: 'AWS' });
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: "I've selected AWS as your cloud provider based on my recommendation." 
        }]);
      } else if (step === 2) {
        onSuggestion({ bandwidth: '10 Gbps', location: 'US East' });
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: "I've configured 10 Gbps bandwidth in US East region based on my analysis of your needs." 
        }]);
      }
    }
  };

  // Format message with basic markdown-like syntax
  const formatMessage = (content: string) => {
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
      .replace(/\n\n/g, '<br/><br/>') // Line breaks
      .replace(/\n/g, '<br/>')  // Line breaks
      .replace(/- (.*?)(?:\n|$)/g, '• $1<br/>'); // Bullet points
  };
  
  // Get current time of day greeting
  const getTimeBasedGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };
  
  return (
    <>
      {/* AI Panel Button */}
      <button
        className={`
          fixed bottom-8 left-8 flex items-center justify-center h-12 w-12 rounded-full
          ${isOpen ? 'bg-fw-active text-white' : 'bg-fw-neutral text-fw-link'}
          z-50 transition-all duration-200 shadow-md
        `}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-label="Toggle AI assistant"
      >
        {isOpen ? (
          <Brain className="h-6 w-6" />
        ) : (
          <Zap className="h-6 w-6" />
        )}
      </button>

      {/* AI Assistant Panel */}
      <div
        ref={dragRef}
        className={`
          fixed bg-fw-base border border-fw-secondary rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-opacity duration-300
          ${isOpen ? 'w-[min(26rem,calc(100vw-2rem))] h-[min(640px,calc(100dvh-6rem))] opacity-40 hover:opacity-100 focus-within:opacity-100' : 'w-0 h-0 opacity-0 pointer-events-none'}
          ${isDragging ? 'cursor-grabbing select-none !opacity-100' : ''}
        `}
        style={
          position
            ? { left: `${position.x}px`, top: `${position.y}px`, zIndex: 50 }
            : { bottom: '5rem', left: '2rem', zIndex: 50 }
        }
      >
        {/* Header - Sticky and Draggable */}
        <div
          className="flex items-center justify-between p-3 bg-fw-active text-white sticky top-0 z-10 cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
        >
          <div className="flex items-center flex-1">
            <Move className="h-4 w-4 mr-3 text-white/50" />
            <div className="h-8 w-8 rounded-full overflow-hidden bg-white/10 mr-2 flex items-center justify-center">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-figma-base font-medium">Niva</h3>
              <p className="text-figma-sm text-white/70">AI-grade network Assistant</p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 rounded-lg hover:bg-white/20 transition-colors text-white/70 hover:text-white"
            title="Minimize"
          >
            <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none"><path d="M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          </button>
        </div>

        {/* Messages Hub - Scrollable */}
        <div className="p-3 flex-1 overflow-y-auto bg-fw-wash">
          {messages.map((message, index) => (
            <div key={index} className={`mb-3 flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`
                max-w-[85%] rounded-lg p-3
                ${message.role === 'user' 
                  ? 'bg-fw-active text-white' 
                  : 'bg-fw-base border border-fw-secondary shadow-sm'
                }
              `}>
                {message.role === 'assistant' && (
                  <div className="flex items-center mb-1">
                    <div className="h-5 w-5 rounded-full flex items-center justify-center bg-fw-active/10 mr-1.5">
                      <Zap className="h-3.5 w-3.5 text-fw-link" />
                    </div>
                    <span className="text-figma-sm font-medium text-fw-link">Niva</span>
                  </div>
                )}
                <div
                  className="text-figma-base"
                  dangerouslySetInnerHTML={{ 
                    __html: formatMessage(message.content)
                  }}
                />
              </div>
            </div>
          ))}
          
          {/* Typing animation when a message is being typed */}
          {currentTypingMessage && (
            <div className="flex justify-start mb-3">
              <div className="bg-fw-base border border-fw-secondary rounded-lg p-3 shadow-sm max-w-[85%]">
                <div className="flex items-center mb-1">
                  <div className="h-5 w-5 rounded-full flex items-center justify-center bg-fw-active/10 mr-1.5">
                    <Zap className="h-3.5 w-3.5 text-fw-link" />
                  </div>
                  <span className="text-figma-sm font-medium text-fw-link">Niva</span>
                </div>
                <div className="text-figma-base">
                  <span dangerouslySetInnerHTML={{
                    __html: formatMessage(currentTypingMessage.substring(0, typingIndex))
                  }} />
                  <span className="inline-block w-2 h-4 ml-0.5 bg-fw-active animate-pulse"></span>
                </div>
              </div>
            </div>
          )}
          
          {/* Traditional thinking animation */}
          {isThinking && !currentTypingMessage && (
            <div className="flex justify-start mb-3">
              <div className="bg-fw-base border border-fw-secondary rounded-lg p-3 shadow-sm max-w-[85%]">
                <div className="flex items-center mb-1">
                  <div className="h-5 w-5 rounded-full flex items-center justify-center bg-fw-active/10 mr-1.5">
                    <Zap className="h-3.5 w-3.5 text-fw-link" />
                  </div>
                  <span className="text-figma-sm font-medium text-fw-link">Niva</span>
                </div>
                <div className="flex space-x-1 items-center">
                  <div className="h-2 w-2 bg-fw-active rounded-full animate-pulse"></div>
                  <div className="h-2 w-2 bg-fw-active rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                  <div className="h-2 w-2 bg-fw-active rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Action Buttons - Sticky Footer */}
        <div className="p-2 border-t border-fw-secondary bg-fw-base sticky bottom-0 z-10">
          {(messages[messages.length - 1]?.content.includes('Would you like me to select') ||
             messages[messages.length - 1]?.content.includes('recommend')) && 
             !isThinking && !currentTypingMessage && (
            <div className="flex space-x-2 mb-2">
              <button
                onClick={handleApplySuggestion}
                className="flex-1 flex items-center justify-center bg-fw-active/10 text-fw-link rounded-lg px-3 py-2 text-figma-base font-medium hover:bg-fw-active/20"
              >
                <Zap className="h-4 w-4 mr-2" />
                Apply Recommendation
              </button>
              {onNextStep && (
                <button
                  onClick={handleAdvanceStep}
                  className="flex items-center justify-center bg-fw-active/10 text-fw-link rounded-lg px-3 py-2 text-figma-base font-medium hover:bg-fw-active/20"
                >
                  <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
          
          {/* Input Area */}
          <div className="flex items-center space-x-2">
            <div className="flex-1 relative">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={`${getTimeBasedGreeting()}, how can I help?`}
                className="w-full rounded-full border-fw-secondary pr-10 focus:border-fw-active focus:ring-fw-active text-figma-base"
                disabled={isThinking || Boolean(currentTypingMessage)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isThinking && !currentTypingMessage && inputValue.trim()) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
              />
              <button
                disabled={isThinking || Boolean(currentTypingMessage) || !inputValue.trim()}
                onClick={handleSubmit}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-fw-bodyLight hover:text-fw-link"
                aria-label="Send message"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            
            <button
              onClick={() => {
                if (onNextStep && !isThinking && !currentTypingMessage) {
                  handleAdvanceStep();
                }
              }}
              disabled={isThinking || Boolean(currentTypingMessage)}
              className={`
                p-2 rounded-full 
                ${(isThinking || Boolean(currentTypingMessage)) ? 'bg-fw-neutral text-fw-bodyLight cursor-not-allowed' : 'bg-fw-active text-white hover:bg-fw-linkHover'}
              `}
              title="Advance to next step"
              aria-label="Advance to next step"
            >
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
          
          {/* Dynamic footer status message */}
          {(isThinking || currentTypingMessage) ? (
            <div className="mt-1 text-center">
              <span className="text-figma-sm text-fw-bodyLight">Niva is typing...</span>
            </div>
          ) : (
            <div className="mt-1 text-center">
              <span className="text-figma-sm text-fw-bodyLight">Powered by AT&T AI</span>
            </div>
          )}
        </div>
      </div>
    </>
  );
}