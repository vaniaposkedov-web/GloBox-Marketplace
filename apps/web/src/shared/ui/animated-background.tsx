"use client";

/**
 * Анимированный тёплый фон: мягкие блобы, парящие иконки/лапки.
 * Используется для главной, входа, регистрации.
 */
export function AnimatedWarmBackground({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      aria-hidden
    >
      {/* Soft blobs */}
      <div className="absolute -top-32 -left-24 w-[28rem] h-[28rem] rounded-full bg-amber-300/20 blur-3xl blob-float-a" />
      <div className="absolute top-20 -right-32 w-[32rem] h-[32rem] rounded-full bg-rose-300/15 blur-3xl blob-float-b" />
      <div className="absolute bottom-0 left-1/3 w-[26rem] h-[26rem] rounded-full bg-orange-300/15 blur-3xl blob-float-c" />

      {/* Vector decorations: paw prints, sparkles, hearts */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 1200 800"
        preserveAspectRatio="none"
      >
        <defs>
          <g id="paw">
            <ellipse cx="0" cy="0" rx="6" ry="8" fill="currentColor" />
            <ellipse cx="-10" cy="-10" rx="3.5" ry="5" fill="currentColor" />
            <ellipse cx="10" cy="-10" rx="3.5" ry="5" fill="currentColor" />
            <ellipse cx="-14" cy="2" rx="3" ry="4.5" fill="currentColor" />
            <ellipse cx="14" cy="2" rx="3" ry="4.5" fill="currentColor" />
          </g>
          <g id="sparkle">
            <path
              d="M0,-10 L2,-2 L10,0 L2,2 L0,10 L-2,2 L-10,0 L-2,-2 Z"
              fill="currentColor"
            />
          </g>
          <g id="heart">
            <path
              d="M0,4 C-6,-2 -12,-8 -6,-12 C-2,-14 0,-10 0,-8 C0,-10 2,-14 6,-12 C12,-8 6,-2 0,4 Z"
              fill="currentColor"
            />
          </g>
        </defs>

        <g className="text-amber-400/20 float-slow">
          <use href="#paw" transform="translate(120 160) rotate(-20)" />
          <use href="#paw" transform="translate(220 240) rotate(10) scale(0.8)" />
        </g>
        <g className="text-rose-400/18 float-slower">
          <use href="#paw" transform="translate(1020 180) rotate(25) scale(1.1)" />
          <use href="#paw" transform="translate(900 300) rotate(-15) scale(0.75)" />
        </g>
        <g className="text-amber-500/20 spin-slow" style={{ transformOrigin: "200px 100px" }}>
          <use href="#sparkle" transform="translate(200 100) scale(1.2)" />
        </g>
        <g className="text-orange-400/22 spin-slow-reverse" style={{ transformOrigin: "950px 120px" }}>
          <use href="#sparkle" transform="translate(950 120) scale(1.5)" />
        </g>
        <g className="text-amber-400/20 spin-slow" style={{ transformOrigin: "700px 600px" }}>
          <use href="#sparkle" transform="translate(700 600)" />
        </g>
        <g className="text-rose-400/20 float-slow">
          <use href="#heart" transform="translate(150 560) scale(1.3)" />
          <use href="#heart" transform="translate(1050 620) scale(1.1)" />
        </g>
        <g className="text-amber-500/18 float-slower">
          <use href="#sparkle" transform="translate(450 80) scale(0.8)" />
          <use href="#sparkle" transform="translate(780 200) scale(0.6)" />
          <use href="#sparkle" transform="translate(320 700) scale(0.9)" />
        </g>
      </svg>
    </div>
  );
}
