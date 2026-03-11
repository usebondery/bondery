interface EmojiData {
  emoji: string;
  keywords: string[];
}

type EmojiCategoryName =
  | "Humans"
  | "Work"
  | "Celebrations"
  | "Sports"
  | "Travel"
  | "Animals"
  | "Buildings"
  | "Nature"
  | "Food"
  | "Activities"
  | "Hearts"
  | "Objects"
  | "Miscellaneous";

const EMOJI_LIST: EmojiData[] = [
  // People & Groups
  { emoji: "👨‍👩‍👧‍👦", keywords: ["family", "parents", "children", "kids", "relatives", "household"] },
  { emoji: "👥", keywords: ["group", "people", "users", "team", "community", "members"] },
  { emoji: "👤", keywords: ["person", "user", "individual", "profile", "account"] },
  { emoji: "🧑‍🤝‍🧑", keywords: ["couple", "partners", "friends", "pair", "duo", "together"] },
  { emoji: "👫", keywords: ["couple", "partners", "relationship", "dating", "love"] },
  { emoji: "👬", keywords: ["friends", "bros", "buddies", "men", "guys"] },
  { emoji: "👭", keywords: ["friends", "gals", "women", "sisters", "besties"] },
  {
    emoji: "🧑‍💼",
    keywords: ["professional", "business", "office", "work", "corporate", "employee"],
  },
  {
    emoji: "👨‍💼",
    keywords: ["businessman", "professional", "office", "work", "corporate", "manager"],
  },
  {
    emoji: "👩‍💼",
    keywords: ["businesswoman", "professional", "office", "work", "corporate", "manager"],
  },
  { emoji: "🧑‍🎓", keywords: ["student", "graduate", "school", "university", "education", "alumni"] },
  {
    emoji: "👨‍🎓",
    keywords: ["graduate", "student", "education", "university", "alumni", "scholar"],
  },
  {
    emoji: "👩‍🎓",
    keywords: ["graduate", "student", "education", "university", "alumni", "scholar"],
  },

  // Work & Business
  {
    emoji: "💼",
    keywords: ["business", "work", "job", "briefcase", "professional", "career", "office"],
  },
  { emoji: "🏢", keywords: ["office", "building", "corporate", "company", "work", "business"] },
  {
    emoji: "💻",
    keywords: ["computer", "laptop", "tech", "work", "developer", "programming", "it"],
  },
  { emoji: "📊", keywords: ["chart", "data", "analytics", "statistics", "report", "presentation"] },
  {
    emoji: "📈",
    keywords: ["growth", "chart", "increase", "success", "trending", "profit", "stocks"],
  },
  { emoji: "📉", keywords: ["decline", "chart", "decrease", "loss", "down", "falling"] },
  { emoji: "🗂️", keywords: ["files", "folder", "organize", "documents", "archive", "records"] },
  { emoji: "📁", keywords: ["folder", "directory", "files", "documents", "organize"] },
  { emoji: "📋", keywords: ["clipboard", "tasks", "list", "checklist", "notes", "todo"] },
  { emoji: "✏️", keywords: ["pencil", "write", "edit", "draw", "notes", "school"] },
  { emoji: "📝", keywords: ["notes", "memo", "write", "document", "paper", "draft"] },
  { emoji: "🖊️", keywords: ["pen", "write", "sign", "signature", "contract"] },
  { emoji: "📌", keywords: ["pin", "important", "reminder", "mark", "location", "save"] },

  // Celebrations & Events
  {
    emoji: "🎉",
    keywords: ["party", "celebration", "celebrate", "birthday", "anniversary", "event", "confetti"],
  },
  { emoji: "🎊", keywords: ["confetti", "party", "celebration", "event", "festival", "new year"] },
  { emoji: "🎈", keywords: ["balloon", "party", "birthday", "celebration", "fun", "event"] },
  { emoji: "🥳", keywords: ["party", "celebration", "birthday", "happy", "celebrate", "excited"] },
  {
    emoji: "🎁",
    keywords: ["gift", "present", "birthday", "christmas", "holiday", "surprise", "wrapped"],
  },
  { emoji: "🎂", keywords: ["birthday", "cake", "celebration", "party", "anniversary", "candles"] },
  { emoji: "🍻", keywords: ["cheers", "beer", "drinks", "celebration", "party", "toast", "pub"] },
  { emoji: "🥂", keywords: ["champagne", "cheers", "toast", "celebration", "wedding", "new year"] },
  { emoji: "☕", keywords: ["coffee", "cafe", "meeting", "morning", "drink", "break", "tea"] },
  { emoji: "🍽️", keywords: ["dinner", "restaurant", "meal", "food", "dining", "lunch", "eating"] },
  {
    emoji: "🎭",
    keywords: ["theater", "drama", "arts", "performance", "show", "acting", "entertainment"],
  },
  { emoji: "🎪", keywords: ["circus", "event", "entertainment", "show", "carnival", "fair"] },
  {
    emoji: "🎤",
    keywords: ["karaoke", "singing", "microphone", "speaker", "voice", "performance"],
  },

  // Sports & Fitness
  { emoji: "⚽", keywords: ["soccer", "football", "sport", "ball", "game", "team"] },
  { emoji: "🏀", keywords: ["basketball", "sport", "ball", "game", "nba", "team"] },
  { emoji: "🏈", keywords: ["football", "american football", "sport", "nfl", "game", "team"] },
  { emoji: "⚾", keywords: ["baseball", "sport", "ball", "game", "mlb", "team"] },
  { emoji: "🎾", keywords: ["tennis", "sport", "ball", "game", "racket"] },
  { emoji: "🏐", keywords: ["volleyball", "sport", "ball", "game", "beach", "team"] },
  { emoji: "🏉", keywords: ["rugby", "sport", "ball", "game", "team"] },
  { emoji: "🎱", keywords: ["pool", "billiards", "8ball", "game", "bar"] },
  { emoji: "🏓", keywords: ["ping pong", "table tennis", "sport", "game"] },
  { emoji: "🏸", keywords: ["badminton", "sport", "racket", "game"] },
  { emoji: "🥊", keywords: ["boxing", "sport", "fight", "mma", "fitness", "gym"] },
  { emoji: "🏋️", keywords: ["gym", "fitness", "workout", "exercise", "weightlifting", "training"] },
  { emoji: "🚴", keywords: ["cycling", "bike", "bicycle", "sport", "exercise", "fitness"] },
  { emoji: "🏃", keywords: ["running", "jogging", "exercise", "marathon", "fitness", "sport"] },
  { emoji: "🧘", keywords: ["yoga", "meditation", "wellness", "relax", "fitness", "zen"] },

  // Travel & Places
  { emoji: "✈️", keywords: ["travel", "airplane", "flight", "vacation", "trip", "plane"] },
  { emoji: "🚗", keywords: ["car", "drive", "road trip", "travel", "vehicle", "commute"] },
  { emoji: "🚀", keywords: ["rocket", "space", "launch", "startup", "fast", "technology"] },
  { emoji: "🏖️", keywords: ["beach", "vacation", "holiday", "summer", "travel", "relax"] },
  { emoji: "🏔️", keywords: ["mountain", "hiking", "nature", "adventure", "travel", "climbing"] },
  { emoji: "🏕️", keywords: ["camping", "outdoors", "nature", "adventure", "tent", "travel"] },
  {
    emoji: "🌍",
    keywords: ["world", "earth", "globe", "international", "travel", "europe", "africa"],
  },
  { emoji: "🌎", keywords: ["world", "earth", "globe", "americas", "travel", "international"] },
  {
    emoji: "🌏",
    keywords: ["world", "earth", "globe", "asia", "australia", "travel", "international"],
  },
  { emoji: "🗺️", keywords: ["map", "travel", "world", "geography", "explore", "adventure"] },
  {
    emoji: "🧭",
    keywords: ["compass", "navigation", "travel", "direction", "explore", "adventure"],
  },
  { emoji: "🏠", keywords: ["home", "house", "family", "residence", "neighborhood"] },
  { emoji: "🏡", keywords: ["home", "house", "garden", "family", "residence", "suburban"] },

  // Nature & Animals
  { emoji: "🌸", keywords: ["flower", "spring", "cherry blossom", "nature", "beautiful", "pink"] },
  { emoji: "🌺", keywords: ["flower", "hibiscus", "tropical", "nature", "beautiful", "hawaii"] },
  { emoji: "🌻", keywords: ["sunflower", "flower", "summer", "nature", "yellow", "happy"] },
  { emoji: "🌹", keywords: ["rose", "flower", "love", "romantic", "valentine", "beautiful"] },
  { emoji: "🌷", keywords: ["tulip", "flower", "spring", "nature", "beautiful", "garden"] },
  { emoji: "🌱", keywords: ["plant", "growing", "nature", "seedling", "new", "beginning", "eco"] },
  { emoji: "🌿", keywords: ["plant", "herb", "nature", "green", "garden", "eco"] },
  { emoji: "🍀", keywords: ["clover", "luck", "lucky", "irish", "nature", "green"] },
  { emoji: "🌳", keywords: ["tree", "nature", "forest", "environment", "green", "eco"] },
  { emoji: "🌴", keywords: ["palm tree", "tropical", "beach", "vacation", "summer", "island"] },
  { emoji: "🐕", keywords: ["dog", "pet", "animal", "puppy", "cute", "friend"] },
  { emoji: "🐈", keywords: ["cat", "pet", "animal", "kitten", "cute", "feline"] },
  {
    emoji: "🦋",
    keywords: ["butterfly", "nature", "insect", "beautiful", "spring", "transformation"],
  },

  // Food & Drink
  { emoji: "🍕", keywords: ["pizza", "food", "italian", "dinner", "party", "fast food"] },
  { emoji: "🍔", keywords: ["burger", "food", "fast food", "lunch", "dinner", "american"] },
  { emoji: "🍟", keywords: ["fries", "food", "fast food", "snack", "lunch"] },
  { emoji: "🌮", keywords: ["taco", "mexican", "food", "dinner", "lunch"] },
  { emoji: "🍜", keywords: ["noodles", "ramen", "asian", "food", "dinner", "soup"] },
  { emoji: "🍣", keywords: ["sushi", "japanese", "food", "dinner", "seafood", "fish"] },
  { emoji: "🍰", keywords: ["cake", "dessert", "birthday", "sweet", "celebration"] },
  { emoji: "🍩", keywords: ["donut", "dessert", "sweet", "snack", "breakfast"] },
  { emoji: "🍪", keywords: ["cookie", "dessert", "sweet", "snack", "baking"] },
  { emoji: "🍎", keywords: ["apple", "fruit", "healthy", "food", "snack", "red"] },
  { emoji: "🍊", keywords: ["orange", "fruit", "healthy", "food", "citrus"] },
  { emoji: "🍋", keywords: ["lemon", "fruit", "citrus", "sour", "yellow"] },
  { emoji: "🥗", keywords: ["salad", "healthy", "food", "vegetarian", "diet", "lunch"] },

  // Activities & Hobbies
  {
    emoji: "📚",
    keywords: ["books", "reading", "study", "education", "library", "learning", "school"],
  },
  {
    emoji: "🎮",
    keywords: ["gaming", "video games", "controller", "play", "entertainment", "fun"],
  },
  {
    emoji: "🎨",
    keywords: ["art", "painting", "creative", "design", "artist", "drawing", "palette"],
  },
  { emoji: "🎬", keywords: ["movie", "film", "cinema", "entertainment", "video", "hollywood"] },
  { emoji: "🎵", keywords: ["music", "song", "audio", "sound", "melody", "playlist"] },
  { emoji: "🎸", keywords: ["guitar", "music", "rock", "band", "instrument", "musician"] },
  { emoji: "🎹", keywords: ["piano", "music", "keyboard", "instrument", "classical", "musician"] },
  { emoji: "📷", keywords: ["camera", "photo", "photography", "picture", "memories", "instagram"] },
  { emoji: "🎯", keywords: ["target", "goal", "aim", "focus", "bullseye", "darts"] },
  { emoji: "🧩", keywords: ["puzzle", "game", "hobby", "challenge", "brain", "problem solving"] },
  { emoji: "♟️", keywords: ["chess", "strategy", "game", "board game", "thinking"] },
  { emoji: "🎲", keywords: ["dice", "game", "gambling", "luck", "board game", "casino"] },
  { emoji: "🪁", keywords: ["kite", "outdoor", "fun", "wind", "hobby", "play"] },

  // Symbols & Hearts
  { emoji: "❤️", keywords: ["heart", "love", "red", "favorite", "like", "romantic", "valentine"] },
  { emoji: "💙", keywords: ["heart", "blue", "love", "favorite", "calm", "trust"] },
  { emoji: "💚", keywords: ["heart", "green", "love", "nature", "eco", "health"] },
  { emoji: "💛", keywords: ["heart", "yellow", "love", "friendship", "happy", "sunny"] },
  { emoji: "💜", keywords: ["heart", "purple", "love", "favorite", "royal", "spiritual"] },
  { emoji: "🧡", keywords: ["heart", "orange", "love", "warm", "energy", "enthusiasm"] },
  { emoji: "🖤", keywords: ["heart", "black", "love", "dark", "goth", "elegant"] },
  { emoji: "🤍", keywords: ["heart", "white", "love", "pure", "clean", "peace"] },
  { emoji: "⭐", keywords: ["star", "favorite", "rating", "important", "vip", "special"] },
  { emoji: "🌟", keywords: ["star", "glowing", "special", "sparkle", "talent", "shine"] },
  { emoji: "✨", keywords: ["sparkle", "magic", "shine", "new", "special", "clean"] },
  { emoji: "💫", keywords: ["dizzy", "star", "magic", "sparkle", "amazing", "wow"] },
  { emoji: "🔥", keywords: ["fire", "hot", "popular", "trending", "lit", "flame", "awesome"] },

  // Objects & Tech
  { emoji: "📱", keywords: ["phone", "mobile", "smartphone", "call", "contact", "device"] },
  {
    emoji: "💡",
    keywords: ["idea", "light", "bulb", "innovation", "bright", "creative", "thinking"],
  },
  { emoji: "🔑", keywords: ["key", "important", "access", "security", "unlock", "secret"] },
  { emoji: "🔒", keywords: ["lock", "security", "private", "safe", "password", "protected"] },
  { emoji: "📦", keywords: ["box", "package", "delivery", "shipping", "moving", "storage"] },
  { emoji: "🎒", keywords: ["backpack", "school", "travel", "bag", "student", "hiking"] },
  { emoji: "👓", keywords: ["glasses", "reading", "smart", "vision", "nerdy", "intellectual"] },
  { emoji: "🕶️", keywords: ["sunglasses", "cool", "summer", "fashion", "celebrity", "style"] },
  {
    emoji: "💎",
    keywords: ["diamond", "gem", "luxury", "precious", "valuable", "rich", "sparkle"],
  },
  {
    emoji: "🏆",
    keywords: ["trophy", "winner", "champion", "award", "success", "achievement", "first"],
  },
  { emoji: "🥇", keywords: ["gold", "medal", "first", "winner", "champion", "best", "award"] },
  { emoji: "🎖️", keywords: ["medal", "military", "honor", "award", "achievement", "veteran"] },
  { emoji: "🏅", keywords: ["medal", "sports", "award", "achievement", "winner", "competition"] },

  // More categories
  {
    emoji: "🎓",
    keywords: ["graduation", "education", "school", "university", "degree", "student", "cap"],
  },
  { emoji: "💒", keywords: ["wedding", "church", "marriage", "love", "ceremony", "chapel"] },
  { emoji: "💍", keywords: ["ring", "wedding", "engagement", "marriage", "diamond", "proposal"] },
  { emoji: "👶", keywords: ["baby", "child", "newborn", "family", "infant", "cute"] },
  { emoji: "🏥", keywords: ["hospital", "medical", "health", "doctor", "emergency", "clinic"] },
  { emoji: "🏫", keywords: ["school", "education", "building", "learning", "students"] },
  { emoji: "🏛️", keywords: ["government", "museum", "classical", "building", "historic", "law"] },
  { emoji: "⛪", keywords: ["church", "religion", "christian", "faith", "worship", "spiritual"] },
  { emoji: "🕌", keywords: ["mosque", "islam", "religion", "faith", "worship", "muslim"] },
  { emoji: "🛕", keywords: ["temple", "hindu", "religion", "faith", "worship", "india"] },
  { emoji: "🕍", keywords: ["synagogue", "jewish", "religion", "faith", "worship"] },
  {
    emoji: "🤝",
    keywords: ["handshake", "deal", "agreement", "partnership", "meeting", "business"],
  },
  { emoji: "👋", keywords: ["wave", "hello", "goodbye", "greeting", "hi", "bye"] },
  { emoji: "🙏", keywords: ["pray", "thanks", "please", "hope", "namaste", "grateful"] },
  { emoji: "💪", keywords: ["strong", "muscle", "power", "strength", "gym", "workout", "fitness"] },
  { emoji: "🧠", keywords: ["brain", "smart", "thinking", "intelligence", "mind", "idea"] },
  { emoji: "👑", keywords: ["crown", "king", "queen", "royal", "leader", "vip", "best"] },
  { emoji: "🎩", keywords: ["hat", "formal", "gentleman", "magic", "fancy", "classy"] },
  { emoji: "📅", keywords: ["calendar", "date", "schedule", "event", "appointment", "planning"] },
  { emoji: "⏰", keywords: ["alarm", "clock", "time", "reminder", "wake up", "schedule"] },
  { emoji: "🔔", keywords: ["bell", "notification", "alert", "reminder", "ring", "attention"] },
  { emoji: "📧", keywords: ["email", "mail", "message", "contact", "letter", "inbox"] },
  { emoji: "💬", keywords: ["chat", "message", "talk", "conversation", "speech", "comment"] },
  { emoji: "🏃‍♂️", keywords: ["running", "exercise", "fitness", "marathon", "jogging", "sport"] },
  { emoji: "🎄", keywords: ["christmas", "tree", "holiday", "winter", "december", "festive"] },
  { emoji: "🎃", keywords: ["halloween", "pumpkin", "october", "scary", "autumn", "spooky"] },
  { emoji: "🐰", keywords: ["rabbit", "bunny", "easter", "cute", "pet", "animal"] },
  { emoji: "🦃", keywords: ["turkey", "thanksgiving", "holiday", "november", "bird"] },
  {
    emoji: "🌈",
    keywords: ["rainbow", "colorful", "pride", "lgbtq", "happy", "beautiful", "weather"],
  },
  { emoji: "☀️", keywords: ["sun", "sunny", "weather", "summer", "bright", "day", "hot"] },
  { emoji: "🌙", keywords: ["moon", "night", "sleep", "dream", "evening", "dark"] },
  { emoji: "⛈️", keywords: ["storm", "weather", "rain", "thunder", "lightning", "bad weather"] },
  { emoji: "❄️", keywords: ["snow", "winter", "cold", "frozen", "christmas", "ice"] },
  {
    emoji: "🏋️‍♀️",
    keywords: ["gym", "fitness", "workout", "exercise", "weightlifting", "training", "woman"],
  },
  {
    emoji: "🧗",
    keywords: ["climbing", "rock climbing", "adventure", "sport", "fitness", "outdoor"],
  },
  { emoji: "🏊", keywords: ["swimming", "pool", "sport", "exercise", "water", "fitness"] },
  { emoji: "🎿", keywords: ["skiing", "winter", "snow", "sport", "mountain", "vacation"] },
  { emoji: "🏄", keywords: ["surfing", "beach", "ocean", "sport", "summer", "waves"] },
];

