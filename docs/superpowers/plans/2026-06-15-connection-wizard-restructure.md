# Connection Wizard Restructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the Create Connection wizard: (1) delete the dedicated naming step, (2) render the name field at the top of every step (validated only at submit), and (3) flip step order so **Connection Type comes before Provider** — which requires new reverse-filtering so the chosen connection type constrains which providers are selectable.

**Architecture:** Replace the wizard's brittle hardcoded numeric step indices (`step === 4`, `STEPS.length - 1`, `step >= 7 ? 1 : 0`, AWS-Max checks on steps 4/5/6/7) with a single ordered `STEP_KEYS` array and key-based logic. Add a reusable `WizardNameField` rendered above every step's content. Add `getAvailableProviders(connectionType)` (the inverse of the existing `getAvailableConnectionTypes`) and wire it into `ProviderSelection` to disable unsupported providers. Name is required only at the final submit, not as a per-step gate.

**Tech Stack:** React + TypeScript + Vite + Zustand, Vitest (unit), Playwright (e2e).

**Decisions (locked):**
- Remove the naming step entirely; name field lives at the top of every step.
- Name is required ONLY at submit (smart default pre-fill; user may explore first).
- Flip order: Connection Type first, then Provider.

**Sequencing note:** Run AFTER `2026-06-15-cloud-router-to-container-rename.md`. That plan deliberately leaves `cloudRouterName` untouched for this plan to own. If the rename has shipped, "Cloud Router" copy in the wizard is already "Container"; this plan renames the `cloudRouterName` state variable to `connectionName` as part of the restructure.

---

## Target Step Model

**Old order (8 steps, indices 0-7):** Name(0) → Provider(1) → Type(2) → Resiliency(3) → Locations(4) → Bandwidth(5) → Advanced/AWSAccount(6) → Review(7)

**New order (7 steps, indices 0-6):**

| Index | Key | Title | Was |
|---|---|---|---|
| 0 | `type` | Connection Type | step 2 |
| 1 | `provider` | Choose Provider | step 1 |
| 2 | `resiliency` | Resiliency | step 3 |
| 3 | `locations` | Locations | step 4 |
| 4 | `bandwidth` | Bandwidth | step 5 |
| 5 | `advanced` | Advanced Settings / AWS Account ID | step 6 |
| 6 | `review` | Review | step 7 |

Name step is gone. Name field renders above every step.

---

## File Structure

- Modify: `src/data/providerConnectionTypes.ts` — add `getAvailableProviders()` + tests
- Create: `src/data/providerConnectionTypes.test.ts` — unit tests for both directions
- Create: `src/components/wizard/WizardNameField.tsx` — the always-on name input
- Modify: `src/components/wizard/screens/ProviderSelection.tsx` — accept `selectedType`, disable unsupported providers
- Modify: `src/components/wizard/ConnectionWizard.tsx` — STEP_KEYS refactor, delete name step, render name field everywhere, flip order, reindex AWS-Max and Review logic, rename `cloudRouterName` → `connectionName`
- Modify: `src/components/wizard/screens/ReviewConfiguration.tsx` — update `onEditStep` targets to new indices/keys; prop rename `cloudRouterName` → `connectionName`
- Modify: `src/components/wizard/screens/AwsAccountIdStep.tsx` — prop `connectionName` already named correctly; verify
- Modify: `tests/e2e/create-connection.spec.ts` — update step order + remove name-step assertions

---

## Pre-flight

- [ ] **Step 1: Branch + baseline**

```bash
cd /Users/micahbos/Developer/att-netbond-sdci
git checkout -b feat/wizard-restructure
npm run typecheck && npm run build 2>&1 | tail -5
npx playwright test tests/e2e/create-connection.spec.ts 2>&1 | tail -10
```

Expected: clean baseline. Record the create-connection e2e result so you know what "passing" looked like before.

---

## Task 1: Reverse-filter data function (`getAvailableProviders`)

