"use client";

import { useEffect } from "react";
import type { Position } from "@yield-copilot/shared";
import { useLocalPosition } from "../hooks/use-local-position";

type PositionTrackerProps = {
  serverPosition: Position;
};

function relativeTime(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffSecs = Math.floor(diffMs / 1000);

  if (diffSecs < 60) return "just now";
  const diffMins = Math.floor(diffSecs / 60);
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? "" : "s"} ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
}

export function PositionTracker({ serverPosition }: PositionTrackerProps) {
  const { position, hydrated, savePosition } = useLocalPosition();

  useEffect(() => {
    savePosition(serverPosition);
  }, [serverPosition, savePosition]);

  const displayPosition = position ?? serverPosition;

  return (
    <div className="panel stack-md">
      <div className="row-between">
        <p className="section-label">Saved position</p>
        {hydrated && (
          <span className="brief-chip">Saved locally</span>
        )}
      </div>
      <dl className="status-grid">
        <div>
          <dt>Venue</dt>
          <dd>{displayPosition.venueLabel}</dd>
        </div>
        <div>
          <dt>Amount</dt>
          <dd>
            {displayPosition.amount} {displayPosition.token}
          </dd>
        </div>
        <div>
          <dt>APY</dt>
          <dd>{displayPosition.currentApy.toFixed(2)}%</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>{displayPosition.status}</dd>
        </div>
      </dl>
      <p className="section-label">
        Last checked: {relativeTime(displayPosition.startedAt)}
      </p>
    </div>
  );
}
