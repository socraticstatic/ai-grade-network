import { useState } from 'react';
import { providerColor } from '../../utils/providerColors';

// Bundled brand marks (local SVGs) so logos always render offline / behind a
// strict CSP — the app ships as a static demo. Keyed by lowercased provider name.
import awsLogo from '../../assets/providers/aws.svg';
import azureLogo from '../../assets/providers/azure.svg';
import googleLogo from '../../assets/providers/google.svg';
import oracleLogo from '../../assets/providers/oracle.svg';
import equinixLogo from '../../assets/providers/equinix.svg';
import digitalRealtyLogo from '../../assets/providers/digitalrealty.svg';

const PROVIDER_LOGO: Record<string, string> = {
  aws: awsLogo,
  azure: azureLogo,
  google: googleLogo,
  gcp: googleLogo,
  oracle: oracleLogo,
  equinix: equinixLogo,
  'digital realty': digitalRealtyLogo,
  digitalrealty: digitalRealtyLogo,
};

export function providerLogoUrl(provider?: string): string | null {
  if (!provider) return null;
  return PROVIDER_LOGO[provider.toLowerCase()] ?? null;
}

interface ProviderLogoProps {
  provider: string;
  size?: number;
  className?: string;
}

/**
 * Small provider brand mark. Falls back to a branded monogram (first letter on the
 * provider's brand color) when there's no bundled logo or the image fails to load.
 */
export function ProviderLogo({ provider, size = 16, className = '' }: ProviderLogoProps) {
  const [failed, setFailed] = useState(false);
  const url = providerLogoUrl(provider);
  const showMonogram = !url || failed;

  return (
    <span
      className={`relative inline-flex items-center justify-center rounded-[3px] overflow-hidden shrink-0 ${className}`}
      style={{ width: size, height: size }}
      title={provider}
    >
      {showMonogram ? (
        <span
          aria-hidden
          className="absolute inset-0 flex items-center justify-center text-white font-bold"
          style={{ fontSize: Math.round(size * 0.58), backgroundColor: providerColor(provider) }}
        >
          {provider.charAt(0).toUpperCase()}
        </span>
      ) : (
        <img
          src={url!}
          alt={`${provider} logo`}
          onError={() => setFailed(true)}
          loading="lazy"
          className="w-full h-full object-contain bg-white"
        />
      )}
    </span>
  );
}
