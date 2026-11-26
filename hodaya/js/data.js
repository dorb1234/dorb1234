/* כל התוכן העסקי של האתר — מחירים, גדלים, תוספות, פרטי קשר.
   לעדכון מחיר: משנים את המספר כאן בלבד. */
window.SITE = {
  whatsapp: "972512117203",
  phone: "051-211-7203",
  phoneIntl: "+972512117203",
  instagram: "https://www.instagram.com/hodaya.levi.shabi/",
  city: "גבעת שמואל",

  types: [
    {
      id: "bento", name: "עוגות בנטו", emoji: "🍱", color: "sky",
      blurb: "עוגה קטנה ומתוקה, מושלמת לזוג, למתנה או לחגיגה אינטימית.",
      img: "assets/catalog/bento-12.webp",
      sizes: [
        { id: "b10", name: "קוטר 10 ס״מ", portions: [2, 4], price: 180, img: "assets/catalog/bento-10.webp" },
        { id: "b12", name: "קוטר 12 ס״מ", portions: [4, 6], price: 240, img: "assets/catalog/bento-12.webp" }
      ]
    },
    {
      id: "round", name: "עוגות עגולות", emoji: "🎂", color: "rose",
      blurb: "עוגות שכבות גבוהות עם זילופי קרם חמאה שווייצרי.",
      img: "assets/catalog/round-18-three.webp",
      sizes: [
        { id: "r16", name: "קוטר 16 ס״מ", portions: [15, 18], price: 350, img: "assets/catalog/round-16.webp" },
        { id: "r18-1", name: "קוטר 18 ס״מ · שכבה אחת", portions: [15, 18], price: 350, img: "assets/catalog/round-18-one.webp" },
        { id: "r18-3", name: "קוטר 18 ס״מ · 3 שכבות", portions: [25, 28], price: 450, img: "assets/catalog/round-18-three.webp" },
        { id: "r16-tall", name: "קוטר 16 ס״מ · 6 שכבות, גובה 25 ס״מ", portions: [35, 40], price: 700, img: "assets/gallery/4622.webp" }
      ]
    },
    {
      id: "sheet", name: "עוגות גן", emoji: "🎈", color: "mint",
      blurb: "עוגה מלבנית לגן ולכיתה, עם גנאש שוקולד חלב ודף סוכר במתנה.",
      img: "assets/catalog/sheet-a3.webp",
      sizes: [
        { id: "a4", name: "גודל A4", portions: [18, 20], price: 230, img: "assets/catalog/sheet-a4.webp" },
        { id: "a3", name: "גודל A3", portions: [28, 30], price: 280, img: "assets/catalog/sheet-a3.webp" }
      ]
    },
    {
      id: "numbers", name: "עוגות מספרים", emoji: "🔢", color: "lilac",
      blurb: "הגיל, התאריך או כל מספר שמרגש אתכם — בזילופים ופרחים.",
      img: "assets/catalog/number-two.webp",
      sizes: [
        { id: "n1", name: "ספרה אחת", portions: [10, 12], price: 230, img: "assets/catalog/number-one.webp" },
        { id: "n2", name: "שתי ספרות", portions: [22, 24], price: 380, img: "assets/catalog/number-two.webp" }
      ]
    }
  ],

  /* price: null = "לפי בקשה". freeFor: סוגי עוגות שבהם התוספת ללא תשלום */
  extras: [
    { id: "flowers", name: "פרחים", emoji: "🌸", price: 30 },
    { id: "drawing", name: "ציור על העוגה", emoji: "🎨", price: 30 },
    { id: "sugar", name: "דף סוכר", emoji: "🖼️", price: 35, freeFor: ["sheet"] },
    { id: "fondant", name: "אלמנטים מבצק סוכר", emoji: "🦄", price: null }
  ],

  included: [
    "קרם קצפת, גנאש, ממרח ותוספות לבחירה",
    "זילוף ועיצוב בקרם חמאה שווייצרי",
    "עוגות חלביות",
    "בעוגות גן: גנאש שוקולד חלב ודף סוכר ללא תוספת תשלום"
  ]
};
