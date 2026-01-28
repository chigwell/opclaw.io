"use client";

import { useEffect, useState } from "react";
import { SparklesCore } from "@/components/ui/sparkles";

const TypewriterText = ({ text, speed = 50 }: { text: string; speed?: number }) => {
  const [displayedText, setDisplayedText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayedText((prev) => prev + text[currentIndex]);
        setCurrentIndex((prev) => prev + 1);
      }, speed);
      return () => clearTimeout(timeout);
    }
  }, [currentIndex, text, speed]);

  useEffect(() => {
    const cursorInterval = setInterval(() => {
      setShowCursor((prev) => !prev);
    }, 530);
    return () => clearInterval(cursorInterval);
  }, []);

  return (
    <span>
      {displayedText}
      <span className={`${showCursor ? "opacity-100" : "opacity-0"} transition-opacity`}>|</span>
    </span>
  );
};

export default function Home() {
  const [startTyping, setStartTyping] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setStartTyping(true), 800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <main className="h-screen w-screen bg-black flex items-center justify-center overflow-hidden">
      {/* Sparkles Background */}
      <div className="w-full absolute inset-0 h-full">
        <SparklesCore
          id="tsparticlesfullpage"
          background="transparent"
          minSize={0.6}
          maxSize={1.4}
          particleDensity={100}
          className="w-full h-full"
          particleColor="#FFFFFF"
        />
      </div>

      {/* Content */}
      <div className="relative z-10 text-center px-4">
        {/* Gradient Title */}
        <h1 className="text-6xl md:text-8xl lg:text-9xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-neutral-50 to-neutral-400 mb-8">
          molt.tech
        </h1>

        {/* Typing Animation Tagline */}
        <p className="text-neutral-400 text-lg md:text-xl lg:text-2xl max-w-3xl mx-auto h-16 md:h-12">
          {startTyping && (
            <TypewriterText
              text="Deploy your own molt.bot instance in minutes."
              speed={45}
            />
          )}
        </p>

        {/* Glowing gradient line */}
        <div className="w-40 h-px mx-auto bg-gradient-to-r from-transparent via-indigo-500 to-transparent mt-8" />

        {/* CTA Buttons */}
        <div className="mt-12 flex flex-col sm:flex-row gap-4 justify-center">
          <button className="px-8 py-3 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-medium hover:opacity-90 transition-opacity hover:scale-105 transform duration-200">
            Get Started
          </button>
          <button className="px-8 py-3 rounded-full border border-neutral-700 text-neutral-300 font-medium hover:bg-neutral-900 transition-colors hover:border-neutral-500 duration-200">
            Learn More
          </button>
        </div>
      </div>
    </main>
  );
}
