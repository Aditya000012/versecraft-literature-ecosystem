export interface Language {
  code: string;
  name: string;
  nativeName?: string;
  region?: string;
  direction?: 'ltr' | 'rtl';
}

export const languages: Language[] = [
  // 1. English
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    region: 'Global',
    direction: 'ltr',
  },

  // 2. Major South Asian / Indian Languages
  {
    code: 'hi',
    name: 'Hindi',
    nativeName: 'हिन्दी',
    region: 'India',
    direction: 'ltr',
  },
  {
    code: 'ur',
    name: 'Urdu',
    nativeName: 'اردو',
    region: 'South Asia',
    direction: 'rtl',
  },
  {
    code: 'bn',
    name: 'Bengali',
    nativeName: 'বাংলা',
    region: 'Bengal',
    direction: 'ltr',
  },
  {
    code: 'ta',
    name: 'Tamil',
    nativeName: 'தமிழ்',
    region: 'South India',
    direction: 'ltr',
  },
  {
    code: 'te',
    name: 'Telugu',
    nativeName: 'తెలుగు',
    region: 'South India',
    direction: 'ltr',
  },
  {
    code: 'mr',
    name: 'Marathi',
    nativeName: 'मराठी',
    region: 'Western India',
    direction: 'ltr',
  },
  {
    code: 'gu',
    name: 'Gujarati',
    nativeName: 'ગુજરાતી',
    region: 'Western India',
    direction: 'ltr',
  },
  {
    code: 'pa',
    name: 'Punjabi',
    nativeName: 'ਪੰਜਾਬੀ',
    region: 'Punjab',
    direction: 'ltr',
  },
  {
    code: 'kn',
    name: 'Kannada',
    nativeName: 'ಕನ್ನಡ',
    region: 'South India',
    direction: 'ltr',
  },
  {
    code: 'ml',
    name: 'Malayalam',
    nativeName: 'മലയാളം',
    region: 'South India',
    direction: 'ltr',
  },
  {
    code: 'or',
    name: 'Odia',
    nativeName: 'ଓଡ଼ିଆ',
    region: 'Eastern India',
    direction: 'ltr',
  },
  {
    code: 'as',
    name: 'Assamese',
    nativeName: 'অসমীয়া',
    region: 'Northeast India',
    direction: 'ltr',
  },
  {
    code: 'sa',
    name: 'Sanskrit',
    nativeName: 'संस्कृतम्',
    region: 'India',
    direction: 'ltr',
  },
  {
    code: 'ne',
    name: 'Nepali',
    nativeName: 'नेपाली',
    region: 'Nepal',
    direction: 'ltr',
  },
  {
    code: 'si',
    name: 'Sinhala',
    nativeName: 'සිංහල',
    region: 'Sri Lanka',
    direction: 'ltr',
  },

  // 3. Major European Languages
  {
    code: 'es',
    name: 'Spanish',
    nativeName: 'Español',
    region: 'Europe/Latin America',
    direction: 'ltr',
  },
  {
    code: 'fr',
    name: 'French',
    nativeName: 'Français',
    region: 'Europe/Global',
    direction: 'ltr',
  },
  {
    code: 'de',
    name: 'German',
    nativeName: 'Deutsch',
    region: 'Europe',
    direction: 'ltr',
  },
  {
    code: 'it',
    name: 'Italian',
    nativeName: 'Italiano',
    region: 'Europe',
    direction: 'ltr',
  },
  {
    code: 'pt',
    name: 'Portuguese',
    nativeName: 'Português',
    region: 'Europe/Brazil',
    direction: 'ltr',
  },
  {
    code: 'nl',
    name: 'Dutch',
    nativeName: 'Nederlands',
    region: 'Europe',
    direction: 'ltr',
  },
  {
    code: 'sv',
    name: 'Swedish',
    nativeName: 'Svenska',
    region: 'Scandinavia',
    direction: 'ltr',
  },
  {
    code: 'no',
    name: 'Norwegian',
    nativeName: 'Norsk',
    region: 'Scandinavia',
    direction: 'ltr',
  },
  {
    code: 'da',
    name: 'Danish',
    nativeName: 'Dansk',
    region: 'Scandinavia',
    direction: 'ltr',
  },
  {
    code: 'fi',
    name: 'Finnish',
    nativeName: 'Suomi',
    region: 'Europe',
    direction: 'ltr',
  },
  {
    code: 'is',
    name: 'Icelandic',
    nativeName: 'Íslenska',
    region: 'Europe',
    direction: 'ltr',
  },
  {
    code: 'ga',
    name: 'Irish',
    nativeName: 'Gaeilge',
    region: 'Europe',
    direction: 'ltr',
  },
  {
    code: 'cy',
    name: 'Welsh',
    nativeName: 'Cymraeg',
    region: 'Europe',
    direction: 'ltr',
  },
  {
    code: 'gd',
    name: 'Scottish Gaelic',
    nativeName: 'Gàidhlig',
    region: 'Europe',
    direction: 'ltr',
  },
  {
    code: 'ca',
    name: 'Catalan',
    nativeName: 'Català',
    region: 'Europe',
    direction: 'ltr',
  },
  {
    code: 'gl',
    name: 'Galician',
    nativeName: 'Galego',
    region: 'Europe',
    direction: 'ltr',
  },
  {
    code: 'eu',
    name: 'Basque',
    nativeName: 'Euskara',
    region: 'Europe',
    direction: 'ltr',
  },
  {
    code: 'ru',
    name: 'Russian',
    nativeName: 'Русский',
    region: 'Eastern Europe',
    direction: 'ltr',
  },
  {
    code: 'uk',
    name: 'Ukrainian',
    nativeName: 'Українська',
    region: 'Eastern Europe',
    direction: 'ltr',
  },
  {
    code: 'pl',
    name: 'Polish',
    nativeName: 'Polski',
    region: 'Eastern Europe',
    direction: 'ltr',
  },
  {
    code: 'cs',
    name: 'Czech',
    nativeName: 'Čeština',
    region: 'Eastern Europe',
    direction: 'ltr',
  },
  {
    code: 'sk',
    name: 'Slovak',
    nativeName: 'Slovenčina',
    region: 'Eastern Europe',
    direction: 'ltr',
  },
  {
    code: 'sl',
    name: 'Slovenian',
    nativeName: 'Slovenščina',
    region: 'Eastern Europe',
    direction: 'ltr',
  },
  {
    code: 'hr',
    name: 'Croatian',
    nativeName: 'Hrvatski',
    region: 'Eastern Europe',
    direction: 'ltr',
  },
  {
    code: 'sr',
    name: 'Serbian',
    nativeName: 'Српски',
    region: 'Eastern Europe',
    direction: 'ltr',
  },
  {
    code: 'bs',
    name: 'Bosnian',
    nativeName: 'Bosanski',
    region: 'Eastern Europe',
    direction: 'ltr',
  },
  {
    code: 'bg',
    name: 'Bulgarian',
    nativeName: 'Български',
    region: 'Eastern Europe',
    direction: 'ltr',
  },
  {
    code: 'mk',
    name: 'Macedonian',
    nativeName: 'Македонски',
    region: 'Eastern Europe',
    direction: 'ltr',
  },
  {
    code: 'ro',
    name: 'Romanian',
    nativeName: 'Română',
    region: 'Eastern Europe',
    direction: 'ltr',
  },
  {
    code: 'hu',
    name: 'Hungarian',
    nativeName: 'Magyar',
    region: 'Eastern Europe',
    direction: 'ltr',
  },
  {
    code: 'el',
    name: 'Greek',
    nativeName: 'Ελληνικά',
    region: 'Europe',
    direction: 'ltr',
  },
  {
    code: 'sq',
    name: 'Albanian',
    nativeName: 'Shqip',
    region: 'Europe',
    direction: 'ltr',
  },
  {
    code: 'lt',
    name: 'Lithuanian',
    nativeName: 'Lietuvių',
    region: 'Baltic',
    direction: 'ltr',
  },
  {
    code: 'lv',
    name: 'Latvian',
    nativeName: 'Latviešu',
    region: 'Baltic',
    direction: 'ltr',
  },
  {
    code: 'et',
    name: 'Estonian',
    nativeName: 'Eesti',
    region: 'Baltic',
    direction: 'ltr',
  },

  // 4. Middle Eastern Languages
  {
    code: 'ar',
    name: 'Arabic',
    nativeName: 'العربية',
    region: 'Middle East',
    direction: 'rtl',
  },
  {
    code: 'fa',
    name: 'Persian',
    nativeName: 'فارسی',
    region: 'Middle East',
    direction: 'rtl',
  },
  {
    code: 'tr',
    name: 'Turkish',
    nativeName: 'Türkçe',
    region: 'Middle East',
    direction: 'ltr',
  },
  {
    code: 'he',
    name: 'Hebrew',
    nativeName: 'עברית',
    region: 'Middle East',
    direction: 'rtl',
  },
  {
    code: 'ku',
    name: 'Kurdish',
    nativeName: 'Kurdî / کوردی',
    region: 'Middle East',
    direction: 'rtl',
  },
  {
    code: 'ps',
    name: 'Pashto',
    nativeName: 'پښتو',
    region: 'Middle East',
    direction: 'rtl',
  },
  {
    code: 'prs',
    name: 'Dari',
    nativeName: 'دری',
    region: 'Middle East',
    direction: 'rtl',
  },
  {
    code: 'az',
    name: 'Azerbaijani',
    nativeName: 'Azərbaycanca',
    region: 'Caucasus',
    direction: 'ltr',
  },
  {
    code: 'hy',
    name: 'Armenian',
    nativeName: 'Հայերեն',
    region: 'Caucasus',
    direction: 'ltr',
  },
  {
    code: 'ka',
    name: 'Georgian',
    nativeName: 'ქართული',
    region: 'Caucasus',
    direction: 'ltr',
  },

  // 5. East / Southeast Asian Languages
  {
    code: 'zh-CN',
    name: 'Chinese Simplified',
    nativeName: '简体中文',
    region: 'East Asia',
    direction: 'ltr',
  },
  {
    code: 'zh-TW',
    name: 'Chinese Traditional',
    nativeName: '繁體中文',
    region: 'East Asia',
    direction: 'ltr',
  },
  {
    code: 'ja',
    name: 'Japanese',
    nativeName: '日本語',
    region: 'East Asia',
    direction: 'ltr',
  },
  {
    code: 'ko',
    name: 'Korean',
    nativeName: '한국어',
    region: 'East Asia',
    direction: 'ltr',
  },
  {
    code: 'vi',
    name: 'Vietnamese',
    nativeName: 'Tiếng Việt',
    region: 'Southeast Asia',
    direction: 'ltr',
  },
  {
    code: 'th',
    name: 'Thai',
    nativeName: 'ไทย',
    region: 'Southeast Asia',
    direction: 'ltr',
  },
  {
    code: 'id',
    name: 'Indonesian',
    nativeName: 'Bahasa Indonesia',
    region: 'Southeast Asia',
    direction: 'ltr',
  },
  {
    code: 'ms',
    name: 'Malay',
    nativeName: 'Bahasa Melayu',
    region: 'Southeast Asia',
    direction: 'ltr',
  },
  {
    code: 'tl',
    name: 'Filipino / Tagalog',
    nativeName: 'Wikang Filipino',
    region: 'Southeast Asia',
    direction: 'ltr',
  },
  {
    code: 'my',
    name: 'Burmese',
    nativeName: 'မြန်မာစာ',
    region: 'Southeast Asia',
    direction: 'ltr',
  },
  {
    code: 'km',
    name: 'Khmer',
    nativeName: 'ភាសាខ្មែរ',
    region: 'Southeast Asia',
    direction: 'ltr',
  },
  {
    code: 'lo',
    name: 'Lao',
    nativeName: 'ພາສາລາວ',
    region: 'Southeast Asia',
    direction: 'ltr',
  },
  {
    code: 'mn',
    name: 'Mongolian',
    nativeName: 'Монгол хэл',
    region: 'East Asia',
    direction: 'ltr',
  },

  // 6. African Languages
  {
    code: 'sw',
    name: 'Swahili',
    nativeName: 'Kiswahili',
    region: 'East Africa',
    direction: 'ltr',
  },
  {
    code: 'yo',
    name: 'Yoruba',
    nativeName: 'Yorùbá',
    region: 'West Africa',
    direction: 'ltr',
  },
  {
    code: 'ig',
    name: 'Igbo',
    nativeName: 'Asụsụ Igbo',
    region: 'West Africa',
    direction: 'ltr',
  },
  {
    code: 'ha',
    name: 'Hausa',
    nativeName: 'Harshen Hausa',
    region: 'West Africa',
    direction: 'ltr',
  },
  {
    code: 'am',
    name: 'Amharic',
    nativeName: 'አማርኛ',
    region: 'East Africa',
    direction: 'ltr',
  },
  {
    code: 'so',
    name: 'Somali',
    nativeName: 'Af-Soomaali',
    region: 'Horn of Africa',
    direction: 'ltr',
  },
  {
    code: 'zu',
    name: 'Zulu',
    nativeName: 'isiZulu',
    region: 'Southern Africa',
    direction: 'ltr',
  },
  {
    code: 'xh',
    name: 'Xhosa',
    nativeName: 'isiXhosa',
    region: 'Southern Africa',
    direction: 'ltr',
  },
  {
    code: 'af',
    name: 'Afrikaans',
    nativeName: 'Afrikaans',
    region: 'Southern Africa',
    direction: 'ltr',
  },
  {
    code: 'st',
    name: 'Sesotho',
    nativeName: 'Sesotho',
    region: 'Southern Africa',
    direction: 'ltr',
  },
  {
    code: 'rw',
    name: 'Kinyarwanda',
    nativeName: 'Ikinyarwanda',
    region: 'East Africa',
    direction: 'ltr',
  },
  {
    code: 'sn',
    name: 'Shona',
    nativeName: 'chiShona',
    region: 'Southern Africa',
    direction: 'ltr',
  },

  // 7. Classical Languages
  {
    code: 'la',
    name: 'Latin',
    nativeName: 'Latina',
    region: 'Ancient Rome',
    direction: 'ltr',
  },
  {
    code: 'grc',
    name: 'Classical Greek',
    nativeName: 'Ἑλληνική',
    region: 'Ancient Greece',
    direction: 'ltr',
  },
  {
    code: 'ang',
    name: 'Old English',
    nativeName: 'Englisc',
    region: 'Early Medieval England',
    direction: 'ltr',
  },
];

