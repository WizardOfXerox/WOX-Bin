"use client";

import { ChevronLeft, ChevronRight, Sparkles, X } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type WorkspaceTutorialStep = {
  id: string;
  title: string;
  description: string;
  bullets: string[];
  targetId: string;
  emphasis?: string;
  preferredSide?: "top" | "right" | "bottom" | "left";
};

export type WorkspaceTutorialTour = {
  id: string;
  label: string;
  description: string;
  steps: WorkspaceTutorialStep[];
};

type Props = {
  open: boolean;
  tourId: string;
  tours: WorkspaceTutorialTour[];
  stepIndex: number;
  onTourChange: (tourId: string) => void;
  onStepIndexChange: (index: number) => void;
  onClose: (completed: boolean) => void;
};

type Box = {
  left: number;
  top: number;
  width: number;
  height: number;
  right: number;
  bottom: number;
};

type PanelSide = "top" | "right" | "bottom" | "left";

type LayoutState = {
  target: Box | null;
  panel: Box | null;
  side: PanelSide;
  path: string | null;
};

const SAFE_MARGIN = 18;
const PANEL_GAP = 24;
const PANEL_WIDTH = 360;
const PANEL_MIN_HEIGHT = 296;

export function findVisibleTutorialTarget(targetId: string): HTMLElement | null {
  if (typeof document === "undefined") {
    return null;
  }

  const nodes = Array.from(document.querySelectorAll<HTMLElement>(`[data-tutorial="${targetId}"]`));
  for (const node of nodes) {
    const rect = node.getBoundingClientRect();
    const style = window.getComputedStyle(node);
    if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) {
      continue;
    }
    if (rect.width <= 0 || rect.height <= 0) {
      continue;
    }
    return node;
  }

  return null;
}

