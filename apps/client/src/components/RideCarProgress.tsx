"use client";

import { useCallback, useEffect, useId, useState } from "react";
import type { TimelineStep } from "@/lib/api";

const STEPS = [
  { key: "pending", label: "Request received", shortLabel: "Requested" },
  { key: "dispatched", label: "Chauffeur assigned", shortLabel: "Assigned" },
  { key: "in_progress", label: "On the way", shortLabel: "On the way" },
  { key: "completed", label: "Completed", shortLabel: "Completed" },
];

function getStepIndex(status: string): number {
  switch (status) {
    case "pending":
      return 0;
    case "dispatched":
      return 1;
    case "in_progress":
      return 2;
    case "completed":
      return 3;
    default:
      return 0;
  }
}

// Coordinate constants for pixel-perfect SVG alignment
const X_START = 52;
const X_END = 448;
const TOTAL_SPAN = X_END - X_START; // 396px

const MILESTONE_X = [
  X_START,
  X_START + Math.round(TOTAL_SPAN * 0.3333),
  X_START + Math.round(TOTAL_SPAN * 0.6667),
  X_END,
];

const ROAD_Y_DETAIL = 46;
const ROAD_Y_COMPACT = 36;

export interface RideCarProgressProps {
  status: string;
  variant?: "compact" | "detail";
  className?: string;
  timeline?: TimelineStep[];
  showNarrative?: boolean;
}

