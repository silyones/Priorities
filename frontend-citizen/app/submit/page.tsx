"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Camera,
  Check,
  Loader2,
  MapPin,
  ShieldCheck,
  User,
  Users,
  X,
} from "lucide-react";
import { VoiceButton } from "@/components/VoiceButton";
import { Reveal } from "@/components/motion";
import { compressImageFile } from "@/lib/compressImage";
import { saveSubmission } from "@/lib/submissions";

type UILanguage = "english" | "kannada" | "hindi" | "tamil" | "telugu" | "bengali";

const COPY: Record<
  UILanguage,
  {
    ackBody: string;
    ackNote: string;
    ackTitle: string;
    addPhoto: string;
    describeLabelRelay: string;
    describeLabelSelf: string;
    locationAdded: string;
    manualAreaLabel: string;
    manualAreaPlaceholder: string;
    pageTitle: string;
    privacyLine: string;
    voiceListening: string;
    voiceMicDenied: string;
    voiceNotSupported: string;
    voiceSpeak: string;
    voiceTranscribing: string;
    relayLocalityLabel: string;
    relayLocalityPlaceholder: string;
    relayNote: string;
    relayRoleLabel: string;
    relayRolePlaceholder: string;
    relayWhoLabel: string;
    relayWhoPlaceholder: string;
    remove: string;
    submitAnother: string;
    submitButton: string;
    submitButtonSending: string;
    tabForMyself: string;
    tabForSomeoneElse: string;
    textareaPlaceholderRelay: string;
    textareaPlaceholderSelf: string;
    topicHint: string;
    topicLabel: string;
    topicPlaceholder: string;
    useCurrentLocation: string;
  }
> = {
  english: {
    pageTitle: "Submit a Voice",
    tabForMyself: "For myself",
    tabForSomeoneElse: "For someone else",
    relayWhoLabel: "Who are you submitting for?",
    relayWhoPlaceholder: "Their name (optional)",
    relayRoleLabel: "Your role",
    relayRolePlaceholder: "e.g. Neighbor, family member, ASHA worker, volunteer",
    relayLocalityLabel: "Citizen's village / locality",
    relayLocalityPlaceholder: "Your village name",
    relayNote:
      "Relay submissions are flagged for transparency, then processed identically — no second-class data path.",
    topicLabel: "What's this about?",
    topicPlaceholder: "e.g. Broken streetlight, no water supply, road full of potholes",
    topicHint: "Keep this short (max 80 characters).",
    describeLabelSelf: "Describe your issue",
    describeLabelRelay: "What did they describe?",
    textareaPlaceholderSelf: "Describe your issue",
    textareaPlaceholderRelay: "Type what they told you, in their own words",
    addPhoto: "Add photo",
    useCurrentLocation: "Use my current location",
    remove: "Remove",
    locationAdded: "Location added",
    manualAreaLabel: "Or type your area",
    manualAreaPlaceholder: "e.g. Ward 7 main road, Rajgarh",
    submitButtonSending: "Sending your voice…",
    submitButton: "Submit my voice",
    privacyLine: "No tracking number, no status, no timeline. Just an honest acknowledgment.",
    voiceSpeak: "Speak",
    voiceListening: "Listening… tap to stop",
    voiceTranscribing: "Transcribing…",
    voiceNotSupported: "Voice not supported here — type instead",
    voiceMicDenied: "Microphone access denied. Type your issue instead.",
    ackTitle: "Your voice has been heard.",
    ackBody: "It's been recorded and is now part of a real pattern of demand in your constituency.",
    ackNote:
      "No tracking number, no status updates — just an honest acknowledgment. That's the only promise we make.",
    submitAnother: "Submit another voice",
  },
  hindi: {
    pageTitle: "एक आवाज सबमिट करें",
    tabForMyself: "अपने लिए",
    tabForSomeoneElse: "किसी और के लिए",
    relayWhoLabel: "आप किसके लिए सबमिट कर रहे हैं?",
    relayWhoPlaceholder: "उनका नाम (वैकल्पिक)",
    relayRoleLabel: "आपकी भूमिका",
    relayRolePlaceholder: "जैसे पड़ोसी, परिवार का सदस्य, आशा कार्यकर्ता, स्वयंसेवक",
    relayLocalityLabel: "नागरिक का गांव / इलाका",
    relayLocalityPlaceholder: "आपके गांव का नाम",
    relayNote:
      "रिले सबमिशन को पारदर्शिता के लिए चिह्नित किया जाता है, फिर समान रूप से संसाधित किया जाता है — कोई द्वितीय-श्रेणी डेटा पथ नहीं।",
    topicLabel: "यह किस बारे में है?",
    topicPlaceholder: "जैसे टूटी स्ट्रीटलाइट, पानी की आपूर्ति नहीं, गड्ढों से भरी सड़क",
    topicHint: "इसे संक्षिप्त रखें (अधिकतम 80 अक्षर)।",
    describeLabelSelf: "अपनी समस्या का वर्णन करें",
    describeLabelRelay: "उन्होंने क्या बताया?",
    textareaPlaceholderSelf: "अपनी समस्या का वर्णन करें",
    textareaPlaceholderRelay: "उन्होंने आपको जो बताया, उसे उनके अपने शब्दों में टाइप करें",
    addPhoto: "फोटो जोड़ें",
    useCurrentLocation: "मेरा वर्तमान स्थान उपयोग करें",
    remove: "हटाएं",
    locationAdded: "स्थान जोड़ा गया",
    manualAreaLabel: "या अपना क्षेत्र टाइप करें",
    manualAreaPlaceholder: "जैसे वार्ड 7 मुख्य सड़क, राजगढ़",
    submitButtonSending: "आपकी आवाज भेजी जा रही है…",
    submitButton: "मेरी आवाज सबमिट करें",
    privacyLine: "कोई ट्रैकिंग नंबर नहीं, कोई स्थिति नहीं, कोई समयसीमा नहीं। बस एक ईमानदार स्वीकृति।",
    voiceSpeak: "बोलें",
    voiceListening: "सुन रहे हैं… रोकने के लिए टैप करें",
    voiceTranscribing: "लिखा जा रहा है…",
    voiceNotSupported: "यहां वॉइस समर्थित नहीं है — इसके बजाय टाइप करें",
    voiceMicDenied: "माइक्रोफोन की अनुमति नहीं मिली। इसके बजाय अपनी समस्या टाइप करें।",
    ackTitle: "आपकी आवाज सुन ली गई है।",
    ackBody:
      "इसे दर्ज किया गया है और अब यह आपके निर्वाचन क्षेत्र में मांग के एक वास्तविक पैटर्न का हिस्सा है।",
    ackNote:
      "कोई ट्रैकिंग नंबर नहीं, कोई स्थिति अपडेट नहीं — बस एक ईमानदार स्वीकृति। यही एकमात्र वादा है जो हम करते हैं।",
    submitAnother: "एक और आवाज सबमिट करें",
  },
  kannada: {
    pageTitle: "ಧ್ವನಿ ಸಲ್ಲಿಸಿ",
    tabForMyself: "ನನಗಾಗಿ",
    tabForSomeoneElse: "ಬೇರೊಬ್ಬರಿಗಾಗಿ",
    relayWhoLabel: "ನೀವು ಯಾರಿಗಾಗಿ ಸಲ್ಲಿಸುತ್ತಿದ್ದೀರಿ?",
    relayWhoPlaceholder: "ಅವರ ಹೆಸರು (ಐಚ್ಛಿಕ)",
    relayRoleLabel: "ನಿಮ್ಮ ಪಾತ್ರ",
    relayRolePlaceholder: "ಉದಾ. ನೆರೆಹೊರೆಯವರು, ಕುಟುಂಬ ಸದಸ್ಯರು, ಆಶಾ ಕಾರ್ಯಕರ್ತೆ, ಸ್ವಯಂಸೇವಕ",
    relayLocalityLabel: "ನಾಗರಿಕರ ಗ್ರಾಮ / ಪ್ರದೇಶ",
    relayLocalityPlaceholder: "ನಿಮ್ಮ ಗ್ರಾಮದ ಹೆಸರು",
    relayNote:
      "ರಿಲೇ ಸಲ್ಲಿಕೆಗಳನ್ನು ಪಾರದರ್ಶಕತೆಗಾಗಿ ಗುರುತಿಸಲಾಗುತ್ತದೆ, ನಂತರ ಒಂದೇ ರೀತಿಯಲ್ಲಿ ಪ್ರಕ್ರಿಯೆಗೊಳಿಸಲಾಗುತ್ತದೆ — ಯಾವುದೇ ದ್ವಿತೀಯ ದರ್ಜೆಯ ಡೇಟಾ ಪಥವಿಲ್ಲ.",
    topicLabel: "ಇದು ಯಾವುದರ ಬಗ್ಗೆ?",
    topicPlaceholder: "ಉದಾ. ಮುರಿದ ಬೀದಿದೀಪ, ನೀರು ಸರಬರಾಜು ಇಲ್ಲ, ಗುಂಡಿಗಳಿಂದ ತುಂಬಿದ ರಸ್ತೆ",
    topicHint: "ಇದನ್ನು ಸಂಕ್ಷಿಪ್ತವಾಗಿ ಇರಿಸಿ (ಗರಿಷ್ಠ 80 ಅಕ್ಷರಗಳು).",
    describeLabelSelf: "ನಿಮ್ಮ ಸಮಸ್ಯೆಯನ್ನು ವಿವರಿಸಿ",
    describeLabelRelay: "ಅವರು ಏನು ವಿವರಿಸಿದರು?",
    textareaPlaceholderSelf: "ನಿಮ್ಮ ಸಮಸ್ಯೆಯನ್ನು ವಿವರಿಸಿ",
    textareaPlaceholderRelay: "ಅವರು ನಿಮಗೆ ಹೇಳಿದ್ದನ್ನು ಅವರ ಸ್ವಂತ ಮಾತುಗಳಲ್ಲಿ ಟೈಪ್ ಮಾಡಿ",
    addPhoto: "ಫೋಟೋ ಸೇರಿಸಿ",
    useCurrentLocation: "ನನ್ನ ಪ್ರಸ್ತುತ ಸ್ಥಳವನ್ನು ಬಳಸಿ",
    remove: "ತೆಗೆದುಹಾಕಿ",
    locationAdded: "ಸ್ಥಳ ಸೇರಿಸಲಾಗಿದೆ",
    manualAreaLabel: "ಅಥವಾ ನಿಮ್ಮ ಪ್ರದೇಶವನ್ನು ಟೈಪ್ ಮಾಡಿ",
    manualAreaPlaceholder: "ಉದಾ. ವಾರ್ಡ್ 7 ಮುಖ್ಯ ರಸ್ತೆ, ರಾಜಗಢ",
    submitButtonSending: "ನಿಮ್ಮ ಧ್ವನಿಯನ್ನು ಕಳುಹಿಸಲಾಗುತ್ತಿದೆ…",
    submitButton: "ನನ್ನ ಧ್ವನಿಯನ್ನು ಸಲ್ಲಿಸಿ",
    privacyLine: "ಟ್ರ್ಯಾಕಿಂಗ್ ಸಂಖ್ಯೆ ಇಲ್ಲ, ಸ್ಥಿತಿ ಇಲ್ಲ, ಸಮಯಸೂಚಿ ಇಲ್ಲ. ಕೇವಲ ಪ್ರಾಮಾಣಿಕ ಸ್ವೀಕೃತಿ.",
    voiceSpeak: "ಮಾತನಾಡಿ",
    voiceListening: "ಆಲಿಸಲಾಗುತ್ತಿದೆ… ನಿಲ್ಲಿಸಲು ಟ್ಯಾಪ್ ಮಾಡಿ",
    voiceTranscribing: "ಬರೆಯಲಾಗುತ್ತಿದೆ…",
    voiceNotSupported: "ಇಲ್ಲಿ ಧ್ವನಿ ಬೆಂಬಲಿತವಾಗಿಲ್ಲ — ಬದಲಿಗೆ ಟೈಪ್ ಮಾಡಿ",
    voiceMicDenied: "ಮೈಕ್ರೊಫೋನ್ ಪ್ರವೇಶ ನಿರಾಕರಿಸಲಾಗಿದೆ. ಬದಲಿಗೆ ನಿಮ್ಮ ಸಮಸ್ಯೆಯನ್ನು ಟೈಪ್ ಮಾಡಿ.",
    ackTitle: "ನಿಮ್ಮ ಧ್ವನಿಯನ್ನು ಕೇಳಲಾಗಿದೆ.",
    ackBody:
      "ಇದನ್ನು ದಾಖಲಿಸಲಾಗಿದೆ ಮತ್ತು ಈಗ ಅದು ನಿಮ್ಮ ಕ್ಷೇತ್ರದಲ್ಲಿ ಬೇಡಿಕೆಯ ನೈಜ ಮಾದರಿಯ ಭಾಗವಾಗಿದೆ.",
    ackNote:
      "ಟ್ರ್ಯಾಕಿಂಗ್ ಸಂಖ್ಯೆ ಇಲ್ಲ, ಸ್ಥಿತಿ ನವೀಕರಣಗಳಿಲ್ಲ — ಕೇವಲ ಪ್ರಾಮಾಣಿಕ ಸ್ವೀಕೃತಿ. ಇದೇ ನಾವು ಮಾಡುವ ಏಕೈಕ ಭರವಸೆ.",
    submitAnother: "ಇನ್ನೊಂದು ಧ್ವನಿಯನ್ನು ಸಲ್ಲಿಸಿ",
  },
  tamil: {
    pageTitle: "குரலைச் சமர்ப்பிக்கவும்",
    tabForMyself: "எனக்காக",
    tabForSomeoneElse: "வேறொருவருக்காக",
    relayWhoLabel: "நீங்கள் யாருக்காக சமர்ப்பிக்கிறீர்கள்?",
    relayWhoPlaceholder: "அவர்களின் பெயர் (விருப்பத்திற்குரியது)",
    relayRoleLabel: "உங்கள் பங்கு",
    relayRolePlaceholder: "எ.கா. அண்டை வீட்டார், குடும்ப உறுப்பினர், ஆஷா பணியாளர், தொண்டர்",
    relayLocalityLabel: "குடிமகனின் கிராமம் / பகுதி",
    relayLocalityPlaceholder: "உங்கள் கிராமத்தின் பெயர்",
    relayNote:
      "ரிலே சமர்ப்பிப்புகள் வெளிப்படைத்தன்மைக்காக குறிக்கப்பட்டு, பின்னர் ஒரே மாதிரியாக செயலாக்கப்படுகின்றன — இரண்டாம் தர தரவு பாதை இல்லை.",
    topicLabel: "இது எதைப் பற்றியது?",
    topicPlaceholder: "எ.கா. உடைந்த தெருவிளக்கு, தண்ணீர் இல்லை, குழிகள் நிறைந்த சாலை",
    topicHint: "இதை சுருக்கமாக வையுங்கள் (அதிகபட்சம் 80 எழுத்துகள்).",
    describeLabelSelf: "உங்கள் பிரச்சினையை விவரிக்கவும்",
    describeLabelRelay: "அவர்கள் என்ன விவரித்தார்கள்?",
    textareaPlaceholderSelf: "உங்கள் பிரச்சினையை விவரிக்கவும்",
    textareaPlaceholderRelay: "அவர்கள் உங்களிடம் சொன்னதை, அவர்களின் சொந்த வார்த்தைகளில் தட்டச்சு செய்யுங்கள்",
    addPhoto: "புகைப்படம் சேர்க்கவும்",
    useCurrentLocation: "எனது தற்போதைய இருப்பிடத்தைப் பயன்படுத்தவும்",
    remove: "அகற்று",
    locationAdded: "இருப்பிடம் சேர்க்கப்பட்டது",
    manualAreaLabel: "அல்லது உங்கள் பகுதியை தட்டச்சு செய்யுங்கள்",
    manualAreaPlaceholder: "எ.கா. வார்டு 7 முதன்மை சாலை, ராஜ்கர்",
    submitButtonSending: "உங்கள் குரல் அனுப்பப்படுகிறது…",
    submitButton: "எனது குரலைச் சமர்ப்பிக்கவும்",
    privacyLine: "கண்காணிப்பு எண் இல்லை, நிலை இல்லை, காலவரிசை இல்லை. நேர்மையான ஒப்புகை மட்டுமே.",
    voiceSpeak: "பேசுங்கள்",
    voiceListening: "கேட்கிறது… நிறுத்த தட்டவும்",
    voiceTranscribing: "எழுதப்படுகிறது…",
    voiceNotSupported: "இங்கே குரல் ஆதரிக்கப்படவில்லை — பதிலாக தட்டச்சு செய்யுங்கள்",
    voiceMicDenied: "மைக்ரோஃபோன் அணுகல் மறுக்கப்பட்டது. பதிலாக உங்கள் பிரச்சினையை தட்டச்சு செய்யுங்கள்.",
    ackTitle: "உங்கள் குரல் கேட்கப்பட்டுள்ளது.",
    ackBody:
      "இது பதிவு செய்யப்பட்டுள்ளது, இப்போது உங்கள் தொகுதியில் தேவையின் உண்மையான வடிவத்தின் ஒரு பகுதியாக உள்ளது.",
    ackNote:
      "கண்காணிப்பு எண் இல்லை, நிலை புதுப்பிப்புகள் இல்லை — நேர்மையான ஒப்புகை மட்டுமே. அதுவே நாங்கள் தரும் ஒரே உறுதிமொழி.",
    submitAnother: "மற்றொரு குரலைச் சமர்ப்பிக்கவும்",
  },
  telugu: {
    pageTitle: "గొంతును సమర్పించండి",
    tabForMyself: "నా కోసం",
    tabForSomeoneElse: "మరొకరి కోసం",
    relayWhoLabel: "మీరు ఎవరి కోసం సమర్పిస్తున్నారు?",
    relayWhoPlaceholder: "వారి పేరు (ఐచ్ఛికం)",
    relayRoleLabel: "మీ పాత్ర",
    relayRolePlaceholder: "ఉదా. పొరుగువారు, కుటుంబ సభ్యుడు, ఆశా కార్యకర్త, స్వచ్ఛంద సేవకుడు",
    relayLocalityLabel: "పౌరుడి గ్రామం / ప్రాంతం",
    relayLocalityPlaceholder: "మీ గ్రామం పేరు",
    relayNote:
      "రిలే సమర్పణలు పారదర్శకత కోసం ఫ్లాగ్ చేయబడతాయి, తర్వాత ఒకే విధంగా ప్రాసెస్ చేయబడతాయి — ద్వితీయ శ్రేణి డేటా మార్గం లేదు.",
    topicLabel: "ఇది దేని గురించి?",
    topicPlaceholder: "ఉదా. విరిగిన వీధి దీపం, నీటి సరఫరా లేదు, గుంతలతో నిండిన రోడ్డు",
    topicHint: "దీన్ని క్లుప్తంగా ఉంచండి (గరిష్టంగా 80 అక్షరాలు).",
    describeLabelSelf: "మీ సమస్యను వివరించండి",
    describeLabelRelay: "వారు ఏమి వివరించారు?",
    textareaPlaceholderSelf: "మీ సమస్యను వివరించండి",
    textareaPlaceholderRelay: "వారు మీకు చెప్పింది వారి సొంత మాటల్లో టైప్ చేయండి",
    addPhoto: "ఫోటో జోడించండి",
    useCurrentLocation: "నా ప్రస్తుత స్థానాన్ని ఉపయోగించండి",
    remove: "తీసివేయండి",
    locationAdded: "స్థానం జోడించబడింది",
    manualAreaLabel: "లేదా మీ ప్రాంతాన్ని టైప్ చేయండి",
    manualAreaPlaceholder: "ఉదా. వార్డు 7 ప్రధాన రహదారి, రాజ్‌గఢ్",
    submitButtonSending: "మీ గొంతు పంపబడుతోంది…",
    submitButton: "నా గొంతును సమర్పించండి",
    privacyLine: "ట్రాకింగ్ నంబర్ లేదు, స్థితి లేదు, కాలక్రమం లేదు. కేవలం నిజాయితీగల అంగీకారం.",
    voiceSpeak: "మాట్లాడండి",
    voiceListening: "వింటున్నాం… ఆపడానికి నొక్కండి",
    voiceTranscribing: "వ్రాయబడుతోంది…",
    voiceNotSupported: "ఇక్కడ వాయిస్ మద్దతు లేదు — బదులుగా టైప్ చేయండి",
    voiceMicDenied: "మైక్రోఫోన్ యాక్సెస్ నిరాకరించబడింది. బదులుగా మీ సమస్యను టైప్ చేయండి.",
    ackTitle: "మీ గొంతు వినబడింది.",
    ackBody:
      "ఇది నమోదు చేయబడింది మరియు ఇప్పుడు మీ నియోజకవర్గంలో డిమాండ్ యొక్క నిజమైన నమూనాలో భాగం.",
    ackNote:
      "ట్రాకింగ్ నంబర్ లేదు, స్థితి నవీకరణలు లేవు — కేవలం నిజాయితీగల అంగీకారం. మేము చేసే ఏకైక వాగ్దానం అదే.",
    submitAnother: "మరొక గొంతును సమర్పించండి",
  },
  bengali: {
    pageTitle: "কণ্ঠস্বর জমা দিন",
    tabForMyself: "নিজের জন্য",
    tabForSomeoneElse: "অন্য কারো জন্য",
    relayWhoLabel: "আপনি কার জন্য জমা দিচ্ছেন?",
    relayWhoPlaceholder: "তাদের নাম (ঐচ্ছিক)",
    relayRoleLabel: "আপনার ভূমিকা",
    relayRolePlaceholder: "যেমন প্রতিবেশী, পরিবারের সদস্য, আশা কর্মী, স্বেচ্ছাসেবক",
    relayLocalityLabel: "নাগরিকের গ্রাম / এলাকা",
    relayLocalityPlaceholder: "আপনার গ্রামের নাম",
    relayNote:
      "রিলে জমাগুলি স্বচ্ছতার জন্য চিহ্নিত করা হয়, তারপর একইভাবে প্রক্রিয়া করা হয় — কোনো দ্বিতীয়-শ্রেণির ডেটা পথ নেই।",
    topicLabel: "এটা কী সম্পর্কে?",
    topicPlaceholder: "যেমন ভাঙা স্ট্রিটলাইট, জল সরবরাহ নেই, গর্তে ভরা রাস্তা",
    topicHint: "এটি সংক্ষিপ্ত রাখুন (সর্বোচ্চ ৮০ অক্ষর)।",
    describeLabelSelf: "আপনার সমস্যা বর্ণনা করুন",
    describeLabelRelay: "তারা কী বর্ণনা করেছে?",
    textareaPlaceholderSelf: "আপনার সমস্যা বর্ণনা করুন",
    textareaPlaceholderRelay: "তারা আপনাকে যা বলেছে তা তাদের নিজের ভাষায় টাইপ করুন",
    addPhoto: "ছবি যোগ করুন",
    useCurrentLocation: "আমার বর্তমান অবস্থান ব্যবহার করুন",
    remove: "সরান",
    locationAdded: "অবস্থান যোগ করা হয়েছে",
    manualAreaLabel: "অথবা আপনার এলাকা টাইপ করুন",
    manualAreaPlaceholder: "যেমন ওয়ার্ড ৭ প্রধান সড়ক, রাজগড়",
    submitButtonSending: "আপনার কণ্ঠস্বর পাঠানো হচ্ছে…",
    submitButton: "আমার কণ্ঠস্বর জমা দিন",
    privacyLine: "কোনো ট্র্যাকিং নম্বর নেই, কোনো স্ট্যাটাস নেই, কোনো সময়সীমা নেই। শুধুমাত্র একটি সৎ স্বীকৃতি।",
    voiceSpeak: "বলুন",
    voiceListening: "শোনা হচ্ছে… থামাতে ট্যাপ করুন",
    voiceTranscribing: "লেখা হচ্ছে…",
    voiceNotSupported: "এখানে ভয়েস সমর্থিত নয় — পরিবর্তে টাইপ করুন",
    voiceMicDenied: "মাইক্রোফোন অ্যাক্সেস প্রত্যাখ্যান করা হয়েছে। পরিবর্তে আপনার সমস্যা টাইপ করুন।",
    ackTitle: "আপনার কণ্ঠস্বর শোনা হয়েছে।",
    ackBody:
      "এটি রেকর্ড করা হয়েছে এবং এখন আপনার নির্বাচনী এলাকায় চাহিদার একটি বাস্তব প্যাটার্নের অংশ।",
    ackNote:
      "কোনো ট্র্যাকিং নম্বর নেই, কোনো স্ট্যাটাস আপডেট নেই — শুধুমাত্র একটি সৎ স্বীকৃতি। এটাই আমাদের একমাত্র প্রতিশ্রুতি।",
    submitAnother: "আরেকটি কণ্ঠস্বর জমা দিন",
  },
};

