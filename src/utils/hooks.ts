import { useRouter } from "next/router";
import { type RefObject, useCallback, useEffect, useRef, useState } from "react";
import { api } from "~/utils/api";

export const useExperiment = () => {
  const router = useRouter();
  const experiment = api.experiments.get.useQuery(
    { id: router.query.id as string },
    { enabled: !!router.query.id },
  );

  return experiment;
};

type AsyncFunction<T extends unknown[], U> = (...args: T) => Promise<U>;

export function useHandledAsyncCallback<T extends unknown[], U>(
  callback: AsyncFunction<T, U>,
  deps: React.DependencyList,
) {
  const [loading, setLoading] = useState(0);
  const [error, setError] = useState<Error | null>(null);

  const wrappedCallback = useCallback((...args: T) => {
    setLoading((loading) => loading + 1);
    setError(null);

    callback(...args)
      .catch((error) => {
        setError(error as Error);
        console.error(error);
      })
      .finally(() => {
        setLoading((loading) => loading - 1);
      });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return [wrappedCallback, loading > 0, error] as const;
}

// Have to do this ugly thing to convince Next not to try to access `navigator`
// on the server side at build time, when it isn't defined.
export const useModifierKeyLabel = () => {
  const [label, setLabel] = useState("");
  useEffect(() => {
    setLabel(navigator?.platform?.startsWith("Mac") ? "⌘" : "Ctrl");
  }, []);
  return label;
};

interface Dimensions {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
  x: number;
  y: number;
}

// get dimensions of an element
export const useElementDimensions = (): [RefObject<HTMLElement>, Dimensions | undefined] => {
  const ref = useRef<HTMLElement>(null);
  const [dimensions, setDimensions] = useState<Dimensions | undefined>();

  useEffect(() => {
    if (ref.current) {
      const observer = new ResizeObserver((entries) => {
        entries.forEach((entry) => {
          setDimensions(entry.contentRect);
        });
      });

      const observedRef = ref.current;

      observer.observe(observedRef);

      // Cleanup the observer on component unmount
      return () => {
        if (observedRef) {
          observer.unobserve(observedRef);
        }
      };
    }
  }, []);

  return [ref, dimensions];
};
