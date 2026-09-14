// Builder-layer contract: studies authored without code.
// Verification is declarative (catalog refs) so studies can round-trip as JSON.
import type { TestPersona, TestTask } from './testLab';

export interface VerifierRef { catalogId: string; params?: Record<string, unknown> }

export type CustomTask = Omit<TestTask, 'verifyId' | 'reseedId' | 'catchUpSeedId'> & {
  verifierRef?: VerifierRef;
};

export interface CustomStudy {
  id: string;               // kebab-case, e.g. 'network-planner-ga-r1'
  feature: string;
  featureVersion: string;   // e.g. 'GA 1116'
  persona: TestPersona;     // snapshot (seedId ignored; conversion forces record-baseline)
  tasks: CustomTask[];
  inviteCodes: string[];
  previewCodes: string[];
  createdAt: string;
  updatedAt: string;
}

export interface StudyExport { schemaVersion: 1; study: CustomStudy }
