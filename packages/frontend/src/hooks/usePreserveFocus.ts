import { useEffect, useRef } from 'react';

/**
 * Custom hook to preserve focus on an element during re-renders
 * @param shouldPreserve - Condition to determine if focus should be preserved
 * @param elementId - ID of the element to preserve focus on
 */
export function usePreserveFocus(shouldPreserve: boolean, elementId: string): void {
  // Store the active element before update
  const activeElementRef = useRef<Element | null>(null);

  useEffect(() => {
    // Store the currently focused element
    if (shouldPreserve && document.activeElement) {
      activeElementRef.current = document.activeElement;
    }

    // Return a cleanup function that restores focus
    return () => {
      // If we should preserve focus and we had a previously focused element
      if (shouldPreserve && activeElementRef.current) {
        // Try to find the element by ID first
        const elementToFocus = document.getElementById(elementId);
        
        if (elementToFocus) {
          // If we found the element by ID, focus it
          (elementToFocus as HTMLElement).focus();
        } else if (document.body.contains(activeElementRef.current as Node)) {
          // Otherwise, try to focus the previously active element if it's still in the DOM
          (activeElementRef.current as HTMLElement).focus();
        }
      }
    };
  }, [shouldPreserve, elementId]);
}
