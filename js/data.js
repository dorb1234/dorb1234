/* Bloomy — shared data. Prices and details carried over from the original site. */
window.BLOOMY = {
  whatsapp: '972504554781',
  phoneDisplay: '050-455-4781',
  bitNumber: '0504554781',
  instagram: 'https://www.instagram.com/bloomy_flowers33/',
  origin: { lat: 32.89, lon: 35.098 },      // קיבוץ כפר מסריק
  shippingPerKm: 3,

  /* Instagram giveaway: one winner gets the bouquet they built.
     ends = when entries close (Israel time). maxValue = hidden cap on the bouquet's value (₪),
     never shown to participants. */
  giveaway: {
    ends: '2026-12-04T12:00:00+02:00',
    endsLabel: 'יום שישי, 4.12 בשעה 12:00',
    maxValue: 150,
    minStems: 5
  },
  customMinimum: 50,
  maxStems: 60,

  products: [
    { id: 1, name: 'שמחה בוורוד', price: 210, tone: 'pink', img: 'pink-gerberas', mood: ['love', 'mom', 'friend'],
      short: 'גרברות וציפורנים ורודות עם גיבסנית',
      long: 'זר שופע של גרברות ורודות, ציפורנים מסולסלות וענני גיבסנית, עטוף בעטיפה שקופה עם קצוות לבנים. כשרוצים להגיד ״חשבתי עלייך״ בקול רם.',
      tags: ['גרברה', 'ציפורן', 'גיבסנית'] },
    { id: 2, name: 'ורוד מלבלב', price: 180, tone: 'pink', img: 'pink-lilies', mood: ['love', 'mom', 'special'],
      short: 'ורדים ורודים וניצני שושן',
      long: 'ורדים ורודים בין ניצני שושן ירוקים שנפתחים לאט במהלך השבוע. זר שממשיך להפתיע גם אחרי שהגיע.',
      tags: ['ורד', 'שושן'] },
    { id: 3, name: 'פשוט לבן', price: 70, tone: 'white', img: 'white-bouquet', mood: ['self', 'friend', 'dad'],
      short: 'פריחה לבנה וניצני שושן בעטיפת נייר',
      long: 'פריחה לבנה ונקייה עם ניצני שושן, בעטיפת נייר קראפט. קטן, אלגנטי, ותמיד במקום.',
      tags: ['ליזיאנטוס', 'שושן', 'קראפט'] },
    { id: 4, name: 'ורוד כפרי', price: 80, tone: 'pink', img: 'rustic-pink', mood: ['friend', 'mom', 'self'],
      short: 'פריחה ורודה ובורדו בעטיפת נייר',
      long: 'שילוב חם של ורוד, לבן ובורדו בעטיפת נייר וסרט ורוד. מרגיש כמו זר שנקטף בדרך הביתה.',
      tags: ['ציפורן', 'ליזיאנטוס', 'קראפט'] },
    { id: 5, name: 'קרן שמש', price: 90, tone: 'yellow', img: 'sunflowers', mood: ['friend', 'dad', 'self'],
      short: 'חמניות וניצני שושן',
      long: 'חמניות צהובות וניצני שושן בעטיפה שקופה. אנרגיה טובה שאפשר להחזיק ביד.',
      tags: ['חמנייה', 'שושן'] },
    { id: 6, name: 'אהבה גדולה', price: 300, tone: 'pink', img: 'grand-roses', mood: ['love', 'special'],
      short: 'ורדים וניצני שושן בעטיפה לבנה',
      long: 'הזר הגדול שלנו: ורדים, ניצני שושן וגיבסנית בעטיפה לבנה מרשימה. לרגעים שלא עוברים בשקט.',
      tags: ['ורד', 'שושן', 'גיבסנית'], badge: 'הכי מרשים' },
    { id: 7, name: 'רכות של פרחים', price: 170, tone: 'white', img: 'pastel', mood: ['mom', 'special', 'love'],
      short: 'פריחה בגווני ורוד ולבן עם ירק',
      long: 'פריחה עדינה בגווני ורוד, לילך ולבן, עם ירק טרי. זר רך שמרגיש כמו חיבוק.',
      tags: ['ליזיאנטוס', 'ורד', 'ירק'] },
    { id: 8, name: 'רגע ורוד', price: 80, tone: 'pink', img: 'gerbera-mix', mood: ['friend', 'self', 'mom'],
      short: 'גרברות ורודות, ניצני שושן וגיבסנית',
      long: 'גרברות ורודות, ניצני שושן וגיבסנית. כל מה שאוהבים בזר גדול, בגודל שמתאים לכל יום.',
      tags: ['גרברה', 'שושן', 'גיבסנית'], badge: 'מחיר מעולה' }
  ],

  /* Builder flowers. rate = ₪ per stem. img = file in assets/flowers (filter tweaks a base image). */
  flowers: [
    { id: 'gerbera', name: 'גרברה ורודה', group: 'גרברות', rate: 7, img: 'gerbera', color: '#ee8ca7' },
    { id: 'gerbera-red', name: 'גרברה אדומה', group: 'גרברות', rate: 7, img: 'gerbera-red', color: '#d83242' },
    { id: 'gerbera-yellow', name: 'גרברה צהובה', group: 'גרברות', rate: 7, img: 'gerbera-yellow', color: '#eac533' },
    { id: 'gerbera-white', name: 'גרברה לבנה', group: 'גרברות', rate: 7, img: 'gerbera-white', color: '#f6f1e4' },
    { id: 'rose', name: 'ורד ורוד', group: 'ורדים', rate: 15, img: 'rose', color: '#ed9fb3' },
    { id: 'rose-white', name: 'ורד לבן', group: 'ורדים', rate: 15, img: 'rose-white', color: '#f6f1e4' },
    { id: 'rose-red', name: 'ורד אדום', group: 'ורדים', rate: 15, img: 'rose-red', color: '#ba1730' },
    { id: 'rose-orange', name: 'ורד כתום', group: 'ורדים', rate: 15, img: 'rose-orange', color: '#ef8c34' },
    { id: 'lily-pink', name: 'לילי ורוד', group: 'לילי ושושן', rate: 15, img: 'lily-pink', color: '#e8acc6' },
    { id: 'lily-white', name: 'לילי לבן', group: 'לילי ושושן', rate: 15, img: 'lily-white', color: '#f6f1e4' },
    { id: 'lily-orange', name: 'לילי כתום', group: 'לילי ושושן', rate: 15, img: 'lily-orange', color: '#f59637' },
    { id: 'lily', name: 'ניצן שושן', group: 'לילי ושושן', rate: 15, img: 'lily', color: '#9abb4a', bud: true },
    { id: 'lisianthus-white', name: 'ליזיאנטוס לבן', group: 'ליזיאנטוס', rate: 7, img: 'lisianthus-white', color: '#fff9e7' },
    { id: 'lisianthus-pink', name: 'ליזיאנטוס ורוד', group: 'ליזיאנטוס', rate: 7, img: 'lisianthus-pink', color: '#f3c6d3' },
    { id: 'carnation', name: 'ציפורן ורודה', group: 'ציפורנים', rate: 7, img: 'carnation', color: '#ee93b0' },
    { id: 'carnation-wine', name: 'ציפורן ורוד כהה', group: 'ציפורנים', rate: 7, img: 'carnation-dark', color: '#c2305f' },
    { id: 'carnation-red', name: 'ציפורן אדומה', group: 'ציפורנים', rate: 7, img: 'carnation-red', color: '#c81d25' },
    { id: 'carnation-white', name: 'ציפורן לבנה', group: 'ציפורנים', rate: 7, img: 'carnation-white', color: '#f7f4ee' },
    { id: 'sunflower', name: 'חמנייה', group: 'חמניות', rate: 15, img: 'sunflower', color: '#edbc42' },
    { id: 'gypsophila', name: 'גיבסנית', group: 'השלמות', rate: 5, img: 'gypsophila', color: '#fffdf1', unit: 'ענף', filler: true },
    { id: 'greenery', name: 'ירק', group: 'השלמות', rate: 5, img: null, color: '#66885d', unit: 'ענף', filler: true, leaf: true }
  ],

  presets: {
    pink:  { label: 'התחלה ורודה', counts: { gerbera: 3, rose: 4, carnation: 2, gypsophila: 3, greenery: 2 } },
    sun:   { label: 'נגיעה של שמש', counts: { sunflower: 3, lily: 3, gypsophila: 2, greenery: 2 } },
    white: { label: 'לבן ועדין', counts: { 'lisianthus-white': 6, lily: 3, gypsophila: 3, greenery: 2 } },
    love:  { label: 'אדום של אהבה', counts: { 'rose-red': 7, gypsophila: 3, greenery: 2 } },
    sunset:{ label: 'שקיעה כתומה', counts: { 'rose-orange': 3, 'lily-orange': 2, 'gerbera-yellow': 3, greenery: 2 } }
  },

  palettes: {
    pink:   ['gerbera', 'rose', 'carnation', 'lisianthus-pink', 'lily-pink', 'gypsophila', 'greenery'],
    sunny:  ['sunflower', 'gerbera-yellow', 'rose-orange', 'lily', 'gypsophila', 'greenery'],
    light:  ['rose-white', 'lisianthus-white', 'lily-white', 'gerbera-white', 'carnation-white', 'lily', 'gypsophila', 'greenery'],
    bold:   ['rose-red', 'gerbera-red', 'carnation-red', 'carnation-wine', 'gypsophila', 'greenery'],
    mix:    ['gerbera', 'sunflower', 'rose-orange', 'lisianthus-white', 'carnation-wine', 'lily', 'gypsophila', 'greenery']
  },

  recipients: [
    { id: 'love', icon: '♡', label: 'לאהבה שלי', note: 'משהו אישי בינינו' },
    { id: 'mom', icon: '✿', label: 'לאמא', note: 'על כל מה שהיא' },
    { id: 'dad', icon: '☀', label: 'לאבא', note: 'גם לו מגיע זר' },
    { id: 'friend', icon: '✧', label: 'לחבר / חברה', note: 'על החיבור שלנו' },
    { id: 'self', icon: '❋', label: 'לעצמי', note: 'בלי לחכות לסיבה' },
    { id: 'special', icon: '✻', label: 'למישהו מיוחד', note: 'כי מגיע לו / לה' }
  ],

  greetings: {
    love: ['כל יום איתך הוא הסיבה לפרחים. אוהב/ת אותך ♡', 'סתם כי חשבתי עלייך. ועל כמה שאני בר/ת מזל.'],
    mom: ['אמא, תודה על הכול. על כל יום ועל כל חיבוק ♡', 'לאמא הכי טובה בעולם — שתמיד יהיה לך פורח.'],
    dad: ['אבא, תודה שאתה תמיד שם. מגיע לך זר (וגם חיבוק).', 'לאבא הכי טוב — באהבה גדולה.'],
    friend: ['על החברות שלנו, שתמיד תפרח 🌸', 'סתם, כי מגיע לך. ואת/ה יודע/ת למה.'],
    self: ['לעצמי, כי מגיע לי.', 'תזכורת קטנה: את/ה עושה עבודה מדהימה.'],
    special: ['כמה מילים קטנות. הרבה כוונה.', 'שיהיה לך יום שמח ופורח במיוחד ✻']
  },


  cities: [
    { name: 'חיפה', lat: 32.794, lon: 34.989 },
    { name: 'נהריה', lat: 33.006, lon: 35.095 },
    { name: 'קריית מוצקין', lat: 32.838, lon: 35.079, alt: ['קרית מוצקין'] },
    { name: 'קריית ביאליק', lat: 32.833, lon: 35.088, alt: ['קרית ביאליק'] },
    { name: 'קריית ים', lat: 32.849, lon: 35.068, alt: ['קרית ים'] },
    { name: 'קריית אתא', lat: 32.805, lon: 35.106, alt: ['קרית אתא'] },
    { name: 'קריית חיים', lat: 32.826, lon: 35.065, alt: ['קרית חיים'] },
    { name: 'קריית שמואל', lat: 32.839, lon: 35.07, alt: ['קרית שמואל'] },
    { name: 'כפר מסריק', lat: 32.89, lon: 35.098 }
  ],

  faq: [
    ['איך ההזמנה מאושרת?', 'ממלאים את הפרטים וממשיכים לוואטסאפ. Bloomy תאשר את הזמינות, התאריך והמחיר הסופי בהודעה. אין חיוב באתר.'],
    ['לאן מגיעים המשלוחים?', 'לחיפה, נהריה והקריות. אפשר להזין כתובת או לבחור עיר לקבלת הערכת מחיר. איסוף עצמי מכפר מסריק ללא תשלום ובתיאום.'],
    ['איך מחושב מחיר המשלוח?', 'לפי מרחק הנסיעה מכפר מסריק לכתובת שלכם. המחיר באתר הוא הערכה, והסופי יאושר בתיאום.'],
    ['איך מזמינים זר בבנייה עצמית?', 'בוחרים סוגי פרחים וכמויות, מוסיפים לסל וממשיכים להזמנה עם תאריך וברכה. המחיר מחושב לפי ההרכב, במינימום 50 ₪ לזר לפני משלוח.'],
    ['הזר יהיה זהה לתמונה?', 'התמונות הן זרים אמיתיים של Bloomy. הפרחים עשויים להשתנות לפי העונה והזמינות; ההדמיה בבנייה עצמית מציגה כיוון והרכב בלבד.'],
    ['איך משלמים?', 'אחרי אישור ההזמנה והסכום הסופי בוואטסאפ: bit, PayBox, כרטיס אשראי, Apple Pay או Google Pay — בתיאום עם העסק.']
  ]
};

/* flower lookup used by the cart (custom bouquets) */
window.BloomyBuilder = window.BloomyBuilder || { byId: Object.fromEntries(window.BLOOMY.flowers.map(f => [f.id, f])) };