function expandRect(rect: DOMRect | Box, amount: number): Box {
  return {
    left: rect.left - amount,
    top: rect.top - amount,
    width: rect.width + amount * 2,
    height: rect.height + amount * 2,
    right: rect.right + amount,
    bottom: rect.bottom + amount
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function pickSide(target: Box, vw: number, vh: number, preferred?: PanelSide): PanelSide {
  const space = {
    right: vw - target.right - SAFE_MARGIN,
    left: target.left - SAFE_MARGIN,
    bottom: vh - target.bottom - SAFE_MARGIN,
    top: target.top - SAFE_MARGIN
  };

  const ranked = (Object.entries(space) as [PanelSide, number][])
    .sort((a, b) => b[1] - a[1])
    .map(([side]) => side);

  if (preferred) {
    return [preferred, ...ranked].find((side, index, arr) => arr.indexOf(side) === index) ?? "bottom";
  }

  return ranked[0] ?? "bottom";
}

function createPath(target: Box, panel: Box, side: PanelSide) {
  let startX = panel.left + panel.width / 2;
  let startY = panel.top + panel.height / 2;
  let endX = target.left + target.width / 2;
  let endY = target.top + target.height / 2;

  if (side === "right") {
    startX = panel.left;
    startY = panel.top + panel.height / 2;
    endX = target.right;
    endY = target.top + target.height / 2;
  } else if (side === "left") {
    startX = panel.right;
    startY = panel.top + panel.height / 2;
    endX = target.left;
    endY = target.top + target.height / 2;
  } else if (side === "top") {
    startX = panel.left + panel.width / 2;
    startY = panel.bottom;
    endX = target.left + target.width / 2;
    endY = target.top;
  } else {
    startX = panel.left + panel.width / 2;
    startY = panel.top;
    endX = target.left + target.width / 2;
    endY = target.bottom;
  }

  const controlOneX = side === "left" || side === "right" ? (startX + endX) / 2 : startX;
  const controlOneY = side === "top" || side === "bottom" ? (startY + endY) / 2 : startY;
  const controlTwoX = side === "left" || side === "right" ? (startX + endX) / 2 : endX;
  const controlTwoY = side === "top" || side === "bottom" ? (startY + endY) / 2 : endY;

  return `M ${startX} ${startY} C ${controlOneX} ${controlOneY}, ${controlTwoX} ${controlTwoY}, ${endX} ${endY}`;
}

function computeLayout(targetRect: Box, panelHeight: number, preferredSide?: PanelSide): LayoutState {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const width = Math.min(PANEL_WIDTH, vw - SAFE_MARGIN * 2);
  const height = Math.min(Math.max(panelHeight, PANEL_MIN_HEIGHT), vh - SAFE_MARGIN * 2);
  const side = pickSide(targetRect, vw, vh, preferredSide);

  let left = SAFE_MARGIN;
  let top = SAFE_MARGIN;

  if (side === "right") {
    left = clamp(targetRect.right + PANEL_GAP, SAFE_MARGIN, vw - width - SAFE_MARGIN);
    top = clamp(targetRect.top + targetRect.height / 2 - height / 2, SAFE_MARGIN, vh - height - SAFE_MARGIN);
  } else if (side === "left") {
    left = clamp(targetRect.left - width - PANEL_GAP, SAFE_MARGIN, vw - width - SAFE_MARGIN);
    top = clamp(targetRect.top + targetRect.height / 2 - height / 2, SAFE_MARGIN, vh - height - SAFE_MARGIN);
  } else if (side === "top") {
    left = clamp(targetRect.left + targetRect.width / 2 - width / 2, SAFE_MARGIN, vw - width - SAFE_MARGIN);
    top = clamp(targetRect.top - height - PANEL_GAP, SAFE_MARGIN, vh - height - SAFE_MARGIN);
  } else {
    left = clamp(targetRect.left + targetRect.width / 2 - width / 2, SAFE_MARGIN, vw - width - SAFE_MARGIN);
    top = clamp(targetRect.bottom + PANEL_GAP, SAFE_MARGIN, vh - height - SAFE_MARGIN);
  }

  const panel: Box = {
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height
  };

  return {
    target: targetRect,
    panel,
    side,
    path: createPath(targetRect, panel, side)
  };
}

export function WorkspaceTutorial({ open, tourId, tours, stepIndex, onTourChange, onStepIndexChange, onClose }: Props) {
  const activeTour = useMemo(() => tours.find((tour) => tour.id === tourId) ?? tours[0] ?? null, [tourId, tours]);
  const activeStep = activeTour?.steps[stepIndex] ?? null;
  const panelRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<LayoutState>({
    target: null,
    panel: null,
    side: "bottom",
    path: null
  });
  const [stepDirection, setStepDirection] = useState<"forward" | "backward">("forward");

  useLayoutEffect(() => {
    if (!open || !activeStep) {
      return;
    }

    const update = () => {
      const node = findVisibleTutorialTarget(activeStep.targetId);
      if (!node) {
        setLayout({
          target: null,
          panel: null,
          side: "bottom",
          path: null
        });
        return;
      }

      const target = expandRect(node.getBoundingClientRect(), 10);
      const panelHeight = Math.max(panelRef.current?.getBoundingClientRect().height ?? PANEL_MIN_HEIGHT, PANEL_MIN_HEIGHT);
      setLayout(computeLayout(target, panelHeight, activeStep.preferredSide));
    };

    update();
    const timer = window.setInterval(update, 180);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [activeStep, open]);

  const progress = useMemo(() => {
    const stepCount = activeTour?.steps.length ?? 0;
    if (!stepCount) {
      return 0;
    }
    return ((stepIndex + 1) / stepCount) * 100;
  }, [activeTour?.steps.length, stepIndex]);

  const goToStep = useCallback((nextIndex: number) => {
    setStepDirection(nextIndex >= stepIndex ? "forward" : "backward");
    onStepIndexChange(nextIndex);
  }, [onStepIndexChange, stepIndex]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose(false);
        return;
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        if (stepIndex < (activeTour?.steps.length ?? 0) - 1) {
          goToStep(stepIndex + 1);
        } else {
          onClose(true);
        }
      }
      if (event.key === "ArrowLeft" && stepIndex > 0) {
        event.preventDefault();
        goToStep(stepIndex - 1);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeTour?.steps.length, goToStep, onClose, open, stepIndex]);

  if (!open || !activeStep || !activeTour) {
    return null;
  }

  return (
    <div aria-modal="true" className="fixed inset-0 z-[120] isolate" role="dialog">
      {layout.target ? (
        <>
          <div
            className="absolute z-0 bg-slate-950/78 backdrop-blur-[3px]"
            style={{ left: 0, top: 0, width: "100%", height: layout.target.top }}
          />
          <div
            className="absolute z-0 bg-slate-950/78 backdrop-blur-[3px]"
            style={{ left: 0, top: layout.target.top, width: layout.target.left, height: layout.target.height }}
          />
          <div
            className="absolute z-0 bg-slate-950/78 backdrop-blur-[3px]"
            style={{
              left: layout.target.right,
              top: layout.target.top,
              width: `calc(100% - ${layout.target.right}px)`,
              height: layout.target.height
            }}
          />
          <div
            className="absolute z-0 bg-slate-950/78 backdrop-blur-[3px]"
            style={{ left: 0, top: layout.target.bottom, width: "100%", height: `calc(100% - ${layout.target.bottom}px)` }}
          />
          <div
            className="absolute z-[1] bg-transparent"
            style={{
              left: layout.target.left,
              top: layout.target.top,
              width: layout.target.width,
              height: layout.target.height
            }}
          />
        </>
      ) : (
        <div className="absolute inset-0 z-0 bg-slate-950/78 backdrop-blur-[3px]" />
      )}

      {layout.target ? (
        <>
          <div
            className="pointer-events-none absolute z-10 rounded-[1.5rem] border border-sky-300/70 bg-sky-400/8 shadow-[0_0_0_1px_rgba(125,211,252,0.16),0_0_36px_rgba(56,189,248,0.24)] transition-[left,top,width,height] duration-300 ease-out"
            style={{
              left: layout.target.left,
              top: layout.target.top,
              width: layout.target.width,
              height: layout.target.height
            }}
          />
          <div
            className="pointer-events-none absolute z-10 rounded-[1.7rem] border border-sky-300/35 wox-tutorial-target-ring transition-[left,top,width,height] duration-300 ease-out"
            style={{
              left: layout.target.left - 6,
              top: layout.target.top - 6,
              width: layout.target.width + 12,
              height: layout.target.height + 12
            }}
          />
          {layout.path ? (
            <svg className="pointer-events-none absolute inset-0 z-10 h-full w-full overflow-visible" fill="none">
              <defs>
                <marker
                  id="wox-tutorial-arrow"
                  markerHeight="8"
                  markerUnits="strokeWidth"
                  markerWidth="8"
                  orient="auto"
                  refX="7"
                  refY="4"
                >
                  <path d="M0,0 L8,4 L0,8 z" fill="rgba(125,211,252,0.95)" />
                </marker>
              </defs>
              <path
                className="wox-tutorial-line-glow"
                d={layout.path}
                stroke="rgba(56,189,248,0.2)"
                strokeLinecap="round"
                strokeWidth="8"
              />
              <path
                className="wox-tutorial-line"
                d={layout.path}
                markerEnd="url(#wox-tutorial-arrow)"
                stroke="rgba(125,211,252,0.96)"
                strokeDasharray="10 12"
                strokeLinecap="round"
                strokeWidth="3"
              />
            </svg>
          ) : null}
        </>
      ) : null}

      <div
        className={cn(
          "absolute z-20 rounded-[1.6rem] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.98),rgba(15,23,42,0.94))] p-5 text-slate-50 shadow-[0_24px_90px_rgba(2,6,23,0.5)] transition-[left,top,width] duration-300 ease-out sm:p-6"
        )}
        ref={panelRef}
        style={
          layout.panel
            ? {
                left: layout.panel.left,
                top: layout.panel.top,
                width: layout.panel.width,
                minHeight: PANEL_MIN_HEIGHT
              }
            : {
                left: SAFE_MARGIN,
                right: SAFE_MARGIN,
                top: SAFE_MARGIN * 2
              }
        }
      >
        <div
          className={cn(
            "wox-tutorial-panel-content",
            stepDirection === "forward" ? "wox-tutorial-panel-forward" : "wox-tutorial-panel-backward"
          )}
          key={`${activeStep.id}-${stepIndex}`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-sky-300/20 bg-sky-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-200">
                <Sparkles className="h-3.5 w-3.5" />
                Workspace tutorial
              </div>
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-slate-400">
                {activeTour.label} tour · Step {stepIndex + 1} of {activeTour.steps.length}
              </p>
              <h2 className="mt-2 text-xl font-semibold tracking-tight text-white">{activeStep.title}</h2>
              <p className="mt-2 max-w-[34rem] text-xs leading-6 text-slate-400">{activeTour.description}</p>
            </div>
            <Button
              className="h-9 w-9 shrink-0 rounded-full border-white/10 text-slate-300 hover:bg-white/5 hover:text-white"
              onClick={() => onClose(false)}
              size="icon"
              type="button"
              variant="outline"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {tours.length > 1 ? (
            <div className="mt-4 flex flex-nowrap gap-2 overflow-x-auto pb-1">
              {tours.map((tour) => (
                <Button
                  className="shrink-0"
                  key={tour.id}
                  onClick={() => onTourChange(tour.id)}
                  size="sm"
                  type="button"
                  variant={tour.id === activeTour.id ? "default" : "outline"}
                >
                  {tour.label}
                  <span className="ml-1.5 text-[10px] opacity-75">{tour.steps.length}</span>
                </Button>
              ))}
            </div>
          ) : null}

          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/8">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,#38bdf8_0%,#60a5fa_55%,#a78bfa_100%)] transition-[width] duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="mt-5 space-y-4">
            <p className="text-sm leading-7 text-slate-200">{activeStep.description}</p>
            <ul className="space-y-2">
              {activeStep.bullets.map((bullet) => (
                <li className="flex items-start gap-3 text-sm leading-6 text-slate-300" key={bullet}>
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-300" />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
            {activeStep.emphasis ? (
              <div className="rounded-[1.15rem] border border-sky-300/16 bg-sky-400/8 px-4 py-3 text-sm leading-6 text-sky-100">
                {activeStep.emphasis}
              </div>
            ) : null}
          </div>

          <div className="mt-6 flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs leading-5 text-slate-400">
              Use <span className="font-semibold text-slate-200">Left/Right</span> arrow keys to move through the guide.
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button onClick={() => onClose(false)} type="button" variant="ghost">
                Skip for now
              </Button>
              <Button disabled={stepIndex === 0} onClick={() => goToStep(stepIndex - 1)} type="button" variant="outline">
                <ChevronLeft className="h-4 w-4" />
                Back
              </Button>
              {stepIndex < activeTour.steps.length - 1 ? (
                <Button onClick={() => goToStep(stepIndex + 1)} type="button">
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button onClick={() => onClose(true)} type="button">
                  Finish tutorial
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .wox-tutorial-line {
          animation: woxTutorialDash 3s linear infinite;
        }
        .wox-tutorial-target-ring {
          animation: woxTutorialPulse 1.9s ease-in-out infinite;
        }
        .wox-tutorial-line-glow {
          filter: blur(2px);
          opacity: 0.9;
        }
        .wox-tutorial-panel-forward {
          animation: woxTutorialPanelForward 320ms cubic-bezier(0.22, 1, 0.36, 1);
        }
        .wox-tutorial-panel-backward {
          animation: woxTutorialPanelBackward 320ms cubic-bezier(0.22, 1, 0.36, 1);
        }
        @keyframes woxTutorialDash {
          from {
            stroke-dashoffset: 0;
          }
          to {
            stroke-dashoffset: -88;
          }
        }
        @keyframes woxTutorialPulse {
          0%,
          100% {
            transform: scale(1);
            opacity: 0.55;
          }
          50% {
            transform: scale(1.02);
            opacity: 0.95;
          }
        }
        @keyframes woxTutorialPanelForward {
          from {
            opacity: 0;
            transform: translate3d(18px, 0, 0) scale(0.985);
          }
          to {
            opacity: 1;
            transform: translate3d(0, 0, 0) scale(1);
          }
        }
        @keyframes woxTutorialPanelBackward {
          from {
            opacity: 0;
            transform: translate3d(-18px, 0, 0) scale(0.985);
          }
          to {
            opacity: 1;
            transform: translate3d(0, 0, 0) scale(1);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .wox-tutorial-line,
          .wox-tutorial-target-ring,
          .wox-tutorial-panel-forward,
          .wox-tutorial-panel-backward {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
