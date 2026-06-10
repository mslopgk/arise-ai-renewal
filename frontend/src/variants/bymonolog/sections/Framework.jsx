"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { aura } from "@/lib/content";

// Map each axis letter to its readable name (for the block badges).
const AXIS_NAME = {
  A: "AI 철학 · 적응형 행정",
  U: "융합 연구",
  R: "증강 인재 양성",
};

export default function Framework() {
  const root = useRef(null);

  useEffect(() => {
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (reduced) return;

    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context((self) => {
      const scope = self.selector;

      gsap.from(scope(".fw-target"), {
        opacity: 0,
        y: 18,
        stagger: 0.08,
        duration: 0.55,
        ease: "power3.out",
        scrollTrigger: { trigger: scope(".fw-targets")[0], start: "top 86%" },
      });

      gsap.from(scope(".fw-block"), {
        opacity: 0,
        y: 36,
        stagger: 0.06,
        duration: 0.65,
        ease: "power3.out",
        scrollTrigger: { trigger: scope(".fw-grid")[0], start: "top 82%" },
      });
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <section id="framework" ref={root} className="mono-section">
      <div
        className="mono-bloom"
        style={{ top: "30%", opacity: 0.4 }}
        aria-hidden
      />

      <div className="mono-section__inner">
        {/* Header */}
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <span className="mono-label">전략 블록 / 8 STRATEGIC BLOCKS</span>
            <h2 className="mt-3 max-w-2xl font-heavy text-3xl uppercase leading-[0.95] tracking-tight text-[var(--text)] md:text-5xl">
              {aura.fullName}
            </h2>
          </div>
          <span className="mono-label">{aura.period}</span>
        </div>

        {/* Gold target strip — investment + 3 targets */}
        <div
          className="fw-targets mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-[var(--hairline)] lg:grid-cols-4"
          style={{ border: "1px solid rgba(201,162,39,0.4)" }}
        >
          <div className="fw-target flex flex-col justify-center bg-[var(--surface)] p-5">
            <span className="font-display text-xl font-extrabold tracking-tight text-[var(--gold)] md:text-2xl">
              {aura.investment}
            </span>
            <span className="mt-1.5 text-xs text-[var(--muted)]">투자 예산</span>
          </div>
          {aura.targets.map((t) => (
            <div
              key={t.label}
              className="fw-target flex flex-col justify-center bg-[var(--bg)] p-5"
            >
              <span className="font-display text-xl font-extrabold tracking-tight text-[var(--gold)] md:text-2xl">
                {t.value}
              </span>
              <span className="mt-1.5 text-xs text-[#b8b8b2]">
                {t.label}
              </span>
            </div>
          ))}
        </div>

        {/* 8 strategy blocks (each axis × 2) */}
        <div className="fw-grid mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {aura.blocks.map((b, i) => (
            <article
              key={`${b.axis}-${b.title}`}
              className="fw-block flex flex-col rounded-xl border border-[var(--hairline)] bg-[var(--surface)] p-4"
            >
              <div className="flex items-center justify-between">
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[rgba(201,162,39,0.16)] font-heavy text-base text-[var(--gold)]">
                  {b.axis}
                </span>
                <span className="font-mono text-[0.58rem] uppercase tracking-[0.12em] text-[var(--muted)]">
                  {AXIS_NAME[b.axis]} · 0{i + 1}
                </span>
              </div>
              <h3 className="mt-3 text-sm font-medium leading-snug text-[var(--text)]">
                {b.title}
              </h3>
              <ul className="mt-3 flex flex-col gap-1.5">
                {b.items.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[var(--gold)]" />
                    <span className="text-xs leading-relaxed text-[var(--metal)]">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
