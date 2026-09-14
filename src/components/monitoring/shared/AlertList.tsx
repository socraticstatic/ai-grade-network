import { motion, AnimatePresence } from 'framer-motion';
import { Alert } from '../../../types';
import { AlertCard } from './AlertCard';
import { EmptyAlertState } from './EmptyAlertState';

interface AlertListProps {
  alerts: Alert[];
  onDismiss: (id: string) => void;
  isMobile?: boolean;
}

export function AlertList({ alerts, onDismiss, isMobile = false }: AlertListProps) {
  if (alerts.length === 0) {
    return <EmptyAlertState isMobile={isMobile} />;
  }

  if (isMobile) {
    return (
      <div className="space-y-3">
        <AnimatePresence>
          {alerts.map((alert) => (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <AlertCard 
                alert={alert} 
                onDismiss={onDismiss}
                isMobile={true}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <AnimatePresence>
        {alerts.map((alert) => (
          <motion.div
            key={alert.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <AlertCard 
              key={alert.id} 
              alert={alert} 
              onDismiss={onDismiss}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}