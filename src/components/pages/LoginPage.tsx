import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Globe, ArrowRight, Users } from 'lucide-react';

export function LoginPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const handleSSOLogin = (provider: string) => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      navigate('/onboarding');
    }, 800);
  };

  return (
    <div className="min-h-screen flex flex-col bg-fw-accent">
      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-8">
        <div className="w-full max-w-[596px]">
          {/* Trials badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg mb-4">
            <span className="w-2 h-2 rounded-full bg-fw-success" />
            <span className="text-figma-sm font-medium text-fw-success tracking-[-0.03em] uppercase">
              Trials are now available
            </span>
          </div>

          {/* Branding */}
          <h1 className="text-[48px] font-bold text-fw-heading tracking-[-0.03em] mb-10">
            AT&T AI-grade network
          </h1>

          {/* SSO Login buttons */}
          <div className="flex flex-col gap-4">
            <button
              onClick={() => handleSSOLogin('businesscenter')}
              disabled={isLoading}
              className="flex items-center w-full h-[88px] px-5 bg-white/60 backdrop-blur-sm rounded-2xl border border-white/80 hover:bg-white/80 hover:border-fw-active transition-all group"
            >
              <div className="w-[56px] h-[56px] rounded-xl bg-fw-primary flex items-center justify-center shrink-0">
                <Building2 className="w-7 h-7 text-white" />
              </div>
              <div className="ml-4 text-left flex-1">
                <div className="flex items-center gap-1.5 text-figma-sm font-medium text-fw-body tracking-[-0.03em] mb-0.5">
                  <Building2 className="w-3.5 h-3.5" />
                  Customers
                </div>
                <div className="text-figma-lg font-bold text-fw-heading tracking-[-0.03em]">
                  Login with BusinessCenter
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-fw-bodyLight group-hover:text-fw-heading transition-colors shrink-0" />
            </button>

            <button
              onClick={() => handleSSOLogin('globallogon')}
              disabled={isLoading}
              className="flex items-center w-full h-[88px] px-5 bg-white/60 backdrop-blur-sm rounded-2xl border border-white/80 hover:bg-white/80 hover:border-fw-active transition-all group"
            >
              <div className="w-[56px] h-[56px] rounded-xl bg-[#009fdb] flex items-center justify-center shrink-0">
                <Globe className="w-7 h-7 text-white" />
              </div>
              <div className="ml-4 text-left flex-1">
                <div className="flex items-center gap-1.5 text-figma-sm font-medium text-fw-body tracking-[-0.03em] mb-0.5">
                  <Users className="w-3.5 h-3.5" />
                  Employees
                </div>
                <div className="text-figma-lg font-bold text-fw-heading tracking-[-0.03em]">
                  Login with AT&T Global Logon
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-fw-bodyLight group-hover:text-fw-heading transition-colors shrink-0" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
