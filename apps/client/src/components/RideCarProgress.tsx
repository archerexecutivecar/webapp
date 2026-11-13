"use client";

import { useCallback, useEffect, useId, useState } from "react";
import type { TimelineStep } from "@/lib/api";

const STEPS = [
  { key: "pending", label: "Request received", shortLabel: "Received" },
  { key: "dispatched", label: "Chauffeur assigned", shortLabel: "Assigned" },
  { key: "in_progress", label: "On the way", shortLabel: "On Way" },
  { key: "completed", label: "Completed", shortLabel: "Done" },
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

const STEP_PERCENTAGES = [0, 33.333, 66.666, 100];

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
  const targetPercent = STEP_PERCENTAGES[targetIndex] ?? 0;

  const [currentPercent, setCurrentPercent] = useState<number>(0);
  const [isMoving, setIsMoving] = useState<boolean>(true);
  const [reachedSteps, setReachedSteps] = useState<number[]>([0]);

  const triggerAnimation = useCallback(() => {
    // Start from stage 0 (Request received)
    setCurrentPercent(0);
    setIsMoving(true);
    setReachedSteps([0]);

    // Animate to target percentage
    const startTimer = setTimeout(() => {
      setCurrentPercent(targetPercent);

      // Sequentially activate milestone nodes as car drives past them
      STEPS.forEach((_, idx) => {
        if (idx <= targetIndex) {
          const delay = targetIndex === 0 ? 0 : Math.round((idx / targetIndex) * 1600);
          setTimeout(() => {
            setReachedSteps((prev) => (prev.includes(idx) ? prev : [...prev, idx]));
          }, delay);
        }
      });
    }, 120);

    // Stop driving motion when arriving
    const arriveTimer = setTimeout(() => {
      setIsMoving(false);
      // Ensure all target steps are marked reached
      setReachedSteps(STEPS.map((_, i) => i).filter((i) => i <= targetIndex));
    }, 2100);

    return () => {
      clearTimeout(startTimer);
      clearTimeout(arriveTimer);
    };
  }, [targetIndex, targetPercent]);

  useEffect(() => {
    const cleanup = triggerAnimation();
    return cleanup;
  }, [triggerAnimation]);

  const isCompact = variant === "compact";

  // Narrative message based on status
  const narrative = (() => {
    switch (status) {
      case "pending":
        return {
          title: "Reservation Received",
          desc: "Archer Dispatch is reviewing chauffeur availability and trip timing.",
        };
      case "dispatched":
        return {
          title: "Chauffeur Assigned",
          desc: "Your executive chauffeur has been scheduled and your vehicle staged.",
        };
      case "in_progress":
        return {
          title: "Chauffeur On The Way",
          desc: "Chauffeur is en route to pickup. Live executive dispatch is monitoring.",
        };
      case "completed":
        return {
          title: "Trip Completed",
          desc: "Thank you for traveling with Archer Executive Transportation.",
        };
      default:
        return {
          title: "Reservation Active",
          desc: "Archer Executive Chauffeur Service.",
        };
    }
  })();

  return (
    <div className={`car-progress-wrapper ${isCompact ? "compact" : "detail"} ${className}`}>
      {/* Detail header with live status pill and replay button */}
      {!isCompact && (
        <div className="car-progress-head">
          <div className="car-progress-eyebrow">
            <span className="live-dot" />
            LIVE TRIP PROGRESS
          </div>
          <button
            type="button"
            className="car-replay-btn"
            onClick={triggerAnimation}
            title="Replay journey animation"
            aria-label="Replay car animation"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.19" />
            </svg>
            Replay
          </button>
        </div>
      )}

      {/* Main Track Arena */}
      <div className={`car-track-arena ${isMoving ? "is-driving" : "is-idle"}`}>
        {/* Track Line Layer */}
        <div className="car-track-line-wrapper">
          {/* Base Road */}
          <div className="car-road-base" />

          {/* Animated Road Lane Dashes */}
          <div className={`car-road-dashes ${isMoving ? "animating" : ""}`} />

          {/* Golden Active Progress Bar */}
          <div
            className="car-road-active"
            style={{
              width: `${currentPercent}%`,
              transition: isMoving ? "width 1.9s cubic-bezier(0.22, 1, 0.36, 1)" : "none",
            }}
          />

          {/* Moving Black Car */}
          <div
            className="car-vehicle-holder"
            style={{
              left: `${currentPercent}%`,
              transition: isMoving ? "left 1.9s cubic-bezier(0.22, 1, 0.36, 1)" : "none",
            }}
          >
            <svg
              className="executive-car-svg"
              viewBox="0 0 120 44"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-label="Archer Executive Chauffeur Vehicle"
            >
              <defs>
                {/* Forward Headlight Beam */}
                <linearGradient id={`headlightBeam-${maskId}`} x1="0%" y1="50%" x2="100%" y2="50%">
                  <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.85" />
                  <stop offset="40%" stopColor="#FBBF24" stopOpacity="0.45" />
                  <stop offset="80%" stopColor="#FDE68A" stopOpacity="0.12" />
                  <stop offset="100%" stopColor="#FFF" stopOpacity="0" />
                </linearGradient>

                {/* Midnight Metallic Executive Body Paint */}
                <linearGradient id={`carBodyPaint-${maskId}`} x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#363842" />
                  <stop offset="25%" stopColor="#1E2026" />
                  <stop offset="70%" stopColor="#111215" />
                  <stop offset="100%" stopColor="#08080A" />
                </linearGradient>

                {/* Privacy Glass Window Tint */}
                <linearGradient id={`windowTint-${maskId}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#1B1D24" />
                  <stop offset="100%" stopColor="#0A0B0E" />
                </linearGradient>

                {/* Luxury Alloy Rim */}
                <linearGradient id={`rimGrad-${maskId}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#E5E7EB" />
                  <stop offset="50%" stopColor="#6B7280" />
                  <stop offset="100%" stopColor="#1F2937" />
                </linearGradient>
              </defs>

              {/* Headlight Beam Projecting Forward */}
              <polygon points="98,24 120,16 120,34 98,28" fill={`url(#headlightBeam-${maskId})`} />

              {/* Amber Ground Effect Underglow */}
              <ellipse cx="54" cy="37" rx="36" ry="2.5" fill="rgba(232, 119, 34, 0.4)" />

              {/* Executive SUV / Sedan Body */}
              <path
                d="M12 32 C12 32 13 25 15 24 C17 23 24 15 27 14 C32 13.5 56 13.5 60 14 C64 14.5 73 22 75 23 L94 25 C97 25.5 98 28 98 30 C98 32 96 33 94 33 L86 33 C86 28 76 28 76 33 L38 33 C38 28 28 28 28 33 L14 33 C12.5 33 12 32.5 12 32 Z"
                fill={`url(#carBodyPaint-${maskId})`}
                stroke="#474A59"
                strokeWidth="0.8"
              />

              {/* Specular Roofline Chrome Accent */}
              <path d="M28 14.5 Q45 14 60 14.5 Q72 22 74 23.5" stroke="rgba(255,255,255,0.45)" strokeWidth="0.75" fill="none" />

              {/* Side Windows: Quarter, Rear Passenger, Front Chauffeur */}
              <path d="M28 16 L38 16 L38 23 L23 23 Q26 18 28 16 Z" fill={`url(#windowTint-${maskId})`} stroke="#9CA3AF" strokeWidth="0.6" />
              <path d="M40 16 L54 16 L54 23 L40 23 Z" fill={`url(#windowTint-${maskId})`} stroke="#9CA3AF" strokeWidth="0.6" />
              <path d="M56 16 L60 16 Q70 22 72 23 L56 23 Z" fill={`url(#windowTint-${maskId})`} stroke="#9CA3AF" strokeWidth="0.6" />

              {/* Subtle Window Reflection Sheen */}
              <path d="M32 23 L36 16 L39 16 L35 23 Z" fill="rgba(255,255,255,0.12)" />
              <path d="M48 23 L52 16 L54 16 L50 23 Z" fill="rgba(255,255,255,0.12)" />

              {/* Side Mirror with Amber Turn Signal */}
              <path d="M69 23.5 L73 23 L72 25 L68.5 25 Z" fill="#1C1D24" stroke="#6B7280" strokeWidth="0.4" />
              <circle cx="72" cy="24" r="0.6" fill="#E87722" />

              {/* Chrome Door Handles */}
              <rect x="42" y="24.5" width="4" height="1" rx="0.5" fill="#6B7280" />
              <rect x="58" y="24.5" width="4" height="1" rx="0.5" fill="#6B7280" />

              {/* Archer Signature Amber Rocker Trim Line */}
              <line x1="39" y1="32.5" x2="75" y2="32.5" stroke="#E87722" strokeWidth="1" strokeLinecap="round" />

              {/* LED Red Taillight Strip */}
              <rect x="12" y="24" width="2" height="4.5" rx="0.8" fill="#EF4444" />
              <circle cx="13" cy="26" r="2.5" fill="#EF4444" opacity="0.6" />

              {/* Projector LED Headlight Unit */}
              <path d="M93 26 L97 27 L97 29.5 L93 29 Z" fill="#FFFFFF" />
              <circle cx="95" cy="28" r="2.5" fill="#FBBF24" opacity="0.75" />

              {/* Rear Wheel (cx=33, cy=33) */}
              <g className={`wheel-svg-rear ${isMoving ? "spinning" : ""}`}>
                <circle cx="33" cy="33" r="6.5" fill="#141519" stroke="#2D2F38" strokeWidth="1" />
                <circle cx="33" cy="33" r="4.2" fill={`url(#rimGrad-${maskId})`} />
                <line x1="33" y1="29.2" x2="33" y2="36.8" stroke="#E5E7EB" strokeWidth="0.8" />
                <line x1="29.4" y1="31.8" x2="36.6" y2="34.2" stroke="#E5E7EB" strokeWidth="0.8" />
                <line x1="30.2" y1="35.2" x2="35.8" y2="30.8" stroke="#E5E7EB" strokeWidth="0.8" />
                <circle cx="33" cy="33" r="1.2" fill="#111" />
              </g>

              {/* Front Wheel (cx=81, cy=33) */}
              <g className={`wheel-svg-front ${isMoving ? "spinning" : ""}`}>
                <circle cx="81" cy="33" r="6.5" fill="#141519" stroke="#2D2F38" strokeWidth="1" />
                <circle cx="81" cy="33" r="4.2" fill={`url(#rimGrad-${maskId})`} />
                <line x1="81" y1="29.2" x2="81" y2="36.8" stroke="#E5E7EB" strokeWidth="0.8" />
                <line x1="77.4" y1="31.8" x2="84.6" y2="34.2" stroke="#E5E7EB" strokeWidth="0.8" />
                <line x1="78.2" y1="35.2" x2="83.8" y2="30.8" stroke="#E5E7EB" strokeWidth="0.8" />
                <circle cx="81" cy="33" r="1.2" fill="#111" />
              </g>
            </svg>
          </div>
        </div>

        {/* Milestone Nodes */}
        <div className="car-milestones-row">
          {STEPS.map((step, idx) => {
            const isReached = reachedSteps.includes(idx);
            const isCurrent = idx === targetIndex;
            const stepTimestamp = timeline?.find((t) => t.key === step.key)?.at;

            return (
              <div
                key={step.key}
                className={`car-milestone-node ${isReached ? "is-reached" : ""} ${isCurrent ? "is-current" : ""}`}
                style={{ left: `${STEP_PERCENTAGES[idx]}%` }}
              >
                {/* Node Indicator Dot */}
                <div className="car-node-dot">
                  {isReached && !isCurrent ? (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : isCurrent ? (
                    <span className="car-beacon-core" />
                  ) : (
                    <span className="car-unreached-dot" />
                  )}
                </div>

                {/* Node Label */}
                <div className="car-node-label-container">
                  <span className="car-node-label">
                    {isCompact ? step.shortLabel : step.label}
                  </span>
                  {!isCompact && stepTimestamp && (
                    <span className="car-node-time">
                      {new Date(stepTimestamp).toLocaleTimeString(undefined, {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Narrative Status Box (Detail variant or when requested) */}
      {!isCompact && showNarrative && (
        <div className="car-narrative-banner">
          <div className="car-narrative-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
              <circle cx="7" cy="17" r="2" />
              <path d="M9 17h6" />
              <circle cx="17" cy="17" r="2" />
            </svg>
          </div>
          <div>
            <div className="car-narrative-title">{narrative.title}</div>
            <div className="car-narrative-desc">{narrative.desc}</div>
          </div>
        </div>
      )}
    </div>
  );
}