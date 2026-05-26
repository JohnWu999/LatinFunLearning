"use client";

import type { CSSProperties } from "react";
import { useCallback, useState } from "react";

type FlyingGem = {
  id: string;
  index: number;
  startX: number;
  startY: number;
  deltaX: number;
  deltaY: number;
};

export function useRewardGemBurst(sourceSelector = "main") {
  const [flyingGems, setFlyingGems] = useState<FlyingGem[]>([]);

  const launchGemBurst = useCallback((amount: number, source?: HTMLElement | null) => {
    if (typeof window === "undefined" || amount <= 0) return;
    const now = Date.now();
    const visualCount = Math.min(Math.max(1, amount), 12);
    const fallbackSource = sourceSelector ? document.querySelector<HTMLElement>(sourceSelector) : null;
    const sourceRect = (source ?? fallbackSource)?.getBoundingClientRect();
    const globalGemCounter = document.querySelector<HTMLElement>('[data-gem-counter="global"]');
    const targetRect = globalGemCounter?.getBoundingClientRect();
    const startX = sourceRect ? sourceRect.left + sourceRect.width / 2 : window.innerWidth / 2;
    const startY = sourceRect ? sourceRect.top + sourceRect.height * 0.42 : window.innerHeight * 0.58;
    const targetX = targetRect ? targetRect.left + targetRect.width / 2 : window.innerWidth - 120;
    const targetY = targetRect ? targetRect.top + targetRect.height / 2 : 36;
    const gems = Array.from({ length: visualCount }, (_, index) => {
      const fan = (index - (visualCount - 1) / 2) * 14;
      return {
        id: `${now}-${index}-${Math.random().toString(16).slice(2)}`,
        index,
        startX: startX + fan,
        startY: startY + Math.abs(fan) * 0.18,
        deltaX: targetX - startX - fan * 0.22,
        deltaY: targetY - startY - 10
      };
    });
    setFlyingGems((items) => [...items, ...gems]);
    window.setTimeout(() => {
      setFlyingGems((items) => items.filter((item) => !gems.some((gem) => gem.id === item.id)));
    }, 1200);
  }, [sourceSelector]);

  return { flyingGems, launchGemBurst };
}

export function RewardGemBurst({ gems }: { gems: FlyingGem[] }) {
  return (
    <div className="reward-gem-burst" aria-hidden="true">
      {gems.map((gem) => (
        <span
          key={gem.id}
          style={{
            "--gem-delay": `${gem.index * 0.045}s`,
            "--gem-start-x": `${gem.startX}px`,
            "--gem-start-y": `${gem.startY}px`,
            "--gem-delta-x": `${gem.deltaX}px`,
            "--gem-delta-y": `${gem.deltaY}px`,
            "--gem-pop": `${(gem.index - 2) * 10}px`
          } as CSSProperties}
        >
          ◆
        </span>
      ))}
    </div>
  );
}