// Helper to get all core languages
export const getAllLanguages = (): Language[] => {
  return languages;
};

// Prepends "Auto Detect" to the list of languages for translation source select
export const getSourceLanguages = (): Language[] => {
  return [
    {
      code: 'auto',
      name: 'Auto Detect',
      nativeName: 'Auto Detect',
      region: 'System',
      direction: 'ltr',
    },
    ...languages,
  ];
};

// Returns core list for translation targets
export const getTargetLanguages = (): Language[] => {
  return languages;
};

// Returns core list for filters, prepended with "Any Language" for filter selection
export const getFilterLanguages = (): Language[] => {
  return [
    {
      code: 'any',
      name: 'Any Language',
      nativeName: 'Any Language',
      region: 'System',
      direction: 'ltr',
    },
    ...languages,
  ];
};

// Helper to look up a language by code or name case-insensitively for full backwards compatibility
export const getLanguageByCodeOrName = (val: string): Language | undefined => {
  if (!val) return undefined;
  const cleanVal = val.trim().toLowerCase();
  
  // Special cases for compatibility
  if (cleanVal === 'auto' || cleanVal === 'auto detect') {
    return {
      code: 'auto',
      name: 'Auto Detect',
      nativeName: 'Auto Detect',
      region: 'System',
      direction: 'ltr',
    };
  }
  if (cleanVal === 'any' || cleanVal === 'any language') {
    return {
      code: 'any',
      name: 'Any Language',
      nativeName: 'Any Language',
      region: 'System',
      direction: 'ltr',
    };
  }

  // Find exact code match
  const byCode = languages.find((lang) => lang.code.toLowerCase() === cleanVal);
  if (byCode) return byCode;

  // Find exact name match
  const byName = languages.find((lang) => lang.name.toLowerCase() === cleanVal);
  if (byName) return byName;

  // Partial name matches (e.g. "Chinese" matching "Chinese Simplified" as a fallback)
  const byPartialName = languages.find((lang) =>
    lang.name.toLowerCase().includes(cleanVal)
  );
  if (byPartialName) return byPartialName;

  return undefined;
};
