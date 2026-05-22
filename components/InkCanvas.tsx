'use client';

import React, { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  maxAlpha: number;
  baseColor: string; // Keep as rgb format so we can inject dynamic alpha
}

export default function InkCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -1000, y: -1000, active: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    const particles: Particle[] = [];
    const maxParticles = 60;
    
    // Explicit gold and cream colors
    const colors = [
      '212, 175, 55',  // Gold
      '245, 240, 232'   // Cream
    ];

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // Create particles
    for (let i = 0; i < maxParticles; i++) {
      const radius = Math.random() * 4 + 1;
      const maxAlpha = Math.random() * 0.4 + 0.1;
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.2,
        radius,
        alpha: Math.random() * maxAlpha,
        maxAlpha,
        baseColor: colors[Math.floor(Math.random() * colors.length)]
      });
    }

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
      mouseRef.current.active = true;
    };

    const handleMouseLeave = () => {
      mouseRef.current.active = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Render and update particles on transparent canvas
      particles.forEach((p) => {
        // Drift motion
        p.x += p.vx;
        p.y += p.vy;

        // Soft fading cycles
        p.alpha += (Math.random() - 0.5) * 0.005;
        if (p.alpha < 0.05) p.alpha = 0.05;
        if (p.alpha > p.maxAlpha) p.alpha = p.maxAlpha;

        // Interaction with cursor (motes float gently away)
        if (mouseRef.current.active) {
          const dx = p.x - mouseRef.current.x;
          const dy = p.y - mouseRef.current.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const forceRadius = 150;

          if (dist < forceRadius) {
            const force = (forceRadius - dist) / forceRadius;
            const angle = Math.atan2(dy, dx);
            const pushX = Math.cos(angle) * force * 0.4;
            const pushY = Math.sin(angle) * force * 0.4;

            p.x += pushX;
            p.y += pushY;
          }
        }

        // Boundary wrapping
        if (p.x < -10) p.x = canvas.width + 10;
        if (p.x > canvas.width + 10) p.x = -10;
        if (p.y < -10) p.y = canvas.height + 10;
        if (p.y > canvas.height + 10) p.y = -10;

        // Draw particle
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        
        ctx.fillStyle = `rgba(${p.baseColor}, ${p.alpha})`;
        ctx.fill();
      });

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full -z-50 pointer-events-none"
    />
  );
}
