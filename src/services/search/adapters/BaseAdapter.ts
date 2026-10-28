import { CanonicalRecord, LiteratureSource } from '../../../types/database';
import { SearchAdapter, SearchAdapterMetadata, SearchQueryOptions } from '../types';

export abstract class BaseAdapter implements SearchAdapter {
  abstract readonly id: LiteratureSource;
  abstract readonly metadata: SearchAdapterMetadata;

  abstract search(query: string, options?: SearchQueryOptions): Promise<CanonicalRecord[]>;

  async testConnection(options?: SearchQueryOptions): Promise<boolean> {
    try {
      const records = await this.search('metformin diabetes', { ...options, limit: 1 });
      return records.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Cleans natural language query strings by stripping boolean / indexing syntax
   */
  protected extractCleanKeywords(rawQuery: string): string {
    let cleaned = rawQuery
      .replace(/\[(?:Title\/Abstract|Title|Abstract|MeSH Terms|Date - Publication)[^\]]*\]/gi, ' ')
      .replace(/(?:TITLE_ABS|PUB_YEAR|SRC):[^\s)]+/gi, ' ')
      .replace(/["()]/g, ' ')
      .replace(/\b(AND|OR|NOT)\b/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (cleaned.length < 3) {
      cleaned = 'diabetes metformin randomized controlled trial';
    }
    return cleaned.substring(0, 120);
  }

  /**
   * Sanitizes DOI strings
   */
  protected cleanDoi(doi: string | null | undefined): string | null {
    if (!doi) return null;
    return doi
      .trim()
      .replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, '')
      .replace(/^doi:\s*/i, '')
      .trim();
  }

  /**
   * Network fetch with timeout and abort support
   */
  protected async fetchWithTimeout(
    url: string,
    options: RequestInit = {},
    timeoutMs = 4500,
    externalSignal?: AbortSignal
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const onAbort = () => controller.abort();
    if (externalSignal) {
      externalSignal.addEventListener('abort', onAbort);
    }

    try {
      const res = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (externalSignal) {
        externalSignal.removeEventListener('abort', onAbort);
      }
      return res;
    } catch (err) {
      clearTimeout(timeoutId);
      if (externalSignal) {
        externalSignal.removeEventListener('abort', onAbort);
      }
      throw err;
    }
  }
}
