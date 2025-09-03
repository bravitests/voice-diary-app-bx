'use client';

import React, { useRef, useEffect } from 'react';
import p5 from 'p5';

// Define the component's props
interface VoiceVisualizerProps {
  /** A number between 0 and 1 representing the current audio level */
  audioLevel: number;
  /** A boolean to indicate if recording is active, controlling the animation */
  isRecording: boolean;
  /** Optional: class name for the container */
  className?: string;
}

const VoiceVisualizer: React.FC<VoiceVisualizerProps> = ({
  audioLevel,
  isRecording,
  className,
}) => {
  const sketchRef = useRef<HTMLDivElement>(null);
  const propsRef = useRef({ audioLevel, isRecording });

  // Update the ref whenever props change
  useEffect(() => {
    propsRef.current = { audioLevel, isRecording };
  }, [audioLevel, isRecording]);

  useEffect(() => {
    if (!sketchRef.current) return;

    const sketch = (p: p5) => {
      let smoothVolume = 0;
      const particles: OrbParticle[] = [];
      const maxParticles = 80; // Reduced for smaller canvas
      const orbSize = 60; // Reduced for smaller canvas
      let time = 0;

      class OrbParticle {
        pos: p5.Vector;
        vel: p5.Vector;
        life: number;
        maxLife: number;
        size: number;
        hue: number;
        spin: number;
        angle: number;

        constructor(x: number, y: number, volumeLevel: number) {
          this.pos = p.createVector(x, y);
          const angle = p.random(p.TWO_PI);
          const speed = p.random(0.3, 2) + volumeLevel * 3;
          this.vel = p5.Vector.fromAngle(angle, speed);
          this.life = 255;
          this.maxLife = p.random(60, 120);
          this.size = p.random(2, 8) + volumeLevel * 6;
          this.hue = p.random(150, 280);
          this.spin = p.random(-0.08, 0.08);
          this.angle = p.random(p.TWO_PI);
        }

        update() {
          this.pos.add(this.vel);
          this.vel.mult(0.985);
          this.angle += this.spin;
          this.life -= 255 / this.maxLife;
        }

        display() {
          const alpha = p.map(this.life, 0, 255, 0, 90);
          const currentSize = this.size * (this.life / 255);

          p.push();
          p.translate(this.pos.x, this.pos.y);
          p.rotate(this.angle);

          // Outer glow
          p.fill(this.hue, 70, 90, alpha * 0.3);
          p.noStroke();
          p.ellipse(0, 0, currentSize * 2);

          // Main particle
          p.fill(this.hue, 80, 95, alpha);
          p.ellipse(0, 0, currentSize);

          // Inner highlight
          p.fill(this.hue, 40, 100, alpha * 0.8);
          p.ellipse(0, 0, currentSize * 0.4);

          p.pop();
        }

        isDead() {
          return this.life <= 0;
        }
      }

      p.setup = () => {
        const container = sketchRef.current!;
        p.createCanvas(container.offsetWidth, container.offsetHeight);
        p.colorMode(p.HSB, 360, 100, 100, 100);
      };

      p.draw = () => {
        const { audioLevel, isRecording } = propsRef.current;
        time += 0.01;

        smoothVolume = p.lerp(smoothVolume, audioLevel, 0.15);

        if (!isRecording && smoothVolume < 0.01) {
          smoothVolume = 0;
          if (particles.length === 0) {
            p.background(8, 8, 8);
            return;
          }
        }

        p.background(8, 8, 8);

        const centerX = p.width / 2;
        const centerY = p.height / 2;

        // Adjust breathing size for smaller container
        const breathingSize = orbSize + smoothVolume * 120 + p.sin(time * 2) * 8;
        const pulseAlpha = p.map(smoothVolume, 0, 0.5, 40, 90);

        p.push();
        p.translate(centerX, centerY);
        p.rotate(time * 0.5);

        for (let i = 6; i > 0; i--) {
          const size = breathingSize * (i / 6);
          const alpha = pulseAlpha / (i * 0.5);
          const hue = 200 + p.sin(time + i) * 20;
          p.fill(hue, 80, 90, alpha);
          p.noStroke();
          p.ellipse(0, 0, size);
        }
        p.pop();

        // Spawn particles
        if (isRecording && smoothVolume > 0.02) {
          const spawnCount = Math.floor(p.map(smoothVolume, 0.02, 0.3, 1, 3, true));
          for (let i = 0; i < spawnCount && particles.length < maxParticles; i++) {
            particles.push(new OrbParticle(centerX, centerY, smoothVolume));
          }
        }

        // Update and draw particles
        for (let i = particles.length - 1; i >= 0; i--) {
          particles[i].update();
          particles[i].display();
          if (particles[i].isDead()) {
            particles.splice(i, 1);
          }
        }
      };

      p.windowResized = () => {
        if (sketchRef.current) {
          const container = sketchRef.current;
          p.resizeCanvas(container.offsetWidth, container.offsetHeight);
        }
      };
    };

    let p5Instance = new p5(sketch, sketchRef.current);

    return () => {
      p5Instance.remove();
    };
  }, []);

  return <div ref={sketchRef} className={className} style={{ width: '100%', height: '100%' }} />;
};

export default VoiceVisualizer;