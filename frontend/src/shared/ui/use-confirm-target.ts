import { useState } from "react";

/** Small state helper for "confirm this item" flows. */
export function useConfirmTarget<T>() {
  const [target, setTarget] = useState<T | null>(null);
  return {
    target,
    open: target !== null,
    ask: (value: T) => setTarget(value),
    close: () => setTarget(null),
  };
}
