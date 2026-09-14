interface WizardNameFieldProps {
  value: string;
  onChange: (value: string) => void;
  /** Show the required-but-empty error styling (only true after a submit attempt). */
  showError?: boolean;
}

export function WizardNameField({ value, onChange, showError = false }: WizardNameFieldProps) {
  return (
    <div className="mb-8">
      <label className="block text-figma-sm font-semibold text-fw-heading mb-1.5">
        Hub Name
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="e.g., Production-Finance-East-01"
        className={`w-full h-9 px-3 rounded-lg border text-figma-base font-medium text-fw-heading placeholder:text-fw-bodyLight focus:ring-fw-active focus:outline-none ${
          showError ? 'border-fw-error focus:border-fw-error' : 'border-fw-primary focus:border-fw-active'
        }`}
      />
      {showError && (
        <p className="mt-1.5 text-figma-xs font-medium text-fw-error">
          Give your hub a name before creating it.
        </p>
      )}
    </div>
  );
}
