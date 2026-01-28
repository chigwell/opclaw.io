"use client";

import { useEffect, useState, useCallback } from "react";
import { SparklesCore } from "@/components/ui/sparkles";

interface TypewriterProps {
  texts: string[];
  typingSpeed?: number;      // ms per character (default: 70ms for natural feel)
  delayBetweenTexts?: number; // ms to wait before next text (for future rotation)
  loop?: boolean;            // whether to loop through texts
  onComplete?: () => void;   // callback when all texts typed (if not looping)
}

const Typewriter = ({
  texts,
  typingSpeed = 70,
  delayBetweenTexts = 2000,
  loop = false,
  onComplete,
}: TypewriterProps) => {
  const [displayedText, setDisplayedText] = useState("");
  const [textIndex, setTextIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(true);
  const [isComplete, setIsComplete] = useState(false);
  const [showCursor, setShowCursor] = useState(true);

  const currentText = texts[textIndex] || "";

  // Natural typing variation: slight randomness in speed
  const getTypingDelay = useCallback(() => {
    // Add ±30% variation for natural feel
    const variation = typingSpeed * 0.3;
    return typingSpeed + (Math.random() * variation * 2 - variation);
  }, [typingSpeed]);

  // Type characters one by one
  useEffect(() => {
    if (!isTyping || isComplete) return;

    if (charIndex < currentText.length) {
      const timeout = setTimeout(() => {
        setDisplayedText((prev) => prev + currentText[charIndex]);
        setCharIndex((prev) => prev + 1);
      }, getTypingDelay());
      return () => clearTimeout(timeout);
    } else {
      // Finished typing current text
      if (textIndex < texts.length - 1 && loop) {
        // More texts to show, wait then move to next
        const timeout = setTimeout(() => {
          setDisplayedText("");
          setCharIndex(0);
          setTextIndex((prev) => prev + 1);
        }, delayBetweenTexts);
        return () => clearTimeout(timeout);
      } else if (loop && texts.length > 1) {
        // Loop back to first text
        const timeout = setTimeout(() => {
          setDisplayedText("");
          setCharIndex(0);
          setTextIndex(0);
        }, delayBetweenTexts);
        return () => clearTimeout(timeout);
      } else {
        // All done, stop
        setIsTyping(false);
        setIsComplete(true);
        onComplete?.();
      }
    }
  }, [charIndex, currentText, textIndex, texts.length, isTyping, isComplete, loop, delayBetweenTexts, getTypingDelay, onComplete]);

  // Cursor blink
  useEffect(() => {
    const cursorInterval = setInterval(() => {
      setShowCursor((prev) => !prev);
    }, 530);
    return () => clearInterval(cursorInterval);
  }, []);

  return (
    <span className="inline-block">
      {displayedText}
      <span 
        className={`inline-block w-[2px] h-[1.1em] bg-neutral-400 ml-1 align-middle transition-opacity duration-100 ${
          showCursor ? "opacity-100" : "opacity-0"
        }`}
        aria-hidden="true"
      />
    </span>
  );
};

export default function Home() {
  const [startTyping, setStartTyping] = useState(false);

  useEffect(() => {
    // Small delay before starting animation
    const timer = setTimeout(() => setStartTyping(true), 600);
    return () => clearTimeout(timer);
  }, []);

  // Array of texts - ready for future rotation
  const taglines = [
    "Deploy your own molt.bot instance in minutes.",
  ];

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
        <div className="text-neutral-400 text-lg md:text-xl lg:text-2xl max-w-3xl mx-auto min-h-[2em]">
          {startTyping && (
            <Typewriter
              texts={taglines}
              typingSpeed={65}  // ~65ms per char = natural typing pace
              loop={false}      // Stop after typing once
            />
          )}
        </div>

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
