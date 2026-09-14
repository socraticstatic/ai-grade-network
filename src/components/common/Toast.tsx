import { useState, useEffect } from 'react';
import { X, CheckCircle, AlertTriangle, AlertCircle, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  type: ToastType;
  title: string;
  message: string;
  duration?: number;
  onClose: () => void;
}

export function Toast({ 
  type, 
  title, 
  message, 
  duration = 5000, 
  onClose 
}: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (duration === Infinity) return;

    const timer = setTimeout(() => {
      setIsClosing(true);
      setTimeout(() => {
        setIsVisible(false);
        onClose();
      }, 300); // Animation duration
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const icons = {
    success: <CheckCircle className="h-5 w-5 text-green-500" />,
    error: <AlertTriangle className="h-5 w-5 text-red-500" />,
    warning: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
    info: <Info className="h-5 w-5 text-blue-500" />
  };

  const styles = {
    success: 'bg-green-50 border-green-200',
    error: 'bg-red-50 border-red-200',
    warning: 'bg-yellow-50 border-yellow-200',
    info: 'bg-blue-50 border-blue-200'
  };

  if (!isVisible) return null;

  return (
    <div 
      className={`
        fixed bottom-4 right-4 w-96 rounded-lg shadow-lg border
        transition-all duration-300 ease-in-out
        ${styles[type]}
        ${isClosing ? 'opacity-0 transform translate-y-2' : 'opacity-100 transform translate-y-0'}
      `}
      style={{ zIndex: 9999 }} // Ensure toast is always on top
    >
      <div className="p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            {icons[type]}
          </div>
          <div className="ml-3 w-0 flex-1">
            <p className="text-sm font-medium text-gray-900">{title}</p>
            <p className="mt-1 text-sm text-gray-500">{message}</p>
          </div>
          <div className="ml-4 flex-shrink-0 flex">
            <button
              onClick={() => {
                setIsClosing(true);
                setTimeout(() => {
                  setIsVisible(false);
                  onClose();
                }, 300);
              }}
              className="bg-transparent rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <span className="sr-only">Close</span>
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}