**Files:**
- Modify: `src/data/providerConnectionTypes.ts`
- Create: `src/data/providerConnectionTypes.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/data/providerConnectionTypes.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  getAvailableConnectionTypes,
  getAvailableProviders,
  PROVIDER_CONNECTION_TYPES,
} from './providerConnectionTypes';

describe('getAvailableProviders', () => {
  it('returns all providers when no connection type is selected', () => {
    const all = Object.keys(PROVIDER_CONNECTION_TYPES);
    expect(getAvailableProviders(undefined)).toEqual(all);
    expect(getAvailableProviders('')).toEqual(all);
  });

  it('limits "Cloud to Cloud" to the four hyperscalers', () => {
    expect(getAvailableProviders('Cloud to Cloud').sort()).toEqual(
      ['AWS', 'Azure', 'Google', 'Oracle'].sort()
    );
  });

  it('excludes IBM from "DataCenter/CoLocation to Cloud"', () => {
    const result = getAvailableProviders('DataCenter/CoLocation to Cloud');
    expect(result).not.toContain('IBM');
    expect(result).toContain('Equinix');
    expect(result).toContain('AWS');
  });

  it('excludes DC/colo-only providers from "Internet to Cloud"', () => {
    const result = getAvailableProviders('Internet to Cloud');
    expect(result).not.toContain('Centersquare');
    expect(result).not.toContain('DataBank');
    expect(result).toContain('IBM');
    expect(result).toContain('AWS');
  });

  it('is the exact inverse of getAvailableConnectionTypes', () => {
    for (const provider of Object.keys(PROVIDER_CONNECTION_TYPES)) {
      for (const type of PROVIDER_CONNECTION_TYPES[provider]) {
        expect(getAvailableProviders(type)).toContain(provider);
      }
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/data/providerConnectionTypes.test.ts`
Expected: FAIL — `getAvailableProviders is not a function`.

- [ ] **Step 3: Implement `getAvailableProviders`**

Append to `src/data/providerConnectionTypes.ts`:

```ts
/**
 * Get providers that support a given connection type.
 * Inverse of getAvailableConnectionTypes. When no type is selected,
 * every provider is available (the wizard shows all, none disabled).
 */
export function getAvailableProviders(connectionType: string | undefined): string[] {
  if (!connectionType) {
    return Object.keys(PROVIDER_CONNECTION_TYPES);
  }
  return Object.keys(PROVIDER_CONNECTION_TYPES).filter(provider =>
    PROVIDER_CONNECTION_TYPES[provider].includes(connectionType)
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/data/providerConnectionTypes.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add src/data/providerConnectionTypes.ts src/data/providerConnectionTypes.test.ts
git commit -m "feat(wizard): add getAvailableProviders for reverse type→provider filtering"
```

---

## Task 2: `ProviderSelection` disables unsupported providers

**Files:**
- Modify: `src/components/wizard/screens/ProviderSelection.tsx`

- [ ] **Step 1: Add `selectedType` prop and disable logic**

Update the props interface and component signature:

```tsx
import { getAvailableProviders } from '../../../data/providerConnectionTypes';

interface ProviderSelectionProps {
  selectedProviders: CloudProvider[];
  onToggle: (provider: CloudProvider) => void;
  selectedType?: string;
}

export function ProviderSelection({
  selectedProviders,
  onToggle,
  selectedType,
}: ProviderSelectionProps) {
  const availableProviders = getAvailableProviders(selectedType);
  // ...
```

- [ ] **Step 2: Apply disabled state in the provider grid**

Inside the `CLOUD_PROVIDERS.map(...)`, compute disabled and block selection/visually mute disabled cards:

