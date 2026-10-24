import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';

export default function useCountUp(target, duration = 1.2, delay = 0) {
  const [display, setDisplay] = useState(0);
  const objRef = useRef({ val: 0 });

  useEffect(() => {
    // Respect prefers-reduced-motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplay(target);
      return;
    }

    const obj = objRef.current;
    obj.val = 0;

    const tween = gsap.to(obj, {
      val: target,
      duration,
      delay,
      ease: 'power2.out',
      onUpdate: () => setDisplay(Math.round(obj.val)),
    });

    return () => tween.kill();
  }, [target, duration, delay]);

  return display;
}
