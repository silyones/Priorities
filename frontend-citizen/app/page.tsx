/* eslint-disable sort-keys */
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Mic, MessageSquare, Layers, BarChart3, Globe } from "lucide-react";

type Language = "english" | "kannada" | "hindi" | "tamil" | "telugu" | "bengali";

const COPY: Record<
  Language,
  {
    constituency: string;
    cta: string;
    headline: string;
    howItWorksBody: string;
    howItWorksTitle: string;
    step1Description: string;
    step1Label: string;
    step1Title: string;
    step2Description: string;
    step2Label: string;
    step2Title: string;
    step3Description: string;
    step3Label: string;
    step3Title: string;
    subtext: string;
    trustLine: string;
  }
> = {
  english: {
    headline: "Your voice, heard by your MP",
    constituency: "Bengaluru North Constituency",
    subtext:
      "Tell us what your ward needs: roads, water, schools, health, or anything else. One honest submission helps shape what gets priority.",
    cta: "Submit a Voice",
    howItWorksTitle: "How it works",
    howItWorksBody: "Three simple steps: no account, no tracking number, no paperwork.",
    step1Label: "Step 1",
    step1Title: "Speak or type your issue",
    step1Description:
      "Describe a local need in your own words. By voice or text, in any language you’re comfortable with.",
    step2Label: "Step 2",
    step2Title: "AI groups similar voices",
    step2Description:
      "Your submission is matched with others raising the same theme, so scattered concerns become one clear signal.",
    step3Label: "Step 3",
    step3Title: "Your MP sees real demand",
    step3Description:
      "Themes are ranked by how many people are affected, so your representative can act on what matters most.",
    trustLine: "Available in Kannada, Hindi, English, Tamil, Telugu, Bengali, and more.",
  },
  hindi: {
    headline: "आपकी आवाज़, आपके सांसद द्वारा सुनी गई",
    constituency: "बेंगलुरु उत्तर निर्वाचन क्षेत्र",
    subtext:
      "हमें बताएं कि आपके वार्ड को क्या चाहिए: सड़कें, पानी, स्कूल, स्वास्थ्य या कुछ और। एक ईमानदार प्रस्तुति यह तय करने में मदद करती है कि किस चीज को प्राथमिकता दी जाए।",
    cta: "एक आवाज सबमिट करें",
    howItWorksTitle: "यह कैसे काम करता है",
    howItWorksBody: "तीन सरल चरण: कोई खाता नहीं, कोई ट्रैकिंग नंबर नहीं, कोई कागजी कार्रवाई नहीं।",
    step1Label: "चरण 1",
    step1Title: "अपनी समस्या बोलें या टाइप करें",
    step1Description:
      "किसी स्थानीय आवश्यकता का अपने शब्दों में वर्णन करें। आवाज या पाठ द्वारा, किसी भी भाषा में जिससे आप सहज हों।",
    step2Label: "चरण 2",
    step2Title: "एआई समान आवाज़ों को समूहित करता है",
    step2Description:
      "आपकी प्रस्तुति उसी विषय को उठाने वाली अन्य प्रस्तुतियों से मेल खाती है, इसलिए बिखरी हुई चिंताएं एक स्पष्ट संकेत बन जाती हैं।",
    step3Label: "चरण 3",
    step3Title: "आपके सांसद को वास्तविक मांग नजर आ रही है",
    step3Description:
      "विषयों को इस आधार पर क्रमबद्ध किया जाता है कि कितने लोग प्रभावित हैं, ताकि आपका प्रतिनिधि सबसे महत्वपूर्ण विषय पर कार्य कर सके।",
    trustLine: "कन्नड़, हिंदी, अंग्रेजी, तमिल, तेलुगु, बंगाली, आदि भाषाओं में उपलब्ध है।",
  },
  kannada: {
    headline: "ನಿಮ್ಮ ಧ್ವನಿ, ನಿಮ್ಮ ಸಂಸದರಿಂದ ಕೇಳಲ್ಪಟ್ಟಿದೆ",
    constituency: "ಬಂಗಾಲುರು ಉತ್ತರ ಕ್ಷೇತ್ರ",
    subtext:
      "ನಿಮ್ಮ ವಾರ್ಡ್ ಗೆ: ರಸ್ತೆಗಳು, ನೀರು, ಶಾಲೆಗಳು, ಆರೋಗ್ಯ ಅಥವಾ ಇನ್ನಾವುದೇ ಏನು ಬೇಕು ಎಂದು ನಮಗೆ ತಿಳಿಸಿ. ಒಂದು ಪ್ರಾಮಾಣಿಕ ಸಲ್ಲಿಕೆ ಆದ್ಯತೆಯನ್ನು ಪಡೆಯುವದನ್ನು ರೂಪಿಸಲು ಸಹಾಯ ಮಾಡುತ್ತದೆ.",
    cta: "ಧ್ವನಿ ಸಲ್ಲಿಸಿ",
    howItWorksTitle: "ಅದು ಹೇಗೆ ಕಾರ್ಯನಿರ್ವಹಿಸುತ್ತದೆ",
    howItWorksBody: "ಮೂರು ಸರಳ ಹಂತಗಳು: ಖಾತೆ ಇಲ್ಲ, ಟ್ರ್ಯಾಕಿಂಗ್ ಸಂಖ್ಯೆ ಇಲ್ಲ, ಕಾಗದಪತ್ರಗಳಿಲ್ಲ.",
    step1Label: "ಹಂತ 1",
    step1Title: "ನಿಮ್ಮ ಸಮಸ್ಯೆಯನ್ನು ಮಾತನಾಡಿ ಅಥವಾ ಟೈಪ್ ಮಾಡಿ",
    step1Description:
      "ನಿಮ್ಮ ಮಾತಿನಲ್ಲಿ ಸ್ಥಳೀಯ ಅಗತ್ಯವನ್ನು ವಿವರಿಸಿ. ಧ್ವನಿ ಅಥವಾ ಪಠ್ಯದಿಂದ, ನೀವು ಆರಾಮದಾಯಕವಾದ ಯಾವುದೇ ಭಾಷೆಯಲ್ಲಿ.",
    step2Label: "ಹಂತ 2",
    step2Title: "ಎಐ ಇದೇ ರೀತಿಯ ಧ್ವನಿಗಳನ್ನು ಗುಂಪು ಮಾಡುತ್ತದೆ",
    step2Description:
      "ನಿಮ್ಮ ಸಲ್ಲಿಕೆ ಒಂದೇ ಥೀಮ್ ಅನ್ನು ಹೆಚ್ಚಿಸುವ ಇತರರೊಂದಿಗೆ ಹೊಂದಿಕೆಯಾಗುತ್ತದೆ, ಆದ್ದರಿಂದ ಚದುರಿದ ಕಾಳಜಿಗಳು ಒಂದು ಸ್ಪಷ್ಟ ಸಂಕೇತವಾಗುತ್ತವೆ.",
    step3Label: "ಹಂತ 3",
    step3Title: "ನಿಮ್ಮ ಸಂಸದರು ನಿಜವಾದ ಬೇಡಿಕೆಯನ್ನು ನೋಡುತ್ತಾರೆ",
    step3Description:
      "ಎಷ್ಟು ಜನರು ಪರಿಣಾಮ ಬೀರುತ್ತಾರೆ ಎಂಬುದರ ಪ್ರಕಾರ ಥೀಮ್ ಗಳನ್ನು ಶ್ರೇಣೀಕರಿಸಲಾಗುತ್ತದೆ, ಆದ್ದರಿಂದ ನಿಮ್ಮ ಪ್ರತಿನಿಧಿ ಹೆಚ್ಚು ಮುಖ್ಯವಾದ ವಿಷಯಗಳ ಬಗ್ಗೆ ಕಾರ್ಯನಿರ್ವಹಿಸಬಹುದು.",
    trustLine: "ಕನ್ನಡಾ, ಹಿಂದಿ, ಇಂಗ್ಲಿಷ್, ತಮಿಳು, ತೆಲುಗು, ಬಂಗಾಳಿ ಮತ್ತು ಹೆಚ್ಚಿನವುಗಳಲ್ಲಿ ಲಭ್ಯವಿದೆ.",
  },
  tamil: {
    headline: "Your voice, heard by your MP",
    constituency: "Bengaluru North Constituency",
    subtext:
      "Tell us what your ward needs: roads, water, schools, health, or anything else. One honest submission helps shape what gets priority.",
    cta: "Submit a Voice",
    howItWorksTitle: "How it works",
    howItWorksBody: "Three simple steps: no account, no tracking number, no paperwork.",
    step1Label: "Step 1",
    step1Title: "Speak or type your issue",
    step1Description:
      "Describe a local need in your own words. By voice or text, in any language you’re comfortable with.",
    step2Label: "Step 2",
    step2Title: "AI groups similar voices",
    step2Description:
      "Your submission is matched with others raising the same theme, so scattered concerns become one clear signal.",
    step3Label: "Step 3",
    step3Title: "Your MP sees real demand",
    step3Description:
      "Themes are ranked by how many people are affected, so your representative can act on what matters most.",
    trustLine: "Available in Kannada, Hindi, English, Tamil, Telugu, Bengali, and more.",
  },
  telugu: {
    headline: "Your voice, heard by your MP",
    constituency: "Bengaluru North Constituency",
    subtext:
      "Tell us what your ward needs: roads, water, schools, health, or anything else. One honest submission helps shape what gets priority.",
    cta: "Submit a Voice",
    howItWorksTitle: "How it works",
    howItWorksBody: "Three simple steps: no account, no tracking number, no paperwork.",
    step1Label: "Step 1",
    step1Title: "Speak or type your issue",
    step1Description:
      "Describe a local need in your own words. By voice or text, in any language you’re comfortable with.",
    step2Label: "Step 2",
    step2Title: "AI groups similar voices",
    step2Description:
      "Your submission is matched with others raising the same theme, so scattered concerns become one clear signal.",
    step3Label: "Step 3",
    step3Title: "Your MP sees real demand",
    step3Description:
      "Themes are ranked by how many people are affected, so your representative can act on what matters most.",
    trustLine: "Available in Kannada, Hindi, English, Tamil, Telugu, Bengali, and more.",
  },
  bengali: {
    headline: "Your voice, heard by your MP",
    constituency: "Bengaluru North Constituency",
    subtext:
      "Tell us what your ward needs: roads, water, schools, health, or anything else. One honest submission helps shape what gets priority.",
    cta: "Submit a Voice",
    howItWorksTitle: "How it works",
    howItWorksBody: "Three simple steps: no account, no tracking number, no paperwork.",
    step1Label: "Step 1",
    step1Title: "Speak or type your issue",
    step1Description:
      "Describe a local need in your own words. By voice or text, in any language you’re comfortable with.",
    step2Label: "Step 2",
    step2Title: "AI groups similar voices",
    step2Description:
      "Your submission is matched with others raising the same theme, so scattered concerns become one clear signal.",
    step3Label: "Step 3",
    step3Title: "Your MP sees real demand",
    step3Description:
      "Themes are ranked by how many people are affected, so your representative can act on what matters most.",
    trustLine: "Available in Kannada, Hindi, English, Tamil, Telugu, Bengali, and more.",
  },
};