```tsx
{CLOUD_PROVIDERS.map((provider) => {
  const isSelected = selectedProviders.includes(provider.id);
  const isDisabled = !availableProviders.includes(provider.id);
  return (
    <div key={provider.id} className="relative flex">
      <button
        onClick={() => !isDisabled && onToggle(provider.id)}
        disabled={isDisabled}
        className={`
          w-full py-12 px-8 border-2 rounded-2xl wizard-card network-option transition-all duration-200
          ${isDisabled
            ? 'border-fw-secondary bg-fw-wash opacity-40 cursor-not-allowed'
            : isSelected
              ? 'border-fw-active bg-fw-primary shadow-lg transform scale-[1.02]'
              : 'border-fw-secondary bg-fw-wash hover:border-fw-active/50 hover:bg-fw-base'
          }
        `}
      >
        {/* existing img/fallback block unchanged */}
      </button>
      {isSelected && !isDisabled && (
        <div className="absolute top-3 right-3">
          <CheckCircle2 className="h-6 w-6 text-white drop-shadow-md" />
        </div>
      )}
      {isDisabled && (
        <span className="absolute top-3 left-3 inline-flex items-center px-2 py-0.5 rounded-[8px] text-[10px] font-medium"
          style={{ color: '#686e74', backgroundColor: 'rgba(104,110,116,0.16)' }}>
          Not available for this type
        </span>
      )}
    </div>
  );
})}
```

Update the helper sub-copy to reflect the new flow:

```tsx
<p className="text-figma-sm text-fw-bodyLight mt-2">
  {selectedType
    ? `Providers that support ${selectedType}`
    : 'Choose one or more providers for your connection'}
</p>
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: error at the `ConnectionWizard.tsx` callsite (missing `selectedType` is optional, so this should actually pass) — confirm clean. The callsite wiring happens in Task 4.

- [ ] **Step 4: Commit**

```bash
git add src/components/wizard/screens/ProviderSelection.tsx
git commit -m "feat(wizard): ProviderSelection disables providers unsupported by chosen connection type"
```

---

## Task 3: `WizardNameField` shared component

**Files:**
- Create: `src/components/wizard/WizardNameField.tsx`

- [ ] **Step 1: Create the component**

```tsx
interface WizardNameFieldProps {
  value: string;
  onChange: (value: string) => void;
  /** Show the required-but-empty error styling (only true after a submit attempt). */
  showError?: boolean;
}

