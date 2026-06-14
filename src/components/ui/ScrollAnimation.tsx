'use client';

import { useRef, useState, useEffect } from 'react';

export type AnimationType =
  | 'fade'
  | 'slide-left'
  | 'slide-right'
  | 'slide-up'
  | 'slide-down'
  | 'zoom'
  | 'none';

interface ScrollAnimationProps {
  animation: AnimationType;
  delay?: number;
  duration?: number;
  once?: boolean;
  className?: string;
  children: React.ReactNode;
}

function getInitialStyles(animation: AnimationType): React.CSSProperties {
  switch (animation) {
    case 'fade':
      return { opacity: 0 };
    case 'slide-left':
      return { opacity: 0, transform: 'translateX(-30px)' };
    case 'slide-right':
      return { opacity: 0, transform: 'translateX(30px)' };
    case 'slide-up':
      return { opacity: 0, transform: 'translateY(30px)' };
    case 'slide-down':
      return { opacity: 0, transform: 'translateY(-30px)' };
    case 'zoom':
      return { opacity: 0, transform: 'scale(0.95)' };
    case 'none':
      return {};
  }
}

function getDesktopInitialStyles(animation: AnimationType): React.CSSProperties {
  switch (animation) {
    case 'slide-left':
      return { opacity: 0, transform: 'translateX(-60px)' };
    case 'slide-right':
      return { opacity: 0, transform: 'translateX(60px)' };
    case 'slide-up':
      return { opacity: 0, transform: 'translateY(60px)' };
    default:
      return getInitialStyles(animation);
  }
}

const visibleStyles: React.CSSProperties = {
  opacity: 1,
  transform: 'translateX(0) translateY(0) scale(1)',
};

export default function ScrollAnimation({
  animation,
  delay = 0,
  duration = 700,
  once = true,
  className,
  children,
}: ScrollAnimationProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  // Skip transition for elements already in viewport on first paint
  const [skipTransition, setSkipTransition] = useState(false);
  const isFirstCallback = useRef(true);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  // Check for reduced motion preference
  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mql.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  // Check for desktop breakpoint (768px+)
  useEffect(() => {
    const mql = window.matchMedia('(min-width: 768px)');
    setIsDesktop(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  // IntersectionObserver
  useEffect(() => {
    if (animation === 'none' || prefersReducedMotion) return;

    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // If element was already visible on first observation (above fold),
          // show it immediately without transition to avoid "plop" effect
          if (isFirstCallback.current) {
            setSkipTransition(true);
          }
          isFirstCallback.current = false;
          setIsVisible(true);
          if (once) {
            observer.unobserve(element);
          }
        } else {
          isFirstCallback.current = false;
          if (!once) {
            setIsVisible(false);
          }
        }
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px',
      }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [animation, once, prefersReducedMotion]);

  // No wrapper for 'none' animation
  if (animation === 'none') {
    return <>{children}</>;
  }

  // Reduced motion: render without animation
  if (prefersReducedMotion) {
    return (
      <div className={className}>
        {children}
      </div>
    );
  }

  const initialStyles = isDesktop
    ? getDesktopInitialStyles(animation)
    : getInitialStyles(animation);

  const style: React.CSSProperties = skipTransition
    ? visibleStyles
    : {
        ...(isVisible ? visibleStyles : initialStyles),
        transition: `opacity ${duration}ms ease-out, transform ${duration}ms ease-out`,
        ...(delay > 0 && { transitionDelay: `${delay}ms` }),
      };

  return (
    <div ref={ref} className={className} style={style}>
      {children}
    </div>
  );
}
