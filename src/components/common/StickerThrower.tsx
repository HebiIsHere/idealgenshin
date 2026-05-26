import React, { useEffect, useRef, useCallback, useState } from 'react';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';

interface Sticker {
  id: number;
  src: string;
  left: number;
  flip: boolean;
  scale: number;
  vx: number;
  vy: number;
  startTime: number;
}

const G = 900;
const DURATION = 4;
const MANIFEST_URL = '/stickers/manifest.json';

function StickerThrower({ characterName }: { characterName: string | null }): React.ReactElement | null {
  const [active, setActive] = useState<Sticker[]>([]);
  const [manifest, setManifest] = useState<Record<string, string[]> | null>(null);
  const idRef = useRef(0);
  const charRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const burstRef = useRef<ReturnType<typeof setTimeout>>();
  const rafRef = useRef<number>();
  const activeRef = useRef<Sticker[]>([]);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    fetch(MANIFEST_URL).then((r) => r.json()).then(setManifest).catch(() => {});
  }, []);

  useEffect(() => { activeRef.current = active; }, [active]);

  const tick = useCallback(() => {
    if (activeRef.current.length > 0) {
      setActive((prev) => [...prev]);
    }
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [tick]);

  const throwOne = useCallback(() => {
    if (!manifest || !characterName) return;
    const pool = manifest[characterName];
    if (!pool || pool.length === 0) return;
    const src = pool[Math.floor(Math.random() * pool.length)];
    const s: Sticker = {
      id: idRef.current++,
      src,
      left: 5 + Math.random() * 75,
      flip: Math.random() > 0.5,
      scale: 0.7 + Math.random() * 0.5,
      vx: 40 + Math.random() * 60,
      vy: 800 + Math.random() * 400,
      startTime: performance.now() / 1000,
    };
    setActive((prev) => [...prev.slice(-5), s]);
    setTimeout(() => setActive((prev) => prev.filter((x) => x.id !== s.id)), (DURATION + 0.6) * 1000);
  }, [manifest, characterName]);

  const schedulePeriodic = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      throwOne();
      schedulePeriodic();
    }, 20000 + Math.random() * 20000);
  }, [throwOne]);

  useEffect(() => {
    if (!characterName || !manifest) return;
    if (characterName === charRef.current) return;
    charRef.current = characterName;
    if (timerRef.current) clearTimeout(timerRef.current);
    if (burstRef.current) clearTimeout(burstRef.current);
    setActive([]);
    const count = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < count; i++) {
      burstRef.current = setTimeout(() => throwOne(), i * 900 + 400);
    }
    schedulePeriodic();
  }, [characterName, manifest, throwOne, schedulePeriodic]);

  const getStyle = (s: Sticker): React.CSSProperties => {
    const elapsed = (performance.now() / 1000) - s.startTime;
    if (elapsed < 0) return { display: 'none' };
    const t = Math.min(elapsed, DURATION + 0.5);
    const bottom = -60 + s.vy * t - 0.5 * G * t * t;
    const x = s.vx * t;
    const rotation = (s.vy / 100) * t;
    const opacity = t < 0.12 ? t / 0.12 : t > DURATION - 0.25 ? Math.max(0, (DURATION + 0.5 - t) / 0.75) : 1;
    const w = isMobile ? 36 : 56;
    return {
      position: 'fixed', bottom, left: `${s.left}%`, zIndex: 50,
      pointerEvents: 'none', userSelect: 'none',
      transform: `translateX(${x}px) rotate(${rotation}deg) scaleX(${s.flip ? -1 : 1}) scale(${s.scale})`,
      opacity, width: w, height: 'auto',
    } as React.CSSProperties;
  };

  return (
    <>
      {active.map((s) => (
        <Box key={s.id} component="img" src={s.src} alt="" sx={getStyle(s)} />
      ))}
    </>
  );
}

export default StickerThrower;
