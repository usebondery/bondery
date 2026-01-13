"use client";

import { useEffect, useRef } from "react";
import { Button, Container, Title, Text, Stack } from "@mantine/core";
import { IconNetwork, IconCalendar, IconUsers } from "@tabler/icons-react";
import Link from "next/link";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const particles: Particle[] = [];
    const particleCount = 100;
    const maxDistance = 120;

    // Create particles
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
      });
    }

    function animate() {
      if (!canvas || !ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Update and draw particles
      particles.forEach((particle) => {
        particle.x += particle.vx;
        particle.y += particle.vy;

        // Bounce off edges
        if (particle.x < 0 || particle.x > canvas.width) particle.vx *= -1;
        if (particle.y < 0 || particle.y > canvas.height) particle.vy *= -1;

        // Draw particle
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(79, 70, 229, 0.6)";
        ctx.fill();
      });

      // Draw connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < maxDistance) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            const opacity = (1 - distance / maxDistance) * 0.25;
            ctx.strokeStyle = `rgba(79, 70, 229, ${opacity})`;
            ctx.lineWidth = 1.5;
            ctx.stroke();
          }
        }
      }

      requestAnimationFrame(animate);
    }

    animate();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
    };
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-linear-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-slate-900 dark:to-indigo-950">
      {/* Animated background */}
      <canvas ref={canvasRef} className="absolute inset-0 z-0" aria-hidden="true" />

      {/* Hero Section */}
      <Container size="xl" className="relative z-10">
        <div className="flex min-h-screen flex-col items-center justify-center py-16">
          <Stack gap="xl" className="max-w-5xl text-center">
            {/* Main Headline */}
            <div className="w-full space-y-6 text-center">
              <Title
                order={1}
                className="text-5xl font-extrabold tracking-tight text-gray-900 dark:text-white md:text-7xl"
              >
                Your network,
                <br />
                <span className="bg-linear-to-r from-indigo-600 via-purple-600 to-blue-600 bg-clip-text text-transparent">
                  beautifully organized
                </span>
              </Title>

              <Text
                size="xl"
                mt={"md"}
                className="mx-auto w-full text-xl text-gray-600 dark:text-gray-400"
              >
                Bondery helps you nurture the connections that matter most. Remember important
                moments, visualize your network, and never miss a chance to stay in touch.
              </Text>
            </div>

            {/* CTA Button */}
            <div className="pt-4">
              <Link href="/login">
                <Button size="xl">Start Building Bonds</Button>
              </Link>
            </div>

            {/* Features */}
            <div className="mx-auto mt-16 grid w-full max-w-5xl grid-cols-1 gap-8 md:grid-cols-3">
              <div className="group rounded-3xl border border-gray-200 bg-white/80 p-8 backdrop-blur-sm transition-all hover:border-indigo-300 hover:shadow-xl dark:border-gray-800 dark:bg-gray-900/80 dark:hover:border-indigo-700">
                <div className="mb-4 inline-flex rounded-2xl bg-indigo-100 p-4 dark:bg-indigo-950">
                  <IconNetwork
                    size={32}
                    className="text-indigo-600 dark:text-indigo-400"
                    stroke={2}
                  />
                </div>
                <Title order={3} className="mb-3 text-xl font-bold text-gray-900 dark:text-white">
                  Visualize Your Network
                </Title>
                <Text className="text-gray-600 dark:text-gray-400">
                  See your network as an interactive map. Discover patterns and connections you
                  never knew existed.
                </Text>
              </div>

              <div className="group rounded-3xl border border-gray-200 bg-white/80 p-8 backdrop-blur-sm transition-all hover:border-indigo-300 hover:shadow-xl dark:border-gray-800 dark:bg-gray-900/80 dark:hover:border-indigo-700">
                <div className="mb-4 inline-flex rounded-2xl bg-indigo-100 p-4 dark:bg-indigo-950">
                  <IconCalendar
                    size={32}
                    className="text-indigo-600 dark:text-indigo-400"
                    stroke={2}
                  />
                </div>
                <Title order={3} className="mb-3 text-xl font-bold text-gray-900 dark:text-white">
                  Remember What Matters
                </Title>
                <Text className="text-gray-600 dark:text-gray-400">
                  Track birthdays, anniversaries, and special moments. Get timely reminders so you
                  never miss an important date.
                </Text>
              </div>

              <div className="group rounded-3xl border border-gray-200 bg-white/80 p-8 backdrop-blur-sm transition-all hover:border-indigo-300 hover:shadow-xl dark:border-gray-800 dark:bg-gray-900/80 dark:hover:border-indigo-700">
                <div className="mb-4 inline-flex rounded-2xl bg-indigo-100 p-4 dark:bg-indigo-950">
                  <IconUsers
                    size={32}
                    className="text-indigo-600 dark:text-indigo-400"
                    stroke={2}
                  />
                </div>
                <Title order={3} className="mb-3 text-xl font-bold text-gray-900 dark:text-white">
                  Stay Organized
                </Title>
                <Text className="text-gray-600 dark:text-gray-400">
                  All your contacts, notes, and important details in one beautiful, intuitive
                  interface. Simple yet powerful.
                </Text>
              </div>
            </div>
          </Stack>
        </div>
      </Container>
    </div>
  );
}
