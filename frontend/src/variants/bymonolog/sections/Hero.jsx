"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { overview, heroVideo } from "@/lib/content";

export default function Hero() {
  const root = useRef(null);
  const videoRef = useRef(null);

  // 배경 영상: 화면 안에서만 재생(이탈 시 일시정지, 재진입 시 재개). 무음이라 자동재생 OK.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const io = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) v.play().catch(() => {}); else v.pause(); },
      { threshold: 0.2 }
    );
    io.observe(v);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (reduced) return;

    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context((self) => {
      const scope = self.selector;
      // Copy fades in on load
      gsap.from(scope(".hero-copy"), {
        y: 24,
        opacity: 0,
        duration: 1,
        stagger: 0.12,
        ease: "power3.out",
        delay: 0.15,
      });
      // Wordmark scrub-scale + parallax
      gsap.to(scope(".hero-word"), {
        scale: 1.04,
        yPercent: -8,
        ease: "none",
        scrollTrigger: {
          trigger: scope(".hero")[0],
          start: "top top",
          end: "bottom top",
          scrub: 0.6,
        },
      });
      // Bloom subtle parallax
      gsap.to(scope(".mono-bloom"), {
        yPercent: -14,
        ease: "none",
        scrollTrigger: {
          trigger: scope(".hero")[0],
          start: "top top",
          end: "bottom top",
          scrub: 0.6,
        },
      });
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <section
      id="top"
      ref={root}
      className="hero mono-hero relative flex flex-col justify-between pt-28 pb-0"
    >
      {/* Cinematic background video — muted/looping behind the headline. */}
      <video
        ref={videoRef}
        className="hero-video"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        aria-hidden
      >
        <source src={heroVideo} type="video/mp4" />
      </video>
      {/* Dark scrim over the video for legibility (grain sits above via .mono-grain). */}
      <div className="hero-scrim" aria-hidden />

      <div className="mono-bloom" aria-hidden />

      {/* Floating mid-stage copy */}
      <div className="relative z-10 mx-auto flex w-full max-w-[1400px] flex-1 flex-col items-center justify-center px-6 text-center">
        <span className="hero-copy mono-label mb-6 rounded-full border border-[var(--hairline)] px-4 py-1.5">
          {overview.badge}
        </span>
        <p className="hero-copy max-w-2xl text-balance text-base leading-relaxed text-[var(--muted)] sm:text-lg">
          {overview.role} · {overview.org}
        </p>
        <p className="hero-copy mt-4 max-w-xl text-balance font-grotesk text-sm leading-relaxed text-[var(--metal)]">
          교육부 선정 2025 AI 거점대학. 미래 산업을 선도하고 지역 혁신을
          완성하는 AX의 중추.
        </p>
      </div>

      {/* Colossal bleeding wordmark at bottom */}
      <div className="relative z-[1] w-full overflow-hidden pb-[clamp(1rem,4vw,4rem)]">
        <h1
          className="hero-word mx-auto text-center"
          style={{ fontSize: "clamp(4.5rem, 19vw, 18rem)" }}
        >
          같이 더 높게
        </h1>
        <p className="mono-label mt-3 text-center text-[var(--muted)]">
          {overview.orgEn} — {overview.slogan}
        </p>
      </div>
    </section>
  );
}
