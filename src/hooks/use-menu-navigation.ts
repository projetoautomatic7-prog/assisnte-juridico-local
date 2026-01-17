import type { Editor } from "@tiptap/react";
import { useEffect, useState, useCallback, useRef } from "react";

type Orientation = "horizontal" | "vertical" | "both";

interface MenuNavigationOptions<T> {
  /**
   * The Tiptap editor instance, if using with a Tiptap editor.
   */
  editor?: Editor | null;
  /**
   * Reference to the container element for handling keyboard events.
   */
  containerRef?: React.RefObject<HTMLElement | null>;
  /**
   * Search query that affects the selected item.
   */
  query?: string;
  /**
   * Array of items to navigate through.
   */
  items: T[];
  /**
   * Callback fired when an item is selected.
   */
  onSelect?: (item: T) => void;
  /**
   * Callback fired when the menu should close.
   */
  onClose?: () => void;
  /**
   * The navigation orientation of the menu.
   * @default "vertical"
   */
  orientation?: Orientation;
  /**
   * Whether to automatically select the first item when the menu opens.
   * @default true
   */
  autoSelectFirstItem?: boolean;
}

/**
 * Hook that implements keyboard navigation for dropdown menus and command palettes.
 *
 * Handles arrow keys, tab, home/end, enter for selection, and escape to close.
 * Works with both Tiptap editors and regular DOM elements.
 *
 * @param options - Configuration options for the menu navigation
 * @returns Object containing the selected index and a setter function
 */
export function useMenuNavigation<T>({
  editor,
  containerRef,
  query,
  items,
  onSelect,
  onClose,
  orientation = "vertical",
  autoSelectFirstItem = true,
}: MenuNavigationOptions<T>) {
  const [selectedIndex, setSelectedIndex] = useState<number>(
    autoSelectFirstItem ? 0 : -1,
  );

  // Usar refs para valores que mudam com frequência mas não precisam disparar o efeito
  const itemsRef = useRef(items);
  const selectedIndexRef = useRef(selectedIndex);
  const onSelectRef = useRef(onSelect);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    itemsRef.current = items;
    selectedIndexRef.current = selectedIndex;
    onSelectRef.current = onSelect;
    onCloseRef.current = onClose;
  }, [items, selectedIndex, onSelect, onClose]);

  const getNextIndex = useCallback((current: number, delta: 1 | -1): number => {
    const currentItems = itemsRef.current;
    if (!currentItems.length) return -1;
    if (current === -1) return delta === 1 ? 0 : currentItems.length - 1;
    return (current + delta + currentItems.length) % currentItems.length;
  }, []);

  useEffect(() => {
    const handleKeyboardNavigation = (event: KeyboardEvent) => {
      const currentItems = itemsRef.current;
      if (!currentItems.length) return;

      const move = (delta: 1 | -1) =>
        setSelectedIndex((current) => getNextIndex(current, delta));

      switch (event.key) {
        case "ArrowUp": {
          if (orientation === "horizontal") return;
          event.preventDefault();
          move(-1);
          break;
        }

        case "ArrowDown": {
          if (orientation === "horizontal") return;
          event.preventDefault();
          move(1);
          break;
        }

        case "ArrowLeft": {
          if (orientation === "vertical") return;
          event.preventDefault();
          move(-1);
          break;
        }

        case "ArrowRight": {
          if (orientation === "vertical") return;
          event.preventDefault();
          move(1);
          break;
        }

        case "Tab": {
          event.preventDefault();
          if (event.shiftKey) {
            move(-1);
          } else {
            move(1);
          }
          break;
        }

        case "Home": {
          event.preventDefault();
          setSelectedIndex(0);
          break;
        }

        case "End": {
          event.preventDefault();
          setSelectedIndex(currentItems.length - 1);
          break;
        }

        case "Enter": {
          if (event.isComposing) return;
          event.preventDefault();
          const currentIndex = selectedIndexRef.current;
          if (currentIndex !== -1 && currentItems[currentIndex]) {
            onSelectRef.current?.(currentItems[currentIndex]);
          }
          break;
        }

        case "Escape": {
          event.preventDefault();
          onCloseRef.current?.();
          break;
        }
      }
    };

    let targetElement: HTMLElement | null = null;

    if (editor) {
      targetElement = editor.view.dom;
    } else if (containerRef?.current) {
      targetElement = containerRef.current;
    }

    if (targetElement) {
      targetElement.addEventListener("keydown", handleKeyboardNavigation, true);
      return () => {
        targetElement?.removeEventListener(
          "keydown",
          handleKeyboardNavigation,
          true,
        );
      };
    }
  }, [editor, containerRef, orientation, getNextIndex]); // Dependências reduzidas drasticamente

  useEffect(() => {
    if (query) {
      setSelectedIndex(autoSelectFirstItem ? 0 : -1);
    }
  }, [query, autoSelectFirstItem]);

  return {
    selectedIndex: items.length ? selectedIndex : undefined,
    setSelectedIndex,
  };
}
