import { useNavigate } from 'react-router-dom';
import { Monitor, ArrowLeft, Smartphone } from 'lucide-react';
import { motion } from 'framer-motion';

interface MobileDesktopOnlyProps {
  feature: string;
  description?: string;
  alternativeAction?: {
    label: string;
    path: string;
  };
}

export function MobileDesktopOnly({
  feature,
  description = 'This feature requires a larger screen for the best experience.',
  alternativeAction
}: MobileDesktopOnlyProps) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-fw-wash to-fw-base">
      {/* Header */}
      <div className="bg-fw-base shadow-sm sticky top-0 z-10">
        <div className="px-4 py-4">
          <div className="flex items-center">
            <button
              onClick={() => navigate(-1)}
              className="mr-3 p-2 -ml-2 text-fw-bodyLight hover:text-fw-body rounded-full hover:bg-fw-wash transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-fw-heading">
                {feature}
              </h1>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        {/* Icon Animation */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, type: "spring" }}
          className="relative mb-8"
        >
          {/* Desktop icon */}
          <div className="bg-gradient-to-br from-fw-cobalt-700 to-fw-cobalt-800 rounded-3xl p-8 shadow-xl">
            <Monitor className="h-16 w-16 text-white" />
          </div>

          {/* Mobile icon badge */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
            className="absolute -bottom-2 -right-2 bg-fw-base rounded-full p-3 shadow-lg border-4 border-fw-wash"
          >
            <Smartphone className="h-6 w-6 text-fw-bodyLight" />
          </motion.div>
        </motion.div>

        {/* Text Content */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="max-w-sm"
        >
          <h2 className="text-2xl font-bold text-fw-heading mb-3">
            Desktop Experience
          </h2>
          <p className="text-fw-body mb-8 leading-relaxed">
            {description}
          </p>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="w-full max-w-sm space-y-3"
        >
          {alternativeAction && (
            <button
              onClick={() => navigate(alternativeAction.path)}
              className="w-full px-6 py-4 bg-gradient-to-r from-fw-cobalt-700 to-fw-cobalt-800 text-fw-linkPrimary rounded-xl font-medium hover:shadow-lg transition-all"
            >
              {alternativeAction.label}
            </button>
          )}

          <button
            onClick={() => navigate(-1)}
            className="w-full px-6 py-4 bg-fw-wash text-fw-body rounded-xl font-medium hover:bg-fw-neutral transition-colors"
          >
            Go Back
          </button>
        </motion.div>

        {/* Info Box */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-12 max-w-sm"
        >
          <div className="bg-fw-blue-light rounded-xl p-4 border border-fw-cobalt-100">
            <p className="text-figma-base text-fw-body">
              <span className="font-semibold text-fw-heading">Pro tip:</span> For the full experience, access this feature from a desktop or laptop computer with a screen width of at least 1024px.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
