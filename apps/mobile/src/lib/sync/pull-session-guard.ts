export type PullSessionGeneration = number;

export class PullSessionGuard {
  private active = false;
  private generation = 0;
  private readonly operations = new Set<Promise<unknown>>();

  activate(): PullSessionGeneration {
    this.generation += 1;
    this.active = true;
    return this.generation;
  }

  capture(): PullSessionGeneration | null {
    return this.active ? this.generation : null;
  }

  isCurrent(generation: PullSessionGeneration | null): generation is PullSessionGeneration {
    return this.active && generation !== null && generation === this.generation;
  }

  isCurrentSession(
    generation: PullSessionGeneration,
    expectedAccessToken: string,
    currentAccessToken: string | null,
  ): boolean {
    return this.isCurrent(generation) && currentAccessToken === expectedAccessToken;
  }

  runIfCurrent<T>(
    generation: PullSessionGeneration | null,
    operation: (activeGeneration: PullSessionGeneration) => Promise<T>,
  ): Promise<T> | null {
    if (!this.isCurrent(generation)) {
      return null;
    }

    const trackedOperation = operation(generation);
    this.operations.add(trackedOperation);
    const remove = () => {
      this.operations.delete(trackedOperation);
    };
    trackedOperation.then(remove, remove);
    return trackedOperation;
  }

  async deactivateAndWait(): Promise<void> {
    this.active = false;
    this.generation += 1;

    while (this.operations.size > 0) {
      await Promise.allSettled(Array.from(this.operations));
    }
  }
}

export const syncSessionGuard = new PullSessionGuard();
