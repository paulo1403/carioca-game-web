import { useEffect, useState } from "react";

interface BreakpointState {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isLarge: boolean;
  width: number;
  height: number;
  isLandscape: boolean;
  isTouch: boolean;
}

export const useIsMobile = () => {
  const [breakpoints, setBreakpoints] = useState<BreakpointState>({
    isMobile: false,
    isTablet: false,
    isDesktop: false,
    isLarge: false,
    width: 0,
    height: 0,
    isLandscape: false,
    isTouch: false,
  });

  useEffect(() => {
    const checkBreakpoints = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;

      setBreakpoints({
        isMobile: width < 768,
        isTablet: width >= 768 && width < 1024,
        isDesktop: width >= 1024,
        isLarge: width >= 1280,
        width,
        height,
        isLandscape: width > height,
        isTouch,
      });
    };

    checkBreakpoints();
    window.addEventListener("resize", checkBreakpoints);
    window.addEventListener("orientationchange", checkBreakpoints);

    return () => {
      window.removeEventListener("resize", checkBreakpoints);
      window.removeEventListener("orientationchange", checkBreakpoints);
    };
  }, []);

  return breakpoints;
};

// Legacy export for backward compatibility
export const useResponsive = () => {
  const breakpoints = useIsMobile();
  return breakpoints.isMobile;
};
