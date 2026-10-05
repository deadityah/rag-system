"use client";

import { motion } from "motion/react";
import React, { useEffect, useRef } from "react";

interface Dot {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  vx: number;
  vy: number;
  baseOpacity: number;
}

interface DotBackgroundProps {
  dotSize?: number;
  dotSpacing?: number;
  repulsionRadius?: number;
  repulsionStrength?: number;
}

export function DotBackground({
  dotSize = 2,
  dotSpacing = 28,
  repulsionRadius = 110,
  repulsionStrength = 28,
}: DotBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    // Check prefers-reduced-motion for accessibility
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    let animationFrameId: number;
    let dots: Dot[] = [];
    let mouseX = Number.POSITIVE_INFINITY;
    let mouseY = Number.POSITIVE_INFINITY;
    let lastTime = performance.now();

    // Spring constants from repeleffect.md
    const stiffness = 300;
    const damping = 30;
    const mass = 0.5;
    const proximityBoost = 0.8;

    const resizeCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2); // Cap DPR at 2 for performance
      const width = window.innerWidth;
      const height = window.innerHeight;

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);

      // Generate dot grid based on window dimensions
      dots = [];
      const cols = Math.ceil(width / dotSpacing);
      const rows = Math.ceil(height / dotSpacing);
      const centerX = width / 2;
      const centerY = height / 2;
      const maxDistance = Math.sqrt(centerX * centerX + centerY * centerY);

      for (let row = 0; row <= rows; row++) {
        for (let col = 0; col <= cols; col++) {
          const x = col * dotSpacing;
          const y = row * dotSpacing;

          const dx = x - centerX;
          const dy = y - centerY;
          const distFromCenter = Math.sqrt(dx * dx + dy * dy);
          const edgeFactor = Math.min(distFromCenter / (maxDistance * 0.75), 1);

          // Subtle natural falloff at edges
          if (Math.random() > edgeFactor * 0.9 + 0.1) {
            // Keep dots consistent across pattern
          }

          const pattern = (row + col) % 3;
          const baseOpacities = [0.25, 0.45, 0.65];
          const baseOpacity = baseOpacities[pattern] * (0.4 + 0.6 * edgeFactor);

          dots.push({
            x,
            y,
            baseX: x,
            baseY: y,
            vx: 0,
            vy: 0,
            baseOpacity,
          });
        }
      }

      // If reduced motion is requested, render static dots once
      if (prefersReducedMotion) {
        drawStaticDots();
      }
    };

    const drawStaticDots = () => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      for (let i = 0; i < dots.length; i++) {
        const dot = dots[i];
        ctx.beginPath();
        ctx.arc(dot.baseX, dot.baseY, dotSize / 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(120, 120, 135, ${dot.baseOpacity * 0.6})`;
        ctx.fill();
      }
    };

    const render = (currentTime: number) => {
      const dt = Math.min((currentTime - lastTime) / 1000, 0.032); // Clamp dt to prevent jumping
      lastTime = currentTime;

      const width = window.innerWidth;
      const height = window.innerHeight;
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < dots.length; i++) {
        const dot = dots[i];

        // Repulsion physics calculation from repeleffect.md
        let targetOffsetX = 0;
        let targetOffsetY = 0;
        let currentOpacity = dot.baseOpacity;

        if (Number.isFinite(mouseX) && Number.isFinite(mouseY)) {
          const dx = dot.baseX - mouseX;
          const dy = dot.baseY - mouseY;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < repulsionRadius) {
            const force = (1 - distance / repulsionRadius) * repulsionStrength;
            const angle = Math.atan2(dy, dx);
            targetOffsetX = Math.cos(angle) * force;
            targetOffsetY = Math.sin(angle) * force;

            const proximityFactor = 1 - distance / repulsionRadius;
            currentOpacity = Math.min(1, dot.baseOpacity + proximityFactor * proximityBoost);
          }
        }

        // Spring physics: F = -k*(x - target) - c*v
        const currentOffsetX = dot.x - dot.baseX;
        const currentOffsetY = dot.y - dot.baseY;

        const springForceX = -stiffness * (currentOffsetX - targetOffsetX) - damping * dot.vx;
        const springForceY = -stiffness * (currentOffsetY - targetOffsetY) - damping * dot.vy;

        const ax = springForceX / mass;
        const ay = springForceY / mass;

        dot.vx += ax * dt;
        dot.vy += ay * dt;

        dot.x += dot.vx * dt;
        dot.y += dot.vy * dt;

        // Render dot
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, dotSize / 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(120, 120, 135, ${currentOpacity * 0.55})`;
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    // Mouse & Touch listeners on window
    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };

    const handleMouseLeave = () => {
      mouseX = Number.POSITIVE_INFINITY;
      mouseY = Number.POSITIVE_INFINITY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        mouseX = e.touches[0].clientX;
        mouseY = e.touches[0].clientY;
      }
    };

    const handleTouchEnd = () => {
      mouseX = Number.POSITIVE_INFINITY;
      mouseY = Number.POSITIVE_INFINITY;
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("mouseleave", handleMouseLeave, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });
    window.addEventListener("resize", resizeCanvas);

    resizeCanvas();

    if (!prefersReducedMotion) {
      animationFrameId = requestAnimationFrame(render);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("resize", resizeCanvas);
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [dotSize, dotSpacing, repulsionRadius, repulsionStrength]);

  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <canvas ref={canvasRef} className="block h-full w-full" />
    </motion.div>
  );
}

export default DotBackground;
