import { CanonicalRecord, LiteratureSource } from '../../types/database';

export interface SearchQueryOptions {
  bookId?: string;
  limit?: number;
  dateStart?: string;
  dateEnd?: string;
  politeEmail?: string;
  signal?: AbortSignal;
}

export interface SearchAdapterMetadata {
  readonly id: LiteratureSource;
  readonly name: string;
  readonly shortName: string;
  readonly description: string;
  readonly badgeClass: string;
  readonly politePool: boolean;
  readonly freeTierInfo: string;
  readonly defaultEnabled: boolean;
  readonly docsUrl?: string;
}

/**
 * Adapter Pattern Interface for Literature Search Sources
 */
export interface SearchAdapter {
  readonly id: LiteratureSource;
  readonly metadata: SearchAdapterMetadata;
  search(query: string, options?: SearchQueryOptions): Promise<CanonicalRecord[]>;
  testConnection?(options?: SearchQueryOptions): Promise<boolean>;
}

export interface AdapterQueryResult {
  source: LiteratureSource;
  adapterName: string;
  records: CanonicalRecord[];
  count: number;
  latencyMs: number;
  error?: string;
  isFallback?: boolean;
}

export interface MultiSourceSearchResult {
  query: string;
  resultsBySource: Record<string, AdapterQueryResult>;
  allRecords: CanonicalRecord[];
  totalCount: number;
  activeSources: LiteratureSource[];
}
