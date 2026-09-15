import type { ProviderStatus } from "../domain/providers.ts";
import { transitionProviderSubmission } from "./lifecycle.ts";
import type { ProviderSubmissionRecord } from "./submissionTypes.ts";

let browserFallbackRecords: ProviderSubmissionRecord[] = [];

export interface ProviderSubmissionRepository {
  list(): ProviderSubmissionRecord[];
  save(record: ProviderSubmissionRecord): void;
  updateStatus(id: string, status: ProviderStatus): ProviderSubmissionRecord;
  get(id: string): ProviderSubmissionRecord | null;
}

export class InMemoryProviderSubmissionRepository implements ProviderSubmissionRepository {
  private records: ProviderSubmissionRecord[];

  constructor(initialRecords: ProviderSubmissionRecord[] = []) {
    this.records = [...initialRecords];
  }

  list(): ProviderSubmissionRecord[] {
    return [...this.records];
  }

  save(record: ProviderSubmissionRecord): void {
    this.records = [record, ...this.records.filter((existing) => existing.id !== record.id)];
  }

  get(id: string): ProviderSubmissionRecord | null {
    return this.records.find((record) => record.id === id) ?? null;
  }

  updateStatus(id: string, status: ProviderStatus): ProviderSubmissionRecord {
    const record = this.get(id);
    if (!record) {
      throw new Error("Provider submission was not found.");
    }

    const updated = transitionProviderSubmission(record, status);
    this.save(updated);
    return updated;
  }
}

export class BrowserProviderSubmissionRepository implements ProviderSubmissionRepository {
  private readonly storageKey: string;

  constructor(storageKey = "mechanicmatchfl.providerSubmissions.v1") {
    this.storageKey = storageKey;
  }

  private getStorage(): Storage | null {
    if (typeof window === "undefined" || !window.localStorage) {
      return null;
    }

    try {
      const testKey = `${this.storageKey}.test`;
      window.localStorage.setItem(testKey, "1");
      window.localStorage.removeItem(testKey);
      return window.localStorage;
    } catch {
      return null;
    }
  }

  list(): ProviderSubmissionRecord[] {
    const storage = this.getStorage();

    if (!storage) {
      return [...browserFallbackRecords];
    }

    const raw = storage.getItem(this.storageKey);
    if (!raw) {
      return [];
    }

    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  save(record: ProviderSubmissionRecord): void {
    const records = [record, ...this.list().filter((existing) => existing.id !== record.id)];
    const storage = this.getStorage();

    if (!storage) {
      browserFallbackRecords = records;
      return;
    }

    storage.setItem(this.storageKey, JSON.stringify(records));
  }

  get(id: string): ProviderSubmissionRecord | null {
    return this.list().find((record) => record.id === id) ?? null;
  }

  updateStatus(id: string, status: ProviderStatus): ProviderSubmissionRecord {
    const record = this.get(id);
    if (!record) {
      throw new Error("Provider submission was not found.");
    }

    const updated = transitionProviderSubmission(record, status);
    this.save(updated);
    return updated;
  }
}
