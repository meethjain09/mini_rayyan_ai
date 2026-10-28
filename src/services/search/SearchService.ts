import { CanonicalRecord, LiteratureSource } from '../../types/database';
import {
  AdapterQueryResult,
  MultiSourceSearchResult,
  SearchAdapter,
  SearchAdapterMetadata,
  SearchQueryOptions,
} from './types';
import { OpenAlexAdapter } from './adapters/OpenAlexAdapter';
import { CrossrefAdapter } from './adapters/CrossrefAdapter';
import { SemanticScholarAdapter } from './adapters/SemanticScholarAdapter';

/**
 * SearchService (Orchestrator / Adapter Registry)
 * Implements the Adapter Pattern for scholarly literature metadata retrieval.
 * Allows dynamic registration, capability introspection, and parallel dispatching.
 */
export class SearchService {
  private adapters: Map<LiteratureSource, SearchAdapter> = new Map();

  constructor() {
    // Register the three primary requested adapters by default
    this.registerAdapter(new OpenAlexAdapter());
    this.registerAdapter(new CrossrefAdapter());
    this.registerAdapter(new SemanticScholarAdapter());
  }

  /**
   * Registers a concrete SearchAdapter implementation
   */
  registerAdapter(adapter: SearchAdapter): void {
    this.adapters.set(adapter.id, adapter);
  }

  /**
   * Unregisters an adapter by its LiteratureSource ID
   */
  unregisterAdapter(id: LiteratureSource): boolean {
    return this.adapters.delete(id);
  }

  /**
   * Retrieves an adapter by ID
   */
  getAdapter(id: LiteratureSource): SearchAdapter | undefined {
    return this.adapters.get(id);
  }

  /**
   * Returns metadata for all currently registered adapters
   */
  getAvailableAdapters(): SearchAdapterMetadata[] {
    return Array.from(this.adapters.values()).map((a) => a.metadata);
  }

  /**
   * Returns all registered source IDs
   */
  getRegisteredSourceIds(): LiteratureSource[] {
    return Array.from(this.adapters.keys());
  }

  /**
   * Executes a query against a specific registered adapter
   */
  async searchSource(
    sourceId: LiteratureSource,
    query: string,
    options: SearchQueryOptions = {}
  ): Promise<AdapterQueryResult> {
    const adapter = this.adapters.get(sourceId);
    if (!adapter) {
      return {
        source: sourceId,
        adapterName: sourceId,
        records: [],
        count: 0,
        latencyMs: 0,
        error: `No adapter registered for source: ${sourceId}`,
      };
    }

    const start = performance.now();
    try {
      const records = await adapter.search(query, options);
      const latencyMs = Math.round(performance.now() - start);
      return {
        source: sourceId,
        adapterName: adapter.metadata.name,
        records,
        count: records.length,
        latencyMs,
        isFallback: records.some((r) => r.id.includes('benchmark')),
      };
    } catch (err: any) {
      const latencyMs = Math.round(performance.now() - start);
      return {
        source: sourceId,
        adapterName: adapter.metadata.name,
        records: [],
        count: 0,
        latencyMs,
        error: err?.message || 'Unknown adapter execution error',
      };
    }
  }

  /**
   * Executes a query across multiple selected adapters in parallel.
   * If any adapter fails or is rate limited, others still succeed.
   */
  async searchAcrossSources(
    query: string,
    activeSources: LiteratureSource[],
    options: SearchQueryOptions = {}
  ): Promise<MultiSourceSearchResult> {
    // Filter active sources to only those actually registered
    const validSources = activeSources.filter((s) => this.adapters.has(s));
    const effectiveSources = validSources.length > 0 ? validSources : this.getRegisteredSourceIds();

    const promises = effectiveSources.map((sourceId) =>
      this.searchSource(sourceId, query, options)
    );

    const settled = await Promise.all(promises);

    const resultsBySource: Record<string, AdapterQueryResult> = {};
    const allRecords: CanonicalRecord[] = [];

    for (const result of settled) {
      resultsBySource[result.source] = result;
      allRecords.push(...result.records);
    }

    return {
      query,
      resultsBySource,
      allRecords,
      totalCount: allRecords.length,
      activeSources: effectiveSources,
    };
  }

  /**
   * Health checks each registered adapter
   */
  async testAllAdapters(): Promise<Record<LiteratureSource, boolean>> {
    const results: Partial<Record<LiteratureSource, boolean>> = {};
    for (const [id, adapter] of this.adapters.entries()) {
      if (adapter.testConnection) {
        results[id] = await adapter.testConnection();
      } else {
        results[id] = true;
      }
    }
    return results as Record<LiteratureSource, boolean>;
  }
}

// Global Singleton Instance
export const searchService = new SearchService();
