"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    google?: {
      translate: {
        TranslateElement: new (
          options: { autoDisplay: boolean; includedLanguages: string; pageLanguage: string },
          elementId: string,
        ) => unknown;
      };
    };
    googleTranslateElementInit?: () => void;
  }
}

export const TRANSLATE_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "kn", label: "ಕನ್ನಡ" },
  { code: "hi", label: "हिंदी" },
  { code: "ta", label: "தமிழ்" },
  { code: "te", label: "తెలుగు" },
  { code: "bn", label: "বাংলা" },
] as const;

export type TranslateCode = (typeof TRANSLATE_LANGUAGES)[number]["code"];

const INCLUDED_LANGUAGES = TRANSLATE_LANGUAGES.filter((l) => l.code !== "en")
  .map((l) => l.code)
  .join(",");

function clearGoogTransCookie() {
  const expired = "expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/";
  document.cookie = `googtrans=;${expired}`;
  document.cookie = `googtrans=;${expired};domain=${window.location.hostname}`;
}

function setGoogTransCookie(code: TranslateCode) {
  const value = `/en/${code}`;
  document.cookie = `googtrans=${value};path=/`;
  document.cookie = `googtrans=${value};path=/;domain=${window.location.hostname}`;
}

export function getStoredLanguage(): TranslateCode {
  const match = document.cookie.match(/googtrans=\/en\/(\w+)/);
  return (match?.[1] as TranslateCode) ?? "en";
}

// Driving Google's hidden combo box live is unreliable — reverting to English
// doesn't stick, and switching languages quickly leaves the DOM half-translated.
// Setting the cookie and doing a full reload is what Google's own widget does
// internally, and is the only approach that behaves consistently every time.
export function changeTranslateLanguage(code: TranslateCode) {
  if (code === "en") {
    clearGoogTransCookie();
  } else {
    setGoogTransCookie(code);
  }
  window.location.reload();
}

export function GoogleTranslate() {
  useEffect(() => {
    if (document.getElementById("google-translate-script")) return;

    window.googleTranslateElementInit = () => {
      if (!window.google) return;
      new window.google.translate.TranslateElement(
        {
          autoDisplay: false,
          includedLanguages: INCLUDED_LANGUAGES,
          pageLanguage: "en",
        },
        "google_translate_element",
      );
    };

    const script = document.createElement("script");
    script.id = "google-translate-script";
    script.src = "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
    script.async = true;
    document.body.appendChild(script);
  }, []);

  return <div id="google_translate_element" className="hidden" />;
}
