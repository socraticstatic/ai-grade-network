// Contract between the Test Lab engine and Study Packs.
// Engine and packs may both import this file; nothing else is shared.
import type { RoleName } from './rbac';

export type TaskPath = 'happy' | 'permission-wall' | 'bad-input';
export type TaskOutcome = 'verified' | 'claimed' | 'gave-up' | 'skipped';
export type Directness = 'direct' | 'indirect' | 'n/a';
export type TestLabPhase = 'briefing' | 'in-task' | 'wrap-up' | 'submitted';

export interface TestPersona {
  id: string;
  name: string;
  bio: string;
  goal: string;
  rbacRole: RoleName;
  seedId: string;
}

export interface ComprehensionCheck {
  question: string;
  options: string[];
  correctIndex: number;
}

export interface TestTask {
  id: string;
  version: number;
  title: string;
  /** Participant-facing, user-goal language. */
  scenario: string;
  /** Author/logger only. NEVER rendered to participants. */
  successCriteria: string;
  path: TaskPath;
  verifyId?: string;
  comprehensionCheck?: ComprehensionCheck;
  hints: string[];
  startRoute?: string;
  /** Seed applied when this task starts (fresh state). */
  reseedId?: string;
  /** Seed applied when the PREVIOUS task did not verify. */
  catchUpSeedId?: string;
  /** Route prefixes for direct-completion classification. */
  expectedRoutePrefixes?: string[];
}

export interface TestScript {
  id: string;
  personaId: string;
  taskIds: string[];
  /** Shuffle task order per participant (seeded by sessionId) to break
   *  learning-order contamination. Use only when tasks are independent. */
  randomizeTaskOrder?: boolean;
  inviteCodes: string[];
  previewCodes: string[];
}

/** Store state is intentionally loose here to avoid an engine↔store type cycle. */
export type VerifierFn = (state: Record<string, any>) => boolean;
export type SeedFn = (api: {
  set: (partial: Record<string, any>) => void;
  get: () => Record<string, any>;
}) => void;

export interface StudyPack {
  id: string;
  feature: string;
  featureVersion: string;
  personas: TestPersona[];
  tasks: TestTask[];
  scripts: TestScript[];
  verifiers: Record<string, VerifierFn>;
  seeds: Record<string, SeedFn>;
}

export interface RouteHop { route: string; at: number }
export interface IssueReport { text: string; route: string; at: number }
export interface FirstClick { label: string; route: string }

export interface TaskResult {
  taskId: string;
  taskVersion: number;
  path: TaskPath;
  outcome: TaskOutcome;
  startedAt: number;
  endedAt: number;
  durationMs: number;
  hintsUsed: number;
  verified: boolean;
  directness: Directness;
  comprehensionCorrect?: boolean;
  /** The option text the participant picked — the wrong answer names the misconception. */
  comprehensionAnswer?: string;
  /** One-tap reason captured at the give-up moment. */
  giveUpReason?: string;
  /** SEQ, 1–7 */
  easeRating?: number;
  comment?: string;
  firstClick?: FirstClick;
  routeTrail: RouteHop[];
  issues: IssueReport[];
}

export interface WrapUp {
  /** UMUX-Lite item 1: capabilities meet requirements, 1–7 */
  umuxCapabilities: number;
  /** UMUX-Lite item 2: easy to use, 1–7 */
  umuxEaseOfUse: number;
  likedMost: string;
  likedLeast: string;
}

export interface TestLabSession {
  sessionId: string;
  inviteCode: string;
  preview: boolean;
  participantName: string;
  packId: string;
  feature: string;
  featureVersion: string;
  scriptId: string;
  personaId: string;
  appBuild: string;
  userAgent: string;
  startedAt: number;
  completedAt?: number;
  phase: TestLabPhase;
  taskIndex: number;
  /** Resolved task order for this session (shuffled when the script asks). */
  taskOrder?: string[];
  // live runtime for the current task
  taskStartedAt?: number;
  hintsRevealed: number;
  verifiedAt?: number;
  firstClick?: FirstClick;
  routeTrail: RouteHop[];
  issues: IssueReport[];
  results: TaskResult[];
  storeRestored: boolean;
  wrapUp?: WrapUp;
}