export function WizardNameField({ value, onChange, showError = false }: WizardNameFieldProps) {
  return (
    <div className="max-w-3xl mx-auto mb-8">
      <label className="block text-figma-sm font-semibold text-fw-heading mb-1.5">
        Connection name
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
          Give your connection a name before creating it.
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: clean (component is standalone).

- [ ] **Step 3: Commit**

```bash
git add src/components/wizard/WizardNameField.tsx
git commit -m "feat(wizard): add always-on WizardNameField component"
```

---

## Task 4: `ConnectionWizard` — STEP_KEYS refactor + delete name step + flip order

This is the core change. Done as one coherent edit so the file compiles at the end. **File:** `src/components/wizard/ConnectionWizard.tsx`.

- [ ] **Step 1: Replace the `STEPS` constant with a keyed model**

Replace lines 41-50 (`const STEPS = [...]`) with:

```tsx
type StepKey = 'type' | 'provider' | 'resiliency' | 'locations' | 'bandwidth' | 'advanced' | 'review';

const STEP_KEYS: StepKey[] = ['type', 'provider', 'resiliency', 'locations', 'bandwidth', 'advanced', 'review'];

const STEP_META: Record<StepKey, { title: string; description: string }> = {
  type:       { title: 'Connection Type', description: 'Select how you want to connect' },
  provider:   { title: 'Choose Provider',  description: 'Select your cloud service provider' },
  resiliency: { title: 'Resiliency',       description: 'Choose your resiliency level' },
  locations:  { title: 'Locations',        description: 'Select datacenter locations' },
  bandwidth:  { title: 'Bandwidth',        description: 'Configure bandwidth per connection' },
  advanced:   { title: 'Advanced Settings',description: 'Configure network settings' },
  review:     { title: 'Review',           description: 'Review your selections' },
};

const STEPS = STEP_KEYS.map(k => STEP_META[k]);
```

- [ ] **Step 2: Rename the name state and fix its initializer**

Replace the `cloudRouterName` state (lines 93-106) — rename to `connectionName`, drop the AWS-Max-only condition coupling (still pre-fill a smart default):

```tsx
const [connectionName, setConnectionName] = useState(() => {
  if (locationState?.cloudRouterName || locationState?.connectionName) {
    return locationState.connectionName ?? locationState.cloudRouterName;
  }
  if (
    locationState?.selectedProviders?.includes('AWS') &&
    locationState?.resiliencyLevel === 'maximum'
  ) {
    const metroId = (locationState?.selectedLocations?.AWS || [])[0];
    const metro = metroId ? getMetroById(metroId) : null;
    const city = metro?.name?.split(',')[0] || 'San Jose';
    return `NetBond Max - ${city}`;
  }
  return '';
});
const [nameError, setNameError] = useState(false);
```

Then replace EVERY other reference to `cloudRouterName`/`setCloudRouterName` in the file with `connectionName`/`setConnectionName` (initial-step default, `handleModeChange` reset at line 295, `handleComplete` baseName at line 407, AwsAccountIdStep props at lines 672-673, ReviewConfiguration prop at line 820).

- [ ] **Step 3: Fix the initial step index (no more name step; template starts at resiliency)**

Replace line 92:

```tsx
const [step, setStep] = useState(
  locationState?.initialStep ?? (template ? STEP_KEYS.indexOf('resiliency') : 0)
);
```

> Rationale: a template pre-fills provider + connection type, so a templated flow should open on Resiliency. A fresh flow opens on Connection Type (index 0).

- [ ] **Step 4: Replace `EFFECTIVE_STEPS` dynamic-title logic to key off `advanced`**

Replace lines 165-171:

```tsx
const advancedIdx = STEP_KEYS.indexOf('advanced');
const EFFECTIVE_STEPS = STEPS.map((s, i) =>
  i === advancedIdx && isAwsMax
    ? isGa
      ? { ...s, title: 'Configure connection', description: 'Choose metro, bandwidth, and AWS account' }
      : { ...s, title: 'AWS Account ID', description: 'Your 12-digit AWS account number' }
    : s
);
```

- [ ] **Step 5: Rewrite `canProceed` to switch on step key (no name gate)**

Replace the `switch (step)` body (lines 318-352). Name is NOT gated here (required only at submit):

```tsx
const stepKey = STEP_KEYS[step];
switch (stepKey) {
  case 'type':
    return !!selectedType;
  case 'provider':
    return selectedProviders.length > 0;
  case 'resiliency':
    return resiliencyLevel !== '';
  case 'locations': {
    if (selectedProviders.length > 0) {
      return selectedProviders.every(p => {
        const locs = (selectedLocations[p] || []).length;
        if (p === 'AWS' && resiliencyLevel === 'maximum' && selectedType === 'Internet to Cloud') {
          return locs >= 1;
        }
        const tier = (resiliencyLevel || 'standard') as 'standard' | 'maximum' | 'geodiversity';
        return locs >= getMinLocations(p, tier);
      });
    }
    return !!selectedLocation;
  }
  case 'bandwidth':
    return true;
  case 'advanced':
    return isAwsMax ? isValidAwsAccountId(awsAccountId) : true;
  case 'review':
    return true;
  default:
    return false;
}
```

> Keep the `if (isPasteKey) {...}` block above this switch unchanged.

- [ ] **Step 6: Clear incompatible providers when the connection type changes**

In the `ConnectionTypeSelection` render block (currently step 2, lines 722-732), the `onSelect` advances to resiliency. Update it to: set type, prune now-unsupported providers, then advance to the provider step (index 1):

```tsx
{stepKey === 'type' && (
  <ConnectionTypeSelection
    selectedType={selectedType}
    provider={selectedProvider}
    providers={selectedProviders}
    onSelect={(type) => {
      setSelectedType(type);
      const allowed = getAvailableProviders(type);
      setSelectedProviders(prev => prev.filter(p => allowed.includes(p)));
      setStep(STEP_KEYS.indexOf('provider'));
    }}
  />
)}
```

Add the import at top: `import { getAvailableProviders } from '../../data/providerConnectionTypes';`

- [ ] **Step 7: Wire `selectedType` into ProviderSelection and key its render block**

Replace the step-1 provider block (lines 715-720):

```tsx
{stepKey === 'provider' && (
  <ProviderSelection
    selectedProviders={selectedProviders}
    onToggle={toggleProvider}
    selectedType={selectedType}
  />
)}
```

- [ ] **Step 8: Convert all remaining numeric `step === N` render guards to `stepKey === '...'`**

Map every guard in `renderContent`:

| Old guard | New guard |
|---|---|
| `step === 0` (name block, lines 645-661) | **delete this whole block** |
| `step === 6 && isAwsMax` (AWS account, 664) | `stepKey === 'advanced' && isAwsMax` |
| `isAwsMax && step === 4` (AWS max location, 687) | `isAwsMax && stepKey === 'locations'` |
| `isAwsMax && step === 5` (AWS max bandwidth, 697) | `isAwsMax && stepKey === 'bandwidth'` |
| `step >= 1 && step <= 6 && ... !(isAwsMax && (step===4||5||6))` (711) | `stepKey !== 'review' && !isPasteKey && !(isAwsMax && (stepKey==='locations'||stepKey==='bandwidth'||stepKey==='advanced'))` |
| `step === 3` resiliency (734) | `stepKey === 'resiliency'` |
| `step === 4` locations (744) | `stepKey === 'locations'` |
| `step === 5` bandwidth (759) | `stepKey === 'bandwidth'` |
| `step === 6` advanced (770) | `stepKey === 'advanced'` |
| `step === 7` review (817) | `stepKey === 'review'` |

> The flex+sidebar wrapper guard (old `step >= 1 && step <= 6`) must now include the `type` and `provider` steps (indices 0-1) and exclude `review`. The replacement `stepKey !== 'review'` covers all content steps; the AWS-Max exclusions are by key.

- [ ] **Step 9: Render the name field above every step's content**

Inside `renderContent`'s `default:` branch, immediately after the `PhaseIndicator` blocks and before the step content (around line 619, before the `showAI` NetworkAI block), insert:

```tsx
{!isPasteKey && (
  <WizardNameField
    value={connectionName}
    onChange={(v) => { setConnectionName(v); if (v.trim()) setNameError(false); }}
    showError={nameError}
  />
)}
```

Add import: `import { WizardNameField } from './WizardNameField';`

> This single placement renders the field on all non-paste steps including Review, satisfying "name at the top of every step."

- [ ] **Step 10: Fix the AWS-Max and paste steppers' `currentPhase`**

Replace `currentPhase={step >= 7 ? 1 : 0}` (line 602) with `currentPhase={stepKey === 'review' ? 1 : 0}`. The paste stepper (line 614) is unchanged. The NetworkAI `onNextStep` clamp (line 628) already uses `EFFECTIVE_STEPS.length - 1` — leave as is (still correct, now 7 entries).

- [ ] **Step 11: Fix the footer Back/Next/Submit index logic**

- Back button guard (line 874): `step > 0` is still correct (index 0 = type, no back).
- Submit detection (line 897): replace `step === STEPS.length - 1` with `stepKey === 'review'`.
- Submit `onClick`: in the non-AWS branch (line 911), prepend the name-required check:

```tsx
} else if (selectedProvider && selectedType && selectedBandwidth && selectedLocation) {
  if (!connectionName.trim()) {
    setNameError(true);
    setError('Please name your connection before creating it.');
    return;
  }
  handleComplete({ provider: selectedProvider, type: selectedType, bandwidth: selectedBandwidth, location: selectedLocation, ...config });
}
```

Also guard the AWS-Max submit branch (line 900) the same way before `handleComplete`.

- [ ] **Step 12: Typecheck and fix fallout**

Run: `npm run typecheck`
Expected: errors only where a `step ===`/`cloudRouterName` reference was missed. Fix each. Re-run until clean.

- [ ] **Step 13: Commit**

```bash
git add src/components/wizard/ConnectionWizard.tsx
git commit -m "refactor(wizard): STEP_KEYS model, delete name step, flip type↔provider, name field on every step"
```

---

## Task 5: `ReviewConfiguration` edit-step targets + prop rename

**Files:**
- Modify: `src/components/wizard/screens/ReviewConfiguration.tsx`

- [ ] **Step 1: Audit the onEditStep targets**

```bash
rg -n 'onEditStep\|cloudRouterName' src/components/wizard/screens/ReviewConfiguration.tsx
```

Any `onEditStep(N)` call uses OLD numeric indices. Map them to the NEW order via the table in "Target Step Model": e.g. edit-provider was `onEditStep(1)` and stays index `1`; edit-type was `onEditStep(2)` → now `0`; edit-resiliency `3`→`2`; locations `4`→`3`; bandwidth `5`→`4`; advanced `6`→`5`.

- [ ] **Step 2: Apply the index remap and rename the prop**

Update each `onEditStep(N)` to its new index. Rename the prop `cloudRouterName` → `connectionName` in the props interface and all usages (the heading/summary that displays the name).

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: clean (the wizard now passes `connectionName={connectionName}`).

- [ ] **Step 4: Commit**

```bash
git add src/components/wizard/screens/ReviewConfiguration.tsx
git commit -m "fix(wizard): remap Review edit-step targets to new order, rename name prop"
```

---

## Task 6: e2e — update create-connection flow

**Files:**
- Modify: `tests/e2e/create-connection.spec.ts`

- [ ] **Step 1: Read the current spec to see its step assumptions**

```bash
rg -n "Cloud Router\|Choose Provider\|Connection Type\|Name Your\|step" tests/e2e/create-connection.spec.ts
```

- [ ] **Step 2: Update the spec to the new flow**

Rewrite the happy-path so it: (a) does NOT expect a dedicated name step, (b) selects Connection Type FIRST, then Provider, (c) confirms the name input is visible on every step, (d) leaves the name empty until the final step and asserts the submit shows the required-name error, then fills it and submits successfully. Confirm a provider unsupported by the chosen type renders disabled ("Not available for this type").

- [ ] **Step 3: Run the spec**

Run: `npx playwright test tests/e2e/create-connection.spec.ts`
Expected: PASS. Debug failures against the running app — most will be selector/order updates.

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/create-connection.spec.ts
git commit -m "test(wizard): update create-connection e2e for new step order and name field"
```

---

## Task 7: Manual verification in the browser

- [ ] **Step 1: Walk the full flow as a user**

Start the dev server. Create a connection from scratch:
1. Confirm the first step is **Connection Type** (not name, not provider).
2. Confirm the **name input is visible at the top** of this and every subsequent step.
3. Pick "Cloud to Cloud" → advance → confirm only AWS/Azure/Google/Oracle are selectable; the rest are visibly disabled with "Not available for this type."
4. Go back, change to "Internet to Cloud" → confirm Centersquare/DataBank become disabled and any previously-selected incompatible provider was dropped.
5. Walk to Review WITHOUT naming → click Create → confirm the inline required-name error appears and submission is blocked.
6. Fill the name → submit → confirm the connection is created and the name persists (refresh the Manage page and confirm the row survived).
7. Confirm the phase indicator shows 7 steps in the new order and "Step n of 7" tracking is correct.

- [ ] **Step 2: Verify AWS Max path still works**

Trigger AWS + Maximum + Internet to Cloud and confirm the collapsed 2-phase stepper, the AWS Account step (now keyed `advanced`), and submit all function — name field present and validated at submit.

- [ ] **Step 3: Final gates**

```bash
npm run typecheck && npm run build && npx vitest run && npx playwright test
```

Expected: all green.

---

## Self-Review Checklist

- **No numeric step literals remain** in `ConnectionWizard.tsx` for routing decisions — `rg -n 'step === [0-9]' src/components/wizard/ConnectionWizard.tsx` returns nothing (only `step > 0` for the Back button is acceptable).
- **Name field on every step including Review**, and validated ONLY at submit (never gates `canProceed`).
- **Flip is real and safe:** Connection Type is index 0; Provider is index 1 and disables unsupported providers via `getAvailableProviders`; changing type prunes incompatible already-selected providers.
- **`cloudRouterName` fully renamed** to `connectionName` across wizard, Review, and AwsAccountIdStep.
- **Review edit links jump to the correct new indices** (remapped, not stale).
- **AWS Max + paste-key flows** still route correctly under the key model.
- **No placeholders:** every guard remap from the Step-8 table is applied; no `// TODO`.
