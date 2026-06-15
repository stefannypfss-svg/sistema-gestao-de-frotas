import { Repository } from './repository';

/**
 * Implementação de `Repository` sobre `localStorage`.
 *
 * Genérica em relação à chave primária: `Equipment` usa `prefixo`, enquanto
 * `Work` e `Allocation` usam `id`. A função `getKey` resolve isso. Os métodos
 * são assíncronos de propósito, espelhando a assinatura de um backend real
 * para que a migração futura não exija mudanças nos consumidores.
 */
export class LocalStorageRepository<T> implements Repository<T> {
  constructor(
    private readonly storageKey: string,
    private readonly getKey: (item: T) => string,
    /** Dados iniciais semeados na primeira execução. */
    private readonly seed: T[] = [],
  ) {}

  private read(): T[] {
    const raw = localStorage.getItem(this.storageKey);
    if (raw) {
      try {
        return JSON.parse(raw) as T[];
      } catch {
        return [];
      }
    }
    // Primeira execução: semeia e persiste.
    if (this.seed.length > 0) {
      this.write(this.seed);
      return this.seed;
    }
    return [];
  }

  private write(items: T[]): void {
    localStorage.setItem(this.storageKey, JSON.stringify(items));
  }

  async list(): Promise<T[]> {
    return this.read();
  }

  async create(item: T): Promise<T> {
    const items = this.read();
    items.push(item);
    this.write(items);
    return item;
  }

  async update(id: string, item: T): Promise<T> {
    const items = this.read();
    const index = items.findIndex((i) => this.getKey(i) === id);
    if (index === -1) {
      items.push(item);
    } else {
      items[index] = item;
    }
    this.write(items);
    return item;
  }

  async remove(id: string): Promise<void> {
    const items = this.read().filter((i) => this.getKey(i) !== id);
    this.write(items);
  }

  /** Substitui todo o conjunto de uma vez (usado em semeadura/migração). */
  async replaceAll(items: T[]): Promise<T[]> {
    this.write(items);
    return items;
  }
}
