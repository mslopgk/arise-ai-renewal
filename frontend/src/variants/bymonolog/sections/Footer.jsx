"use client";

import { useEffect, useRef } from "react";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  MapPin,
  Phone,
  EnvelopeSimple,
  Clock,
} from "@phosphor-icons/react";
import { contact, overview, brandAssets } from "@/lib/content";

const ROWS = [
  { Icon: MapPin, label: "주소", value: contact.address },
  { Icon: Phone, label: "전화", value: contact.phone },
  { Icon: EnvelopeSimple, label: "이메일", value: contact.email },
  { Icon: Clock, label: "운영시간", value: contact.hours },
];

export default function Footer() {
  const root = useRef(null);

  useEffect(() => {
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (reduced) return;

    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context((self) => {
      const scope = self.selector;
      // Cura footer feel — enormous wordmark drifts horizontally on scroll.
      gsap.fromTo(
        scope(".contact-ghost"),
        { xPercent: -6 },
        {
          xPercent: 6,
          ease: "none",
          scrollTrigger: {
            trigger: scope(".contact-ghost")[0],
            start: "top bottom",
            end: "bottom top",
            scrub: 1,
          },
        }
      );
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <footer
      id="contact"
      ref={root}
      className="relative flex flex-col justify-center overflow-hidden pt-28 pb-12 md:pt-32"
      style={{ background: "var(--surface)" }}
    >
      <div className="mono-smoke" aria-hidden />

      {/* Drifting giant wordmark behind content (harvested from cura footer). */}
      <span className="contact-ghost" aria-hidden>
        ARISE PNU
      </span>

      <div className="relative z-10 mx-auto w-full max-w-[1400px] px-6 sm:px-8">
        <span className="mono-label !text-[0.82rem]">CONTACT / 같이 더 높게</span>

        <div className="mt-8 grid gap-12 lg:grid-cols-[1.3fr_1fr]">
          <div>
            <h2 className="font-heavy text-5xl uppercase leading-[0.9] tracking-tight text-[var(--text)] sm:text-7xl md:text-8xl">
              <span className="tw-nowrap">같이</span>
              <br />
              <span className="tw-nowrap">더 높게</span>
            </h2>
            <p className="mt-6 max-w-md text-balance text-base leading-relaxed text-[var(--muted)] md:text-lg">
              {overview.org} · {overview.role}
            </p>
          </div>

          <div className="flex flex-col">
            {ROWS.map(({ Icon, label, value }) => (
              <div
                key={label}
                className="flex items-start gap-4 border-b border-[var(--hairline)] py-5"
              >
                <Icon
                  size={24}
                  className="mt-0.5 shrink-0 text-[var(--gold)]"
                  aria-hidden
                />
                <div className="flex flex-col gap-1.5">
                  <span className="mono-label !text-[0.78rem]">{label}</span>
                  <span className="text-base text-[var(--text)] md:text-lg">
                    {value}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-20 flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div className="flex flex-wrap items-center gap-4">
            {/* Real PNU signature — background removed, color inverted to white */}
            <span className="flex h-11 items-center py-1.5">
              <img src={brandAssets.signature}
                alt="부산대학교 시그니처"
                width={150}
                height={36}
                className="h-full w-auto object-contain"
                style={{ filter: "brightness(0) invert(1)" }}
              />
            </span>
            {/* Real PNU Korean wordmark — background removed, color inverted to white */}
            <span className="flex h-11 items-center py-1.5">
              <img src={brandAssets.wordmarkKr}
                alt="부산대학교 국문 워드마크"
                width={150}
                height={36}
                className="h-full w-auto object-contain"
                style={{ filter: "brightness(0) invert(1)" }}
              />
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="font-heavy text-2xl uppercase tracking-tight text-[var(--text)] tw-nowrap">
                ARISE PNU
              </span>
              <span className="font-heavy text-2xl uppercase tracking-tight text-[var(--gold)]">
                AI
              </span>
            </div>
          </div>
          <p className="font-mono text-sm tracking-wider text-[var(--muted)]">
            {overview.badge}
          </p>
        </div>
      </div>
    </footer>
  );
}
