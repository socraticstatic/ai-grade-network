import { useNavigate } from 'react-router-dom';
import {
  Settings, Users, DollarSign, FileText, Shield, Globe,
  ChevronRight, ArrowLeft, Bell, User as UserIcon
} from 'lucide-react';
import { motion } from 'framer-motion';

const configSections = [
  {
    id: 'users',
    title: 'User Management',
    description: 'Manage users, roles, and permissions',
    icon: Users,
    gradient: 'from-fw-blue-functional to-fw-blue-000',
    path: '/configure/users'
  },
  {
    id: 'billing',
    title: 'Billing & Usage',
    description: 'View billing, invoices, and usage metrics',
    icon: DollarSign,
    gradient: 'from-complementary-green to-fw-green-400',
    path: '/configure/billing'
  },
  {
    id: 'reporting',
    title: 'Reporting',
    description: 'Configure reports and schedules',
    icon: FileText,
    gradient: 'from-fw-cobalt-600 to-fw-blue-100',
    path: '/configure/reporting'
  },
  {
    id: 'policies',
    title: 'Policies',
    description: 'Network policies and configurations',
    icon: Shield,
    gradient: 'from-complementary-orange to-fw-orange-600',
    path: '/configure/policies'
  },
  {
    id: 'partners',
    title: 'Partners',
    description: 'Manage partner integrations',
    icon: Globe,
    gradient: 'from-fw-cobalt-700 to-fw-blue-functional',
    path: '/configure/partners'
  },
  {
    id: 'system',
    title: 'System Settings',
    description: 'General system configuration',
    icon: Settings,
    gradient: 'from-fw-gray-700 to-fw-gray-900',
    path: '/configure/system'
  },
];

export function MobileConfigureHub() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-fw-wash to-fw-base">
      {/* Elegant Header */}
      <div className="bg-fw-base shadow-sm sticky top-0 z-10">
        <div className="px-4 pt-6 pb-4">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center flex-1">
              <button
                onClick={() => navigate(-1)}
                className="mr-3 p-2 -ml-2 text-fw-bodyLight hover:text-fw-body rounded-full hover:bg-fw-wash transition-colors"
                aria-label="Go back"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-figma-xl font-bold text-fw-heading tracking-[-0.03em] mb-1">
                  Configure
                </h1>
                <p className="text-figma-sm font-medium text-fw-bodyLight">
                  System settings & preferences
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => navigate('/notifications')}
                className="relative p-3 text-fw-bodyLight hover:text-fw-heading rounded-full hover:bg-fw-wash transition-colors"
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5" />
                <span className="absolute top-2 right-2 h-2 w-2 bg-fw-error rounded-full"></span>
              </button>
              <button
                onClick={() => navigate('/profile')}
                className="p-3 text-fw-bodyLight hover:text-fw-heading rounded-full hover:bg-fw-wash transition-colors"
                aria-label="Profile"
              >
                <UserIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Configuration Sections */}
      <div className="p-4 space-y-3 pb-24">
        {configSections.map((section, index) => (
          <motion.div
            key={section.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => {
              window.addToast({
                type: 'info',
                title: 'Desktop Only',
                message: `${section.title} is optimized for desktop viewing`,
                duration: 3000
              });
            }}
            className="bg-fw-base rounded-2xl border border-fw-secondary shadow-sm overflow-hidden active:scale-[0.98] transition-all"
          >
            <div className="p-4">
              <div className="flex items-center">
                {/* Icon with gradient background */}
                <div className={`flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br ${section.gradient} flex items-center justify-center mr-4`}>
                  <section.icon className="h-6 w-6 text-white" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-figma-base font-bold text-fw-heading mb-0.5">
                    {section.title}
                  </h3>
                  <p className="text-figma-sm font-medium text-fw-bodyLight truncate">
                    {section.description}
                  </p>
                </div>

                {/* Chevron */}
                <ChevronRight className="h-5 w-5 text-fw-border-secondary flex-shrink-0 ml-2" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Info Card */}
      <div className="px-4 pb-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-gradient-to-br from-fw-blue-light to-fw-cobalt-100 rounded-2xl p-4 border border-fw-border-secondary"
        >
          <div className="flex items-start">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-fw-cobalt-100 flex items-center justify-center mr-3">
              <Settings className="h-5 w-5 text-fw-cobalt-600" />
            </div>
            <div className="flex-1">
              <h4 className="text-figma-sm font-semibold text-fw-heading mb-1">
                Desktop Experience
              </h4>
              <p className="text-figma-sm text-fw-body leading-relaxed">
                Configuration settings are optimized for desktop screens where you can view detailed settings, manage complex configurations, and access advanced features.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