function useSiteLanguage(): UILanguage {
  const [language, setLanguage] = useState<UILanguage>("english");

  useEffect(() => {
    const syncLanguage = () => {
      const stored = localStorage.getItem("citizen-language") as UILanguage | null;
      if (stored && COPY[stored]) setLanguage(stored);
    };
    syncLanguage();
    window.addEventListener("citizen-language-change", syncLanguage);
    return () => window.removeEventListener("citizen-language-change", syncLanguage);
  }, []);

  return language;
}

type Mode = "self" | "relay";

export default function SubmitPage() {
  const uiLanguage = useSiteLanguage();
  const copy = useMemo(() => COPY[uiLanguage], [uiLanguage]);
  const [mode, setMode] = useState<Mode>("self");
  const [issueTitle, setIssueTitle] = useState("");
  const [assistedPerson, setAssistedPerson] = useState("");
  const [text, setText] = useState("");
  const [role, setRole] = useState("");
  const [locality, setLocality] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [manualArea, setManualArea] = useState("");
  const [showManualArea, setShowManualArea] = useState(false);
  const [status, setStatus] = useState<"idle" | "sending" | "done">("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [ack, setAck] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canSubmit = text.trim().length > 8 && status !== "sending";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setStatus("sending");
    setSubmitError(null);
    try {
      const imageBase64 = photoFile ? await compressImageFile(photoFile) : "";

      await saveSubmission({
        submittedFor: mode === "self" ? "myself" : "someone_else",
        name: assistedPerson.trim(),
        role: role.trim(),
        locality: (mode === "relay" ? locality : manualArea).trim(),
        topic: issueTitle.trim(),
        description: text.trim(),
        imageBase64,
        latitude: coords?.lat ?? null,
        longitude: coords?.lng ?? null,
      });

      setAck(true);
      setStatus("done");
    } catch (err) {
      // Surface the real reason instead of a generic message that hides it.
      setSubmitError(err instanceof Error ? err.message : "Could not save your submission. Please try again.");
      setStatus("idle");
    }
  }

  function reset() {
    setIssueTitle("");
    setAssistedPerson("");
    setText("");
    setRole("");
    setLocality("");
    setPhotoFile(null);
    setPhotoPreviewUrl("");
    setCoords(null);
    setManualArea("");
    setShowManualArea(false);
    setStatus("idle");
    setSubmitError(null);
    setAck(false);
  }

  function handlePhotoChange(file: File | null) {
    if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
    if (!file) {
      setPhotoFile(null);
      setPhotoPreviewUrl("");
      return;
    }
    setPhotoFile(file);
    setPhotoPreviewUrl(URL.createObjectURL(file));
  }

  function requestCurrentLocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setShowManualArea(true);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({ lat: position.coords.latitude, lng: position.coords.longitude });
        setShowManualArea(false);
      },
      () => {
        setCoords(null);
        setShowManualArea(true);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  }

  return (
    <div className="min-h-screen bg-cream">
      <AnimatePresence mode="wait">
        {status !== "done" ? (
          <>
            <div className="border-b border-border-subtle px-5 py-5 sm:px-8">
              <div className="mx-auto max-w-7xl">
                <h1 className="text-xl font-semibold text-ink">{copy.pageTitle}</h1>
              </div>
            </div>
            <div className="container-pp py-8">
              <motion.div
                key="form"
                exit={{ opacity: 0, y: -20 }}
                className="mx-auto max-w-2xl"
              >
                <form onSubmit={handleSubmit} className="card p-6 sm:p-8">
                  <div className="relative grid grid-cols-2 gap-1 rounded-2xl bg-cream p-1">
                    <ModeTab
                      active={mode === "self"}
                      onClick={() => setMode("self")}
                      icon={<User className="h-4 w-4" />}
                      label={copy.tabForMyself}
                    />
                    <ModeTab
                      active={mode === "relay"}
                      onClick={() => setMode("relay")}
                      icon={<Users className="h-4 w-4" />}
                      label={copy.tabForSomeoneElse}
                    />
                  </div>

                  <AnimatePresence initial={false}>
                    {mode === "relay" && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-5 grid gap-3 sm:grid-cols-2">
                          <Field
                            label={copy.relayWhoLabel}
                            placeholder={copy.relayWhoPlaceholder}
                            value={assistedPerson}
                            onChange={setAssistedPerson}
                          />
                          <Field
                            label={copy.relayRoleLabel}
                            placeholder={copy.relayRolePlaceholder}
                            value={role}
                            onChange={setRole}
                          />
                          <Field
                            label={copy.relayLocalityLabel}
                            placeholder={copy.relayLocalityPlaceholder}
                            value={locality}
                            onChange={setLocality}
                          />
                        </div>
                        <p className="mt-2 text-xs text-ink-muted">
                          {copy.relayNote}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="mt-5">
                    <Field
                      label={copy.topicLabel}
                      placeholder={copy.topicPlaceholder}
                      value={issueTitle}
                      onChange={setIssueTitle}
                      maxLength={80}
                    />
                    <p className="mt-1 text-xs text-ink-muted">{copy.topicHint}</p>
                  </div>

                  <div className="mt-5">
                    <div className="mb-2 flex items-center justify-between">
                      <label className="text-sm font-semibold text-ink">
                        {mode === "self" ? copy.describeLabelSelf : copy.describeLabelRelay}
                      </label>
                      <VoiceButton
                        onTranscript={(spoken) =>
                          setText((prev) => (prev.trim() ? `${prev.trim()} ${spoken}` : spoken))
                        }
                        labels={{
                          speak: copy.voiceSpeak,
                          listening: copy.voiceListening,
                          transcribing: copy.voiceTranscribing,
                          notSupported: copy.voiceNotSupported,
                          micDenied: copy.voiceMicDenied,
                        }}
                      />
                    </div>
                    <textarea
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      rows={5}
                      placeholder={
                        mode === "self"
                          ? copy.textareaPlaceholderSelf
                          : copy.textareaPlaceholderRelay
                      }
                      className="w-full resize-none rounded-2xl border border-border-subtle bg-cream p-4 text-[15px] leading-relaxed text-ink outline-none transition-all placeholder:text-ink-muted focus:border-accent focus:ring-4 focus:ring-accent/15"
                    />
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 rounded-full border border-border-subtle bg-surface-white px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:border-accent/40"
                      >
                        <Camera className="h-3.5 w-3.5" />
                        {copy.addPhoto}
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handlePhotoChange(e.target.files?.[0] ?? null)}
                      />

                      <button
                        type="button"
                        onClick={requestCurrentLocation}
                        className="inline-flex items-center gap-1.5 rounded-full border border-border-subtle bg-surface-white px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:border-accent/40"
                      >
                        <MapPin className="h-3.5 w-3.5" />
                        {copy.useCurrentLocation}
                      </button>
                    </div>

                    {photoPreviewUrl && (
                      <div className="mt-3 inline-flex items-center gap-2 rounded-xl border border-border-subtle bg-surface-white p-2">
                        <img
                          src={photoPreviewUrl}
                          alt={photoFile?.name ?? "Selected upload"}
                          className="h-14 w-14 rounded-lg object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => handlePhotoChange(null)}
                          className="inline-flex items-center gap-1 rounded-full border border-border-subtle px-2 py-1 text-xs text-ink-muted hover:text-ink"
                        >
                          <X className="h-3.5 w-3.5" />
                          {copy.remove}
                        </button>
                      </div>
                    )}

                    {coords && (
                      <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-border-subtle bg-surface-white px-3 py-1.5 text-xs font-medium text-ink">
                        <MapPin className="h-3.5 w-3.5 text-accent" />
                        {copy.locationAdded}
                        <button
                          type="button"
                          onClick={() => {
                            setCoords(null);
                            setShowManualArea(true);
                          }}
                          className="text-ink-muted hover:text-ink"
                          aria-label="Clear location"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}

                    {showManualArea && !coords && (
                      <div className="mt-3">
                        <Field
                          label={copy.manualAreaLabel}
                          placeholder={copy.manualAreaPlaceholder}
                          value={manualArea}
                          onChange={setManualArea}
                        />
                      </div>
                    )}
                  </div>

                  <button type="submit" disabled={!canSubmit} className="btn-primary mt-7 w-full disabled:opacity-40">
                    {status === "sending" ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> {copy.submitButtonSending}
                      </>
                    ) : (
                      <>
                        {copy.submitButton} <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>

                  {submitError && (
                    <p className="mt-3 text-center text-sm text-tag-red-text">{submitError}</p>
                  )}

                  <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs text-ink-muted">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    {copy.privacyLine}
                  </p>
                </form>
              </motion.div>
            </div>
          </>
        ) : (
          <Acknowledgment key="ack" ack={ack} onReset={reset} copy={copy} />
        )}
      </AnimatePresence>
    </div>
  );
}

function ModeTab({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative z-10 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-colors ${
        active ? "text-ink" : "text-ink-muted hover:text-ink"
      }`}
    >
      {active && (
        <motion.span
          layoutId="mode-pill"
          className="absolute inset-0 -z-10 rounded-xl bg-surface-white shadow-soft"
          transition={{ type: "spring", stiffness: 400, damping: 32 }}
        />
      )}
      {icon}
      {label}
    </button>
  );
}

function Field({
  label,
  placeholder,
  value,
  onChange,
  maxLength,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  maxLength?: number;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-ink">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        className="mt-1.5 w-full rounded-xl border border-border-subtle bg-cream px-3.5 py-2.5 text-sm text-ink outline-none transition-all placeholder:text-ink-muted focus:border-accent focus:ring-4 focus:ring-accent/15"
      />
    </label>
  );
}

function Acknowledgment({
  ack,
  onReset,
  copy,
}: {
  ack: boolean;
  onReset: () => void;
  copy: (typeof COPY)["english"];
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center px-5 py-16 text-center"
    >
      <div className="relative mb-10 flex h-28 w-28 items-center justify-center">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="absolute inset-0 rounded-full bg-tag-teal-bg"
            initial={{ scale: 0.6, opacity: 0.7 }}
            animate={{ scale: 2.2, opacity: 0 }}
            transition={{ duration: 2.2, repeat: Infinity, delay: i * 0.6, ease: "easeOut" }}
          />
        ))}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.1 }}
          className="relative flex h-20 w-20 items-center justify-center rounded-full bg-accent text-surface-white shadow-glow"
        >
          <motion.svg viewBox="0 0 24 24" className="h-9 w-9" fill="none">
            <motion.path
              d="M5 13l4 4L19 7"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.5, delay: 0.35 }}
            />
          </motion.svg>
        </motion.div>
      </div>

      <Reveal delay={0.2}>
        <h2 className="display max-w-md text-3xl font-semibold text-ink sm:text-4xl">
          {copy.ackTitle}
        </h2>
      </Reveal>
      <Reveal delay={0.3}>
        <p className="mx-auto mt-4 max-w-md text-lg text-ink-muted">
          {copy.ackBody}
        </p>
      </Reveal>

      <Reveal delay={0.4}>
        <div className="mx-auto mt-8 max-w-sm rounded-2xl border border-border-subtle bg-surface-white px-5 py-4 text-sm text-ink-muted">
          <Check className="mx-auto mb-2 h-5 w-5 text-accent" />
          {copy.ackNote}
        </div>
      </Reveal>

      <Reveal delay={0.5}>
        <button onClick={onReset} className="btn-primary mt-10 px-8 py-4 text-base">
          {copy.submitAnother}
        </button>
      </Reveal>
    </motion.div>
  );
}