const BASE_CATEGORY_RANGES: Array<{
  name: Exclude<EmojiCategoryName, "Animals" | "Buildings">;
  start: number;
  end: number;
}> = [
  { name: "Humans", start: 0, end: 13 },
  { name: "Work", start: 13, end: 26 },
  { name: "Celebrations", start: 26, end: 39 },
  { name: "Sports", start: 39, end: 51 },
  { name: "Travel", start: 51, end: 64 },
  { name: "Nature", start: 64, end: 77 },
  { name: "Food", start: 77, end: 90 },
  { name: "Activities", start: 90, end: 102 },
  { name: "Hearts", start: 102, end: 110 },
  { name: "Objects", start: 110, end: 122 },
  { name: "Miscellaneous", start: 122, end: EMOJI_LIST.length },
];

const CATEGORY_OVERRIDES: Record<string, EmojiCategoryName> = {
  "🐕": "Animals",
  "🐈": "Animals",
  "🦋": "Animals",
  "🐰": "Animals",
  "🦃": "Animals",

  "🏢": "Buildings",
  "🏠": "Buildings",
  "🏡": "Buildings",
  "💒": "Buildings",
  "🏥": "Buildings",
  "🏫": "Buildings",
  "🏛️": "Buildings",
  "⛪": "Buildings",
  "🕌": "Buildings",
  "🛕": "Buildings",
  "🕍": "Buildings",

  "🌸": "Nature",
  "🌺": "Nature",
  "🌻": "Nature",
  "🌹": "Nature",
  "🌷": "Nature",
  "🌱": "Nature",
  "🌿": "Nature",
  "🍀": "Nature",
  "🌳": "Nature",
  "🌴": "Nature",
  "🌈": "Nature",
  "☀️": "Nature",
  "🌙": "Nature",
  "⛈️": "Nature",
  "❄️": "Nature",

  "📅": "Objects",
  "⏰": "Objects",
  "🔔": "Objects",
  "📧": "Objects",
  "💬": "Objects",
  "💍": "Objects",

  "🎄": "Celebrations",
  "🎃": "Celebrations",

  "🏋️‍♀️": "Sports",
  "🧗": "Sports",
  "🏊": "Sports",
  "🎿": "Sports",
  "🏄": "Sports",

  "🎓": "Humans",
  "🤝": "Humans",
  "👋": "Humans",
  "🙏": "Humans",
  "💪": "Humans",
  "🧠": "Humans",
};

