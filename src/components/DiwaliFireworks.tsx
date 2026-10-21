import { useEffect, useRef } from "react";

interface Props {
  running: boolean;
}

interface Point {
  x: number;
  y: number;
}

interface Spark extends Point {
  velocityX: number;
  velocityY: number;
  age: number;
  lifetime: number;
  color: string;
  size: number;
  trail: Point[];
}

interface Rocket extends Point {
  targetX: number;
  targetY: number;
  startX: number;
  startY: number;
  age: number;
  trail: Point[];
}

interface Flash extends Point {
  age: number;
}

const COLORS = ["255,211,132", "255,236,195", "255,169,83", "255,249,228"];

const DiwaliFireworks = ({ running }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context || !running) return;

    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let width = 0;
    let height = 0;
    let frameId = 0;
    let lastTime = 0;
    let elapsed = 0;
    let launchAt = 0;
    let launchIndex = 0;
    const sparks: Spark[] = [];
    const rockets: Rocket[] = [];
    const flashes: Flash[] = [];

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      width = bounds.width;
      height = bounds.height;
      // Limit the drawing resolution on high-density phones.
      const density = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(width * density);
      canvas.height = Math.round(height * density);
      context.setTransform(density, 0, 0, density, 0, 0);
    };

    const explode = (rocket: Rocket) => {
      const radius = Math.min(width * .26, 180);
      const count = width < 768 ? 44 : 64;
      for (let index = 0; index < count; index++) {
        const angle = (index / count) * Math.PI * 2 + (Math.random() - .5) * .12;
        const speed = radius * (.65 + Math.random() * .85);
        sparks.push({
          x: rocket.targetX, y: rocket.targetY,
          velocityX: Math.cos(angle) * speed,
          velocityY: Math.sin(angle) * speed,
          age: 0, lifetime: 1.15 + Math.random() * .7,
          color: COLORS[index % COLORS.length],
          size: .6 + Math.random() * .65,
          trail: [],
        });
      }
      flashes.push({ x: rocket.targetX, y: rocket.targetY, age: 0 });
    };

    const draw = (time: number) => {
      frameId = requestAnimationFrame(draw);
      if (!lastTime) { lastTime = time; return; }
      // Draw at 30 fps; fixed bounds avoid catch-up work after a hidden tab.
      if (time - lastTime < 1000 / 30) return;
      const delta = Math.min((time - lastTime) / 1000, .05);
      lastTime = time;
      elapsed += delta;
      context.clearRect(0, 0, width, height);
      context.globalCompositeOperation = "lighter";

      if (elapsed >= launchAt && width && height) {
        const anchors = width < 768
          ? [[.83, .2], [.15, .6], [.78, .72], [.62, .39]]
          : [[.85, .2], [.46, .6], [.7, .78], [.48, .24]];
        const anchor = anchors[launchIndex++ % anchors.length];
        const targetX = width * anchor[0] + (Math.random() - .5) * width * .06;
        const targetY = height * anchor[1];
        const startX = targetX + (Math.random() - .5) * 45;
        const startY = Math.min(height + 10, targetY + Math.min(height * .4, 230));
        rockets.push({ x: startX, y: startY, targetX, targetY, startX, startY, age: 0, trail: [] });
        launchAt = elapsed + .5 + Math.random() * .2;
      }

      for (let index = rockets.length - 1; index >= 0; index--) {
        const rocket = rockets[index];
        rocket.age += delta;
        const progress = Math.min(rocket.age / .75, 1);
        const eased = 1 - (1 - progress) ** 1.7;
        rocket.trail.unshift({ x: rocket.x, y: rocket.y });
        rocket.trail.length = Math.min(rocket.trail.length, 9);
        rocket.x = rocket.startX + (rocket.targetX - rocket.startX) * eased;
        rocket.y = rocket.startY + (rocket.targetY - rocket.startY) * eased;
        let previous: Point = rocket;
        rocket.trail.forEach((point, segment) => {
          context.strokeStyle = `rgba(255,203,123,${.65 * (1 - segment / 9)})`;
          context.lineWidth = 1.2 * (1 - segment / 12);
          context.beginPath(); context.moveTo(previous.x, previous.y); context.lineTo(point.x, point.y); context.stroke();
          previous = point;
        });
        context.fillStyle = "#fff5d6";
        context.beginPath(); context.arc(rocket.x, rocket.y, 1.3, 0, Math.PI * 2); context.fill();
        if (progress === 1) { explode(rocket); rockets.splice(index, 1); }
      }

      for (let index = sparks.length - 1; index >= 0; index--) {
        const spark = sparks[index];
        spark.age += delta;
        if (spark.age >= spark.lifetime) { sparks.splice(index, 1); continue; }
        spark.trail.unshift({ x: spark.x, y: spark.y });
        spark.trail.length = Math.min(spark.trail.length, 5);
        const drag = Math.exp(-1.25 * delta);
        spark.velocityX *= drag;
        spark.velocityY = spark.velocityY * drag + 48 * delta;
        spark.x += spark.velocityX * delta;
        spark.y += spark.velocityY * delta;
        const life = spark.age / spark.lifetime;
        const twinkle = life > .55 ? .65 + .35 * Math.sin(spark.age * 34 + index) ** 2 : 1;
        const opacity = Math.min(1, (1 - life) * 1.6) * twinkle;
        let previous: Point = spark;
        spark.trail.forEach((point, segment) => {
          context.strokeStyle = `rgba(${spark.color},${opacity * (1 - segment / 5) * .65})`;
          context.lineWidth = spark.size;
          context.beginPath(); context.moveTo(previous.x, previous.y); context.lineTo(point.x, point.y); context.stroke();
          previous = point;
        });
        context.fillStyle = `rgba(${spark.color},${opacity})`;
        context.beginPath(); context.arc(spark.x, spark.y, spark.size, 0, Math.PI * 2); context.fill();
      }

      for (let index = flashes.length - 1; index >= 0; index--) {
        const flash = flashes[index];
        flash.age += delta;
        if (flash.age > .2) { flashes.splice(index, 1); continue; }
        const glow = context.createRadialGradient(flash.x, flash.y, 0, flash.x, flash.y, 24);
        glow.addColorStop(0, `rgba(255,238,188,${.4 * (1 - flash.age / .2)})`);
        glow.addColorStop(1, "rgba(255,183,90,0)");
        context.fillStyle = glow;
        context.fillRect(flash.x - 24, flash.y - 24, 48, 48);
      }
    };

    const updatePlayback = () => {
      cancelAnimationFrame(frameId);
      lastTime = 0;
      if (running && !preference.matches && !document.hidden) frameId = requestAnimationFrame(draw);
      if (preference.matches) context.clearRect(0, 0, width, height);
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    updatePlayback();
    preference.addEventListener("change", updatePlayback);
    document.addEventListener("visibilitychange", updatePlayback);
    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
      preference.removeEventListener("change", updatePlayback);
      document.removeEventListener("visibilitychange", updatePlayback);
    };
  }, [running]);

  return <canvas ref={canvasRef} className="diwali-fireworks" aria-hidden="true" />;
};

export default DiwaliFireworks;
