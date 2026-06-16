/** Bilingual SEO copy (Hindi + English). Full `/hi` route tree is not wired yet — strings are ready for metadata/alternates. */
export const seoTranslations = {
  en: {
    siteName: "CSR Organics — Organic India",
    homeTitle: "Buy Organic Products Online India | Certified Organic Food & Wellness",
    homeDescription:
      "Shop certified organic groceries, seeds, fertilizers, and wellness essentials from trusted Indian farms and MSMEs. PAN-India delivery, COD, and Razorpay-secured checkout.",
    shopTitle: "Shop Organic Products Online India",
    shopDescription:
      "Browse certified organic seeds, fertilizers, groceries, and garden essentials. Filter by category, price, and organic certification.",
    searchTitleSuffix: "— Organic Products Search | CSR Organics",
    categoryTitleSuffix: "Buy Online India | CSR Organics",
    brandTitleSuffix: "Organic Brand | CSR Organics",
    blogTitle: "Organic Living & Wellness Journal | CSR Organics",
    blogDescription:
      "Guides on certified organic food, sustainable farming, and everyday wellness for Indian households.",
  },
  hi: {
    siteName: "सीएसआर ऑर्गेनिक्स — ऑर्गेनिक इंडिया",
    homeTitle: "ऑर्गेनिक उत्पाद ऑनलाइन खरीदें भारत | प्रमाणित जैविक भोजन और वेलनेस",
    homeDescription:
      "भारतीय किसानों और एमएसएमई से प्रमाणित जैविक किराना, बीज, उर्वरक और वेलनेस उत्पाद। पैन-इंडिया डिलीवरी और सुरक्षित चेकआउट।",
    shopTitle: "ऑर्गेनिक उत्पाद ऑनलाइन खरीदें भारत",
    shopDescription:
      "प्रमाणित जैविक बीज, उर्वरक, किराना और बगीचे की जरूरतें देखें। श्रेणी, कीमत और प्रमाणन के अनुसार फ़िल्टर करें।",
    searchTitleSuffix: "— ऑर्गेनिक उत्पाद खोज | सीएसआर ऑर्गेनिक्स",
    categoryTitleSuffix: "ऑनलाइन खरीदें भारत | सीएसआर ऑर्गेनिक्स",
    brandTitleSuffix: "ऑर्गेनिक ब्रांड | सीएसआर ऑर्गेनिक्स",
    blogTitle: "ऑर्गेनिक जीवन और वेलनेस जर्नल | सीएसआर ऑर्गेनिक्स",
    blogDescription:
      "प्रमाणित जैविक भोजन, टिकाऊ खेती और भारतीय परिवारों के लिए दैनिक वेलनेस पर गाइड।",
  },
} as const;

export type SeoLocale = keyof typeof seoTranslations;
