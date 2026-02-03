"use client";

import { useMemo } from "react";
import {
  FaReact,
  FaAws,
  FaDocker,
  FaNodeJs,
  FaGithub,
  FaTwitter,
  FaLinkedin,
  FaInstagram,
  FaGoogle,
  FaApple,
} from "react-icons/fa";
import {
  SiNextdotjs,
  SiVercel,
  SiRedux,
  SiTypescript,
  SiFacebook,
} from "react-icons/si";

const iconConfigs = [
  { Icon: FaReact, color: "#61DAFB" },
  { Icon: FaAws, color: "#FF9900" },
  { Icon: FaDocker, color: "#2496ED" },
  { Icon: FaNodeJs, color: "#339933" },
  { Icon: SiNextdotjs, color: "#ffffff" },
  { Icon: SiVercel, color: "#ffffff" },
  { Icon: SiRedux, color: "#764ABC" },
  { Icon: SiTypescript, color: "#3178C6" },
  { Icon: FaGithub, color: "#ffffff" },
  { Icon: FaTwitter, color: "#1DA1F2" },
  { Icon: FaLinkedin, color: "#0077B5" },
  { Icon: FaInstagram, color: "#E1306C" },
  { Icon: FaGoogle, color: "#DB4437" },
  { Icon: FaApple, color: "#ffffff" },
  { Icon: SiFacebook, color: "#1877F2" },
];

export default function FeatureSection({
  onTryIt,
}: {
  onTryIt?: () => void;
}) {
  const orbitCount = 3;
  const orbitGap = 7;
  const iconsPerOrbit = Math.ceil(iconConfigs.length / orbitCount);

  const orbitIcons = useMemo(
    () =>
      [...Array(orbitCount)].map((_, orbitIdx) =>
        iconConfigs.slice(
          orbitIdx * iconsPerOrbit,
          orbitIdx * iconsPerOrbit + iconsPerOrbit
        )
      ),
    [iconsPerOrbit]
  );

  return (
    <section className="relative mx-auto my-24 flex h-[32rem] w-full max-w-6xl items-center justify-between overflow-hidden rounded-3xl border border-white/10 bg-[#0a0a0c] px-8">
      <div className="relative z-10 w-full max-w-xl">
        <h2 className="text-4xl font-semibold text-white sm:text-5xl">
          VPS for just $10/mo
        </h2>
        <p className="mt-4 text-base text-white/60 sm:text-lg">
          You receive a dedicated VPS with a preinstalled OpenClaw instance.
          4 vCPU, 8 GB RAM, 150 GB SSD. Secure, isolated, and ready to use.
        </p>
        <button
          type="button"
          onClick={onTryIt}
          className="mt-6 inline-flex items-center justify-center rounded-full border border-white/15 bg-white/10 px-6 py-3 text-sm font-medium text-white transition hover:bg-white/20"
        >
          Try it
        </button>
      </div>

      <div className="relative hidden h-full w-1/2 items-center justify-start overflow-hidden md:flex">
        <div className="relative h-[48rem] w-[48rem] translate-x-[40%]">
          <div className="absolute left-1/2 top-1/2 flex h-24 w-24 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/5 text-sm font-semibold text-white/70 shadow-lg">
            OpenClaw
          </div>

          {orbitIcons.map((icons, orbitIdx) => {
            const size = `${12 + orbitGap * (orbitIdx + 1)}rem`;
            const angleStep = (2 * Math.PI) / icons.length;
            return (
              <div
                key={orbitIdx}
                className="absolute left-1/2 top-1/2 rounded-full border border-dotted border-white/15"
                style={{
                  width: size,
                  height: size,
                  transform: "translate(-50%, -50%)",
                  animation: `spin ${16 + orbitIdx * 8}s linear infinite`,
                }}
              >
                {icons.map((cfg, iconIdx) => {
                  const angle = iconIdx * angleStep;
                  const x = 50 + 50 * Math.cos(angle);
                  const y = 50 + 50 * Math.sin(angle);
                  const left = `${x.toFixed(4)}%`;
                  const top = `${y.toFixed(4)}%`;
                  const Icon = cfg.Icon;
                  return (
                    <div
                      key={`${orbitIdx}-${iconIdx}`}
                      className="absolute flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-[#0a0a0c] shadow-md"
                      style={{
                        left,
                        top,
                        transform: "translate(-50%, -50%)",
                      }}
                    >
                      <Icon className="h-6 w-6" style={{ color: cfg.color }} />
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          from {
            transform: translate(-50%, -50%) rotate(0deg);
          }
          to {
            transform: translate(-50%, -50%) rotate(360deg);
          }
        }
      `}</style>
    </section>
  );
}
