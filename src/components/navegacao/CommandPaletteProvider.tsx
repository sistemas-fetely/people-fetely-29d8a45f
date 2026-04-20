import { useEffect, useState } from "react";
import { CommandPalette } from "./CommandPalette";

/**
 * Wrapper global — registra o atalho ⌘K / Ctrl+K em qualquer lugar
 * e renderiza o CommandPalette. Usar 1 vez por layout (ou no App).
 */
export function CommandPaletteProvider() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return <CommandPalette open={open} onOpenChange={setOpen} />;
}
