import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Headphones, X } from "lucide-react";
import { ZibaSupport } from "@/components/ziba-support";

const STORAGE_KEY = "ziba-support-icon-pos";
const ICON_SIZE = 48;
const MARGIN = 8;
const BOTTOM_NAV_HEIGHT = 72;

function getDefaultPosition() {
  return {
    x: (typeof window !== "undefined" ? window.innerWidth : 400) - ICON_SIZE - MARGIN,
    y: (typeof window !== "undefined" ? window.innerHeight : 800) - ICON_SIZE - BOTTOM_NAV_HEIGHT - MARGIN,
  };
}

function loadPosition(): { x: number; y: number } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed.x === "number" && typeof parsed.y === "number") {
        return clampPosition(parsed.x, parsed.y);
      }
    }
  } catch {}
  return getDefaultPosition();
}

function savePosition(x: number, y: number) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ x, y }));
  } catch {}
}

function clampPosition(x: number, y: number): { x: number; y: number } {
  const maxX = (typeof window !== "undefined" ? window.innerWidth : 400) - ICON_SIZE - MARGIN;
  const maxY = (typeof window !== "undefined" ? window.innerHeight : 800) - ICON_SIZE - BOTTOM_NAV_HEIGHT - MARGIN;
  const headerHeight = 56;
  return {
    x: Math.max(MARGIN, Math.min(x, maxX)),
    y: Math.max(headerHeight + MARGIN, Math.min(y, maxY)),
  };
}

function snapToEdge(x: number, y: number): { x: number; y: number } {
  const screenWidth = typeof window !== "undefined" ? window.innerWidth : 400;
  const centerX = x + ICON_SIZE / 2;
  const snappedX = centerX < screenWidth / 2 ? MARGIN : screenWidth - ICON_SIZE - MARGIN;
  return clampPosition(snappedX, y);
}

export function ZibraFloatingButton() {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(loadPosition);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef(false);
  const startRef = useRef({ x: 0, y: 0, posX: 0, posY: 0 });
  const movedRef = useRef(false);
  const buttonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => {
      setPos((prev) => clampPosition(prev.x, prev.y));
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    dragRef.current = true;
    movedRef.current = false;
    setDragging(true);
    startRef.current = {
      x: e.clientX,
      y: e.clientY,
      posX: pos.x,
      posY: pos.y,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [pos]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - startRef.current.x;
    const dy = e.clientY - startRef.current.y;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      movedRef.current = true;
    }
    const newX = startRef.current.posX + dx;
    const newY = startRef.current.posY + dy;
    const clamped = clampPosition(newX, newY);
    setPos(clamped);
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current) return;
    dragRef.current = false;
    setDragging(false);
    const snapped = snapToEdge(pos.x, pos.y);
    setPos(snapped);
    savePosition(snapped.x, snapped.y);
    if (!movedRef.current) {
      setOpen(true);
    }
  }, [pos]);

  return (
    <>
      <div
        ref={buttonRef}
        className="fixed z-50 touch-none select-none"
        style={{
          left: pos.x,
          top: pos.y,
          width: ICON_SIZE,
          height: ICON_SIZE,
          transition: dragging ? "none" : "left 0.2s ease-out, top 0.2s ease-out",
          cursor: dragging ? "grabbing" : "grab",
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        data-testid="button-zibra-float"
      >
        <Button
          size="icon"
          className="h-12 w-12 rounded-full shadow-lg pointer-events-none"
          tabIndex={-1}
        >
          <Headphones className="h-5 w-5" />
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md max-h-[80vh] overflow-hidden p-0">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <Headphones className="h-5 w-5" />
                ZIBRA Support
              </span>
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[65vh] px-2 pb-2">
            <ZibaSupport onClose={() => setOpen(false)} forceRole="rider" />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
