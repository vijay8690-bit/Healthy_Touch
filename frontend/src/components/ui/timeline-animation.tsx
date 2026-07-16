"use client";

import { useEffect, useRef, useState } from "react";
import { motion, Variants, HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

interface TimelineContentProps {
  as?: keyof JSX.IntrinsicElements;
  animationNum: number;
  timelineRef: React.RefObject<HTMLElement>;
  customVariants?: Variants;
  className?: string;
  children: React.ReactNode;
  [key: string]: any;
}

export function TimelineContent({
  as = "div",
  animationNum,
  timelineRef,
  customVariants,
  className,
  children,
  ...props
}: TimelineContentProps) {
  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      {
        threshold: 0.1,
        rootMargin: "0px 0px -100px 0px",
      }
    );

    const currentElement = elementRef.current;
    const currentTimeline = timelineRef.current;

    if (currentElement) {
      observer.observe(currentElement);
    }

    if (currentTimeline) {
      observer.observe(currentTimeline);
    }

    return () => {
      if (currentElement) {
        observer.unobserve(currentElement);
      }
      if (currentTimeline) {
        observer.unobserve(currentTimeline);
      }
    };
  }, [timelineRef]);

  const defaultVariants: Variants = {
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        delay: animationNum * 0.1,
        duration: 0.5,
      },
    },
    hidden: {
      opacity: 0,
      y: 20,
    },
  };

  const variants = customVariants || defaultVariants;

  // Handle different element types
  const motionProps = {
    initial: "hidden" as const,
    animate: isVisible ? "visible" : "hidden",
    variants: variants,
    className: cn(className),
    ...props,
  };

  // Render based on 'as' prop
  if (as === "span") {
    return (
      <motion.span ref={elementRef as any} {...(motionProps as any)}>
        {children}
      </motion.span>
    );
  }
  if (as === "div") {
    return (
      <motion.div ref={elementRef as any} {...(motionProps as any)}>
        {children}
      </motion.div>
    );
  }
  if (as === "figure") {
    return (
      <motion.figure ref={elementRef as any} {...(motionProps as any)}>
        {children}
      </motion.figure>
    );
  }
  if (as === "a") {
    return (
      <motion.a ref={elementRef as any} {...(motionProps as any)}>
        {children}
      </motion.a>
    );
  }
  if (as === "button") {
    return (
      <motion.button ref={elementRef as any} {...(motionProps as any)}>
        {children}
      </motion.button>
    );
  }

  // Default to div
  return (
    <motion.div ref={elementRef as any} {...(motionProps as any)}>
      {children}
    </motion.div>
  );
}