export function RideCarProgress({
  status,
  variant = "compact",
  className = "",
  timeline,
  showNarrative = true,
}: RideCarProgressProps) {
  const maskId = useId();
  const targetIndex = getStepIndex(status);

  // Animation states
  const [currentPercent, setCurrentPercent] = useState<number>(0);
  const [isDriving, setIsDriving] = useState<boolean>(true);
  const [activeStepIndices, setActiveStepIndices] = useState<number[]>([0]);

  // Target percent along track (0% to 100%)
  const targetPercent = (targetIndex / 3) * 100;

  // Stately luxury drive animation duration: 3.6 seconds
  const DURATION_MS = 3600;

  const triggerAnimation = useCallback(() => {
    // Reset to start
    setCurrentPercent(0);
    setIsDriving(true);
    setActiveStepIndices([0]);

    // Begin forward motion after brief 80ms paint
    const startTimer = setTimeout(() => {
      setCurrentPercent(targetPercent);

      // Light up milestone nodes in sync as car drives past them
      STEPS.forEach((_, idx) => {
        if (idx <= targetIndex) {
          const milestoneDelay =
            targetIndex === 0
              ? 0
              : Math.round((idx / targetIndex) * (DURATION_MS * 0.85));
          setTimeout(() => {
            setActiveStepIndices((prev) =>
              prev.includes(idx) ? prev : [...prev, idx]
            );
          }, milestoneDelay);
        }
      });
    }, 80);

    // Conclude drive smoothly
    const endTimer = setTimeout(() => {
      setIsDriving(false);
      setActiveStepIndices(
        STEPS.map((_, i) => i).filter((i) => i <= targetIndex)
      );
    }, DURATION_MS + 200);

    return () => {
      clearTimeout(startTimer);
      clearTimeout(endTimer);
    };
  }, [targetIndex, targetPercent]);

  useEffect(() => {
    const cleanup = triggerAnimation();
    return cleanup;
  }, [triggerAnimation]);

  const isCompact = variant === "compact";
  const roadY = isCompact ? ROAD_Y_COMPACT : ROAD_Y_DETAIL;
  const viewBoxHeight = isCompact ? 80 : 106;

  // Exact pixel X coordinate of the car center
  const carX = X_START + (currentPercent / 100) * TOTAL_SPAN;

  // Dash offset for active line (line length = TOTAL_SPAN)
  const activeDashOffset = TOTAL_SPAN * (1 - currentPercent / 100);

  // Status narrative banner copy
  const narrative = (() => {
    switch (status) {
      case "pending":
        return {
          badge: "REQUEST RECEIVED",
          desc: "Archer Dispatch is reviewing trip logistics and vehicle preparation.",
        };
      case "dispatched":
        return {
          badge: "CHAUFFEUR ASSIGNED",
          desc: "Your chauffeur is assigned and staging your vehicle.",
        };
      case "in_progress":
        return {
          badge: "ON THE WAY",
          desc: "Chauffeur is en route to pickup location. Live dispatch active.",
        };
      case "completed":
        return {
          badge: "TRIP COMPLETED",
          desc: "Thank you for choosing Archer Executive Transportation.",
        };
      default:
        return {
          badge: "RESERVATION ACTIVE",
          desc: "Archer Executive Chauffeur Service.",
        };
    }
  })();

  return (
    <div
      className={`executive-progress-container ${isCompact ? "compact" : "detail"} ${className}`}
    >
      {/* Header with live status and replay button */}
      {!isCompact && (
        <div className="executive-progress-top">
          <div className="executive-badge-live">
            <span className="live-radar-dot" />
            LIVE TRIP PROGRESS
          </div>
          <button
            type="button"
            className="executive-replay-pill"
            onClick={triggerAnimation}
            title="Replay journey animation"
            aria-label="Replay car animation"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.19" />
            </svg>
            Replay
          </button>
        </div>
      )}

      {/* Unified SVG Highway Track */}
      <div className="executive-svg-stage">
        <svg
          viewBox={`0 0 500 ${viewBoxHeight}`}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="executive-svg-canvas"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            {/* Soft forward headlight beam gradient */}
            <linearGradient
              id={`headlightGlow-${maskId}`}
              x1="0%"
              y1="50%"
              x2="100%"
              y2="50%"
            >
              <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.8" />
              <stop offset="45%" stopColor="#FBBF24" stopOpacity="0.35" />
              <stop offset="85%" stopColor="#FDE68A" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#FFF" stopOpacity="0" />
            </linearGradient>

            {/* Active gold road bar gradient */}
            <linearGradient
              id={`goldRoadGrad-${maskId}`}
              x1="0%"
              y1="0%"
              x2="100%"
              y2="0%"
            >
              <stop offset="0%" stopColor="#E87722" />
              <stop offset="100%" stopColor="#F59E0B" />
            </linearGradient>

            {/* Obsidian metallic body paint */}
            <linearGradient
              id={`carPaintGrad-${maskId}`}
              x1="0%"
              y1="0%"
              x2="0%"
              y2="100%"
            >
              <stop offset="0%" stopColor="#30323C" />
              <stop offset="20%" stopColor="#1C1D24" />
              <stop offset="70%" stopColor="#0F1014" />
              <stop offset="100%" stopColor="#08080A" />
            </linearGradient>

            {/* Tinted VIP Glass */}
            <linearGradient
              id={`vipGlassGrad-${maskId}`}
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <stop offset="0%" stopColor="#1A1B22" />
              <stop offset="100%" stopColor="#08090C" />
            </linearGradient>

            {/* Alloy rim metallic gradient */}
            <linearGradient
              id={`alloyRimGrad-${maskId}`}
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <stop offset="0%" stopColor="#F3F4F6" />
              <stop offset="50%" stopColor="#9CA3AF" />
              <stop offset="100%" stopColor="#374151" />
            </linearGradient>
          </defs>

          {/* 1. BASE ROAD BED (Dark Asphalt) */}
          <line
            x1={X_START}
            y1={roadY}
            x2={X_END}
            y2={roadY}
            stroke="#1D1E26"
            strokeWidth="5"
            strokeLinecap="round"
          />

          {/* 2. ROAD LANE DASHES */}
          <line
            x1={X_START}
            y1={roadY}
            x2={X_END}
            y2={roadY}
            stroke="rgba(255, 255, 255, 0.16)"
            strokeWidth="1.6"
            strokeDasharray="6 8"
          />

          {/* 3. ACTIVE GOLD PROGRESS LINE (Perfect center-axis alignment) */}
          <line
            x1={X_START}
            y1={roadY}
            x2={X_END}
            y2={roadY}
            stroke={`url(#goldRoadGrad-${maskId})`}
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={TOTAL_SPAN}
            strokeDashoffset={activeDashOffset}
            style={{
              transition: isDriving
                ? `stroke-dashoffset ${DURATION_MS}ms cubic-bezier(0.25, 0.1, 0.25, 1)`
                : "none",
            }}
          />

          {/* 4. LUXURY EXECUTIVE BLACK CHAUFFEUR VEHICLE */}
          <g
            className={`executive-car-chassis ${isDriving ? "driving" : "idle"}`}
            transform={`translate(${carX - 32}, ${roadY - 24})`}
            style={{
              transition: isDriving
                ? `transform ${DURATION_MS}ms cubic-bezier(0.25, 0.1, 0.25, 1)`
                : "none",
            }}
          >
            {/* Forward Headlight Beam illuminating the highway */}
            <polygon
              points="60,14 86,6 86,23 60,17"
              fill={`url(#headlightGlow-${maskId})`}
            />

            {/* Amber Road Glow Underbody Reflection */}
            <ellipse
              cx="32"
              cy="23"
              rx="24"
              ry="2"
              fill="rgba(232, 119, 34, 0.45)"
            />

            {/* Modern Executive SUV / Chauffeur Sedan Body */}
            <path
              d="M 4 21 C 4 21, 5 14, 8 13 C 11 11, 16 5, 20 4 L 40 4 C 44 4, 50 10, 52 12 L 58 14 C 61 15, 62 17, 61 21 L 54 21 C 54 18, 48 18, 48 21 L 22 21 C 22 18, 16 18, 16 21 Z"
              fill={`url(#carPaintGrad-${maskId})`}
              stroke="#3D404C"
              strokeWidth="0.8"
            />

            {/* Specular Chrome Shoulder Highlight */}
            <path
              d="M 20 4.8 L 40 4.8 Q 50 10 52 12.5"
              stroke="rgba(255, 255, 255, 0.4)"
              strokeWidth="0.75"
              fill="none"
            />

            {/* VIP Privacy Windows with Chrome Day-Light Opening */}
            <path
              d="M 21 6 L 31 6 L 31 12 L 18 12 Q 19 8 21 6 Z"
              fill={`url(#vipGlassGrad-${maskId})`}
              stroke="#9CA3AF"
              strokeWidth="0.5"
            />
            <path
              d="M 33 6 L 41 6 L 41 12 L 33 12 Z"
              fill={`url(#vipGlassGrad-${maskId})`}
              stroke="#9CA3AF"
              strokeWidth="0.5"
            />
            <path
              d="M 43 6 L 44 6 Q 49 11 50 12 L 43 12 Z"
              fill={`url(#vipGlassGrad-${maskId})`}
              stroke="#9CA3AF"
              strokeWidth="0.5"
            />

            {/* Archer Gold Rocker Accent */}
            <line
              x1="22"
              y1="21.5"
              x2="48"
              y2="21.5"
              stroke="#E87722"
              strokeWidth="1.2"
              strokeLinecap="round"
            />

            {/* LED Tail Blade (Red) */}
            <rect x="4" y="14" width="2" height="4" rx="0.5" fill="#EF4444" />

            {/* LED Projector Headlight */}
            <path d="M 59 15 L 61 16 L 61 18 L 59 17.5 Z" fill="#FFFFFF" />

            {/* Rear Alloy Wheel (cx=19, cy=21) */}
            <g className={`alloy-wheel rear ${isDriving ? "rolling" : ""}`}>
              <circle
                cx="19"
                cy="21"
                r="4.6"
                fill="#111216"
                stroke="#2A2C36"
                strokeWidth="0.8"
              />
              <circle
                cx="19"
                cy="21"
                r="3.2"
                fill={`url(#alloyRimGrad-${maskId})`}
              />
              <line
                x1="19"
                y1="18.2"
                x2="19"
                y2="23.8"
                stroke="#E5E7EB"
                strokeWidth="0.6"
              />
              <line
                x1="16.6"
                y1="19.8"
                x2="21.4"
                y2="22.2"
                stroke="#E5E7EB"
                strokeWidth="0.6"
              />
              <line
                x1="17.2"
                y1="22.8"
                x2="20.8"
                y2="19.2"
                stroke="#E5E7EB"
                strokeWidth="0.6"
              />
              <circle cx="19" cy="21" r="1" fill="#111" />
            </g>

            {/* Front Alloy Wheel (cx=51, cy=21) */}
            <g className={`alloy-wheel front ${isDriving ? "rolling" : ""}`}>
              <circle
                cx="51"
                cy="21"
                r="4.6"
                fill="#111216"
                stroke="#2A2C36"
                strokeWidth="0.8"
              />
              <circle
                cx="51"
                cy="21"
                r="3.2"
                fill={`url(#alloyRimGrad-${maskId})`}
              />
              <line
                x1="51"
                y1="18.2"
                x2="51"
                y2="23.8"
                stroke="#E5E7EB"
                strokeWidth="0.6"
              />
              <line
                x1="48.6"
                y1="19.8"
                x2="53.4"
                y2="22.2"
                stroke="#E5E7EB"
                strokeWidth="0.6"
              />
              <line
                x1="49.2"
                y1="22.8"
                x2="52.8"
                y2="19.2"
                stroke="#E5E7EB"
                strokeWidth="0.6"
              />
              <circle cx="51" cy="21" r="1" fill="#111" />
            </g>
          </g>

          {/* 5. MILESTONE NODES (Mathematically locked to ROAD_Y) */}
          {STEPS.map((step, idx) => {
            const nodeX = MILESTONE_X[idx];
            const isReached = activeStepIndices.includes(idx);
            const isCurrent = idx === targetIndex;
            const stepTimestamp = timeline?.find((t) => t.key === step.key)?.at;

            return (
              <g key={step.key} className="milestone-station-group">
                {/* Current Active Step: Pulsing Radar Beacon Halo */}
                {isCurrent && (
                  <circle
                    cx={nodeX}
                    cy={roadY}
                    r="15"
                    fill="rgba(232, 119, 34, 0.22)"
                    className="beacon-pulse-ring"
                  />
                )}

                {/* Milestone Node Outer Ring */}
                <circle
                  cx={nodeX}
                  cy={roadY}
                  r={isCurrent ? "9" : "7.5"}
                  fill={isReached ? "#E87722" : "#13141A"}
                  stroke={isReached ? "#FFFFFF" : "#323542"}
                  strokeWidth={isCurrent ? "2.5" : "2"}
                  className="station-node-circle"
                />

                {/* Inner Icon: Checkmark if completed, glowing core if current, dark dot if upcoming */}
                {isReached && !isCurrent && (
                  <polyline
                    points={`${nodeX - 3},${roadY} ${nodeX - 0.5},${roadY + 2.5} ${nodeX + 3.5},${roadY - 2}`}
                    fill="none"
                    stroke="#0A0A0E"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}
                {isCurrent && (
                  <circle cx={nodeX} cy={roadY} r="3" fill="#FFFFFF" />
                )}
                {!isReached && (
                  <circle cx={nodeX} cy={roadY} r="2" fill="#4B4E60" />
                )}

                {/* Station Label Text (Centered under node) */}
                <text
                  x={nodeX}
                  y={roadY + (isCompact ? 22 : 26)}
                  textAnchor="middle"
                  className={`station-label-svg ${
                    isCurrent ? "current" : isReached ? "reached" : "upcoming"
                  }`}
                >
                  {isCompact ? step.shortLabel : step.label}
                </text>

                {/* Timestamp (Detail view only, positioned cleanly below label) */}
                {!isCompact && stepTimestamp && (
                  <text
                    x={nodeX}
                    y={roadY + 41}
                    textAnchor="middle"
                    className="station-time-svg"
                  >
                    {new Date(stepTimestamp).toLocaleTimeString(undefined, {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Narrative Status Callout (Detail variant only) */}
      {!isCompact && showNarrative && (
        <div className="executive-narrative-card">
          <div className="executive-narrative-pill">
            <span className="executive-dot-live" />
            {narrative.badge}
          </div>
          <div className="executive-narrative-text">{narrative.desc}</div>
        </div>
      )}
    </div>
  );
}