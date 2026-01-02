/**
 * useCombinedRefs Hook
 *
 * Utility to combine multiple React refs into a single callback ref.
 * Useful for components that need both a library ref (e.g., @dnd-kit's setNodeRef)
 * and an internal ref (e.g., for direct DOM access).
 *
 * @example
 * const { setNodeRef } = useDroppable({ id: 'droppable' });
 * const inputRef = useRef<HTMLInputElement>(null);
 * const combinedRef = useCombinedRefs(setNodeRef, inputRef);
 *
 * return <input ref={combinedRef} />;
 */

import { useCallback } from 'react';

export function useCombinedRefs<T = any>(...refs: any[]) {
    return useCallback(
        (element: T | null) => {
            refs.forEach((ref) => {
                if (!ref) return;

                // Handle callback refs
                if (typeof ref === 'function') {
                    ref(element);
                }
                // Handle object refs (RefObject)
                else if (ref && 'current' in ref) {
                    (ref as any).current = element;
                }
            });
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        refs
    );
}
