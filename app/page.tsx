"use client";

import { SparklesCore } from "@/components/ui/sparkles";

export default function Home() {
  return (
    <main className="min-h-screen bg-black flex flex-col items-center justify-center overflow-hidden">
      {/* Hero Section */}
      <div className="h-screen w-full flex flex-col items-center justify-center relative">
        {/* Sparkles Background */}
        <div className="w-full absolute inset-0 h-screen">
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
          <h1 className="text-6xl md:text-8xl lg:text-9xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-neutral-50 to-neutral-400 mb-4">
            molt.tech
          </h1>
          
          {/* Subtitle */}
          <p className="text-neutral-400 text-lg md:text-xl lg:text-2xl max-w-2xl mx-auto mb-8">
            Transform. Evolve. Transcend.
          </p>

          {/* Glowing gradient line */}
          <div className="w-40 h-px mx-auto bg-gradient-to-r from-transparent via-indigo-500 to-transparent" />

          {/* CTA Buttons */}
          <div className="mt-12 flex flex-col sm:flex-row gap-4 justify-center">
            <button className="px-8 py-3 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-medium hover:opacity-90 transition-opacity">
              Get Started
            </button>
            <button className="px-8 py-3 rounded-full border border-neutral-700 text-neutral-300 font-medium hover:bg-neutral-900 transition-colors">
              Learn More
            </button>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <svg
            className="w-6 h-6 text-neutral-500"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
          </svg>
        </div>
      </div>

      {/* Features Section */}
      <section className="relative z-10 w-full max-w-6xl mx-auto px-4 py-24">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-white mb-16">
          Why <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-purple-500">molt.tech</span>?
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Feature 1 */}
          <div className="p-6 rounded-2xl bg-neutral-900/50 border border-neutral-800 backdrop-blur-sm">
            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Lightning Fast</h3>
            <p className="text-neutral-400">Optimized performance that keeps you ahead of the competition.</p>
          </div>

          {/* Feature 2 */}
          <div className="p-6 rounded-2xl bg-neutral-900/50 border border-neutral-800 backdrop-blur-sm">
            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Secure by Design</h3>
            <p className="text-neutral-400">Built with security at its core, protecting what matters most.</p>
          </div>

          {/* Feature 3 */}
          <div className="p-6 rounded-2xl bg-neutral-900/50 border border-neutral-800 backdrop-blur-sm">
            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-pink-500 to-orange-500 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Always Evolving</h3>
            <p className="text-neutral-400">Continuous updates and improvements to stay cutting-edge.</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 w-full border-t border-neutral-800 py-8">
        <div className="max-w-6xl mx-auto px-4 text-center text-neutral-500">
          <p>© 2026 molt.tech. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}
