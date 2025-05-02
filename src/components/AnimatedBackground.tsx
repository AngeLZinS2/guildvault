
import React, { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  color: string;
}

export const AnimatedBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    // Set canvas size to window size
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initParticles();
    };
    
    window.addEventListener("resize", handleResize);
    handleResize();
    
    // Track mouse position
    const handleMouseMove = (event: MouseEvent) => {
      mouseRef.current.x = event.clientX;
      mouseRef.current.y = event.clientY;
    };
    
    window.addEventListener("mousemove", handleMouseMove);
    
    // Initialize particles
    let particles: Particle[] = [];
    
    const initParticles = () => {
      particles = [];
      const particleCount = Math.min(window.innerWidth, window.innerHeight) / 10;
      
      // Guild theme colors
      const colors = [
        "rgba(30, 174, 219, 0.4)", // primary color
        "rgba(30, 174, 219, 0.2)",
        "rgba(30, 174, 219, 0.1)",
        "rgba(255, 107, 53, 0.2)", // secondary color
      ];
      
      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: Math.random() * 4 + 1,
          speedX: Math.random() * 0.5 - 0.25,
          speedY: Math.random() * 0.5 - 0.25,
          color: colors[Math.floor(Math.random() * colors.length)]
        });
      }
    };
    
    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      particles.forEach(particle => {
        // Update position
        particle.x += particle.speedX;
        particle.y += particle.speedY;
        
        // Wrap particles around screen
        if (particle.x < 0) particle.x = canvas.width;
        if (particle.x > canvas.width) particle.x = 0;
        if (particle.y < 0) particle.y = canvas.height;
        if (particle.y > canvas.height) particle.y = 0;
        
        // Calculate distance from mouse
        const dx = mouseRef.current.x - particle.x;
        const dy = mouseRef.current.y - particle.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Draw connections if particles are close to mouse
        const maxDistance = 150;
        if (distance < maxDistance) {
          ctx.beginPath();
          ctx.strokeStyle = `rgba(30, 174, 219, ${0.6 - distance / maxDistance * 0.5})`;
          ctx.lineWidth = 1;
          ctx.moveTo(particle.x, particle.y);
          ctx.lineTo(mouseRef.current.x, mouseRef.current.y);
          ctx.stroke();
          
          // Push particles away from mouse slightly
          const forceDirectionX = dx / distance;
          const forceDirectionY = dy / distance;
          const force = (maxDistance - distance) / maxDistance;
          particle.speedX -= forceDirectionX * force * 0.02;
          particle.speedY -= forceDirectionY * force * 0.02;
        }
        
        // Connect nearby particles
        particles.forEach(otherParticle => {
          const dx = particle.x - otherParticle.x;
          const dy = particle.y - otherParticle.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < 100) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(30, 174, 219, ${0.2 - distance / 100 * 0.2})`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(particle.x, particle.y);
            ctx.lineTo(otherParticle.x, otherParticle.y);
            ctx.stroke();
          }
        });
        
        // Draw particle
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = particle.color;
        ctx.fill();
      });
      
      // Apply slight damping to particle speed
      particles.forEach(particle => {
        particle.speedX *= 0.99;
        particle.speedY *= 0.99;
      });
      
      requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);
  
  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 -z-10 bg-guild-dark bg-opacity-95"
      style={{ 
        backgroundImage: "linear-gradient(to bottom, rgba(18, 20, 32, 0.97), rgba(26, 28, 41, 0.98))" 
      }}
    />
  );
};