const STEP_ICONS = [MessageSquare, Layers, BarChart3] as const;

export default function HomePage() {
  const [language, setLanguage] = useState<Language>("english");

  useEffect(() => {
    const syncLanguage = () => {
      const stored = localStorage.getItem("citizen-language") as Language | null;
      if (stored && COPY[stored]) setLanguage(stored);
    };
    syncLanguage();
    window.addEventListener("citizen-language-change", syncLanguage);
    return () => window.removeEventListener("citizen-language-change", syncLanguage);
  }, []);

  const copy = useMemo(() => COPY[language], [language]);
  const stepRows = [
    {
      description: copy.step1Description,
      label: copy.step1Label,
      title: copy.step1Title,
    },
    {
      description: copy.step2Description,
      label: copy.step2Label,
      title: copy.step2Title,
    },
    {
      description: copy.step3Description,
      label: copy.step3Label,
      title: copy.step3Title,
    },
  ] as const;

  return (
    <div className="min-h-screen bg-cream">
      {/* Hero */}
      <section className="container-pp flex flex-col items-center px-5 pb-20 pt-16 text-center sm:px-8 sm:pt-24 sm:pb-28">
        <p className="label mb-4">{copy.constituency}</p>
        <h1 className="display max-w-3xl text-4xl font-semibold leading-[1.1] tracking-tight text-ink sm:text-5xl lg:text-6xl">
          {copy.headline}
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-muted sm:text-xl">
          {copy.subtext}
        </p>
        <Link
          href="/submit"
          className="mt-10 inline-flex items-center gap-3 rounded-full bg-accent px-10 py-5 text-lg font-bold text-surface-white shadow-glow transition-all hover:-translate-y-0.5 hover:bg-accent-hover sm:mt-12 sm:px-12 sm:py-6 sm:text-xl"
        >
          <Mic className="h-6 w-6 sm:h-7 sm:w-7" />
          {copy.cta}
        </Link>
      </section>

      {/* How it works */}
      <section className="border-t border-border-subtle bg-surface-white py-16 sm:py-24">
        <div className="container-pp">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
              {copy.howItWorksTitle}
            </h2>
            <p className="mt-3 text-ink-muted">
              {copy.howItWorksBody}
            </p>
          </div>

          <ol className="mx-auto mt-12 grid max-w-5xl gap-6 sm:mt-16 sm:grid-cols-3 sm:gap-8">
            {stepRows.map((step, i) => {
              const Icon = STEP_ICONS[i];
              return (
                <li key={`${step.label}-${step.title}`} className="card flex flex-col p-6 sm:p-8">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-cream text-accent">
                      <Icon className="h-5 w-5" strokeWidth={2.25} />
                    </span>
                    <span className="font-mono text-xs font-medium uppercase tracking-widest text-ink-muted">
                      {step.label}
                    </span>
                  </div>
                  <h3 className="mt-5 text-lg font-semibold text-ink">{step.title}</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-muted">
                    {step.description}
                  </p>
                </li>
              );
            })}
          </ol>

          <p className="mx-auto mt-12 flex max-w-lg items-center justify-center gap-2 text-center text-sm text-ink-muted sm:mt-16">
            <Globe className="h-4 w-4 shrink-0 text-accent" />
            {copy.trustLine}
          </p>
        </div>
      </section>
    </div>
  );
}
