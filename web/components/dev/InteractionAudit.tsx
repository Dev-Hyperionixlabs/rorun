"use client";

import { useEffect } from "react";

function isEnabled(): boolean {
  return process.env.NEXT_PUBLIC_INTERACTION_AUDIT === "true";
}

function briefText(el: Element): string {
  const aria = (el as HTMLElement).getAttribute("aria-label");
  if (aria) return aria;
  const text = (el as HTMLElement).textContent?.trim() || "";
  return text.replace(/\s+/g, " ").slice(0, 80);
}

function isInteractiveElement(el: HTMLElement): boolean {
  const tag = el.tagName.toLowerCase();
  if (tag === "button") return true;
  if (tag === "a") return true;
  if (tag === "input") return ["button", "submit", "reset"].includes((el as HTMLInputElement).type);
  const role = el.getAttribute("role");
  if (role === "button" || role === "link") return true;
  if (el.tabIndex >= 0) return true;
  return false;
}

export function InteractionAudit() {
  useEffect(() => {
    if (!isEnabled()) return;

    // Prevent double-registration in React strict mode / dev hot reload scenarios.
    const w = window as any;
    if (w.__RORUN_INTERACTION_AUDIT_INITIALIZED) return;
    w.__RORUN_INTERACTION_AUDIT_INITIALIZED = true;

    const onClickCapture = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      const clickable =
        (target.closest("button,a,[role='button'],[role='link'],input[type='button'],input[type='submit']") as
          | HTMLElement
          | null) ?? target;

      const tag = clickable.tagName.toLowerCase();
      const ui = clickable.getAttribute("data-ui") || undefined;
      const href = tag === "a" ? (clickable as HTMLAnchorElement).getAttribute("href") || undefined : undefined;
      const disabled =
        tag === "button"
          ? (clickable as HTMLButtonElement).disabled
          : tag === "input"
          ? (clickable as HTMLInputElement).disabled
          : undefined;

      // Log every click on buttons/links (and "button-like" roles)
      if (tag === "button" || tag === "a" || clickable.getAttribute("role") === "button") {
        // eslint-disable-next-line no-console
        console.log("[InteractionAudit] click", {
          ui,
          tag,
          href,
          disabled,
          id: clickable.id || undefined,
          text: briefText(clickable),
          className: (clickable as HTMLElement).className || undefined,
        });
      }

      // Warn on obvious dead links
      if (tag === "a" && (!href || href === "#" || href.trim() === "")) {
        // eslint-disable-next-line no-console
        console.warn("[InteractionAudit] dead link (missing/empty href)", clickable);
      }

      // Warn when something looks clickable (pointer cursor) but isn't interactive.
      try {
        const cursor = window.getComputedStyle(clickable).cursor;
        if (cursor === "pointer" && !isInteractiveElement(clickable)) {
          // eslint-disable-next-line no-console
          console.warn("[InteractionAudit] pointer cursor on non-interactive element", clickable);
        }
      } catch {
        // ignore
      }
    };

    const onPointerDownCapture = (e: PointerEvent) => {
      // DEV helper: if the user clicks within the profile button's bounds but the event target isn't inside it,
      // log what element is intercepting the click.
      const profile = document.querySelector<HTMLElement>("[data-profile-button='true']");
      if (!profile) return;
      const rect = profile.getBoundingClientRect();
      const inRect = e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
      if (!inRect) return;

      const target = e.target as HTMLElement | null;
      if (target && profile.contains(target)) return;

      const top = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
      // eslint-disable-next-line no-console
      console.warn("[InteractionAudit] profile click intercepted", {
        target,
        elementFromPoint: top,
      });
    };

    document.addEventListener("click", onClickCapture, true);
    document.addEventListener("pointerdown", onPointerDownCapture, true);

    // eslint-disable-next-line no-console
    console.log("[InteractionAudit] enabled");

    return () => {
      document.removeEventListener("click", onClickCapture, true);
      document.removeEventListener("pointerdown", onPointerDownCapture, true);
      try {
        delete (window as any).__RORUN_INTERACTION_AUDIT_INITIALIZED;
      } catch {
        // ignore
      }
    };
  }, []);

  return null;
}