const CATEGORY_ORDER: EmojiCategoryName[] = [
  "Humans",
  "Work",
  "Celebrations",
  "Sports",
  "Travel",
  "Animals",
  "Buildings",
  "Nature",
  "Food",
  "Activities",
  "Hearts",
  "Objects",
  "Miscellaneous",
];

const getBaseCategoryByIndex = (index: number): EmojiCategoryName => {
  const range = BASE_CATEGORY_RANGES.find((item) => index >= item.start && index < item.end);
  return range?.name ?? "Miscellaneous";
};

const grouped = CATEGORY_ORDER.reduce<Record<EmojiCategoryName, EmojiData[]>>(
  (acc, category) => ({ ...acc, [category]: [] }),
  {
    Humans: [],
    Work: [],
    Celebrations: [],
    Sports: [],
    Travel: [],
    Animals: [],
    Buildings: [],
    Nature: [],
    Food: [],
    Activities: [],
    Hearts: [],
    Objects: [],
    Miscellaneous: [],
  },
);

EMOJI_LIST.forEach((emojiData, index) => {
  const overriddenCategory = CATEGORY_OVERRIDES[emojiData.emoji];
  const baseCategory = getBaseCategoryByIndex(index);
  const targetCategory = overriddenCategory ?? baseCategory;

  grouped[targetCategory].push(emojiData);
});

export const EMOJI_CATEGORIES = CATEGORY_ORDER.reduce<Record<string, EmojiData[]>>(
  (acc, category) => {
    const categoryItems = grouped[category];

    if (categoryItems.length > 0) {
      acc[category] = categoryItems;
    }

    return acc;
  },
  {},
);

export const ALL_EMOJIS = EMOJI_LIST.map((item) => item.emoji);

/**
 * Returns a random emoji from the available emoji catalog.
 *
 * @returns A single emoji string selected randomly from `ALL_EMOJIS`.
 */
export function getRandomEmoji(): string {
  return ALL_EMOJIS[Math.floor(Math.random() * ALL_EMOJIS.length)];
}

export type { EmojiData, EmojiCategoryName };
