export type NonfictionWord = {
  word: string;
  pronunciation: string;
  definition: string;
  example: string;
};

export type LatinStemCard = {
  stem: string;
  meaning: string;
  examples: string[];
  explanation: string;
  nonfiction: NonfictionWord;
};

export type ReviewStemCard = {
  stem: string;
  meaning: string;
  examples: string[];
};

export type LatinStemLesson = {
  lesson: number;
  pdfLesson: string;
  displayLesson: string;
  newStems: LatinStemCard[];
  reviewStems: ReviewStemCard[];
};

export const latinStemLessons: Record<number, LatinStemLesson> = {
  1: {
    lesson: 1,
    pdfLesson: "Lesson I",
    displayLesson: "Lesson I",
    newStems: [
      {
        stem: "com",
        meaning: "together",
        examples: ["combine", "complete", "complex"],
        explanation:
          "COM means together. To combine is to put things together; something is complete when it is all together; and something is complex when many parts work together.",
        nonfiction: {
          word: "commandeer",
          pronunciation: "kom-un-DEER",
          definition: "to officially take control of something",
          example:
            "The military commandeers the communication system of a country."
        }
      },
      {
        stem: "intra",
        meaning: "within",
        examples: ["intramural", "intracellular", "intravenous"],
        explanation:
          "INTRA means within. Intramural sports are within a school; intracellular means within a cell; and an intravenous injection puts fluid within a vein.",
        nonfiction: {
          word: "intramural",
          pronunciation: "in-truh-MYOOR-ul",
          definition: "happening within an institution, especially a school",
          example:
            "Intramural events occur within an institution, such as sporting events between fraternities at a university."
        }
      },
      {
        stem: "cent",
        meaning: "one hundred",
        examples: ["century", "centimeter", "centurion"],
        explanation:
          "CENT means one hundred. A century is one hundred years; a centimeter is one hundredth of a meter; and a Roman centurion led a century of soldiers.",
        nonfiction: {
          word: "centennial",
          pronunciation: "sen-TEN-ee-ul",
          definition: "related to a one-hundredth anniversary",
          example:
            "A museum or college might hold a centennial celebration for its one-hundredth anniversary."
        }
      },
      {
        stem: "ad",
        meaning: "to",
        examples: ["adhere", "adapt", "advocate"],
        explanation:
          "AD means to. To adhere is to stick to something; to adapt is to adjust to a situation; and to advocate is to give your voice to a cause.",
        nonfiction: {
          word: "ad infinitum",
          pronunciation: "ad in-fih-NIGH-tum",
          definition: "again and again forever; repeated indefinitely",
          example:
            "A company may have a right to lease a building ad infinitum."
        }
      },
      {
        stem: "fer",
        meaning: "carry",
        examples: ["transfer", "aquifer", "conifer"],
        explanation:
          "FER means carry. To transfer is to carry things across; an aquifer carries water underground; and a conifer carries cones.",
        nonfiction: {
          word: "infer",
          pronunciation: "in-FER",
          definition: "to conclude from evidence",
          example:
            "If you pace and look out the window, I might infer from your actions that you are worried."
        }
      }
    ],
    reviewStems: [
      {
        stem: "bi",
        meaning: "two",
        examples: ["binocular", "bilingual", "binary"]
      },
      {
        stem: "sub",
        meaning: "under",
        examples: ["subterranean", "subordinate", "submit"]
      },
      {
        stem: "de",
        meaning: "down",
        examples: ["deduct", "demolish", "denounce"]
      },
      {
        stem: "pre",
        meaning: "before",
        examples: ["preposition", "precede", "predecessor"]
      },
      {
        stem: "super",
        meaning: "over",
        examples: ["superfluous", "supernatural", "supercilious"]
      }
    ]
  },
  2: {
    lesson: 2,
    pdfLesson: "Lesson III",
    displayLesson: "Lesson II",
    newStems: [
      {
        stem: "vita",
        meaning: "life",
        examples: ["vital", "vitamin", "revitalize"],
        explanation:
          "VITA means life. Something vital is full of life, vitamins keep us alive, and to revitalize a place is to bring it back to life.",
        nonfiction: {
          word: "vitality",
          pronunciation: "vie-TAL-ih-tee",
          definition: "strength, energy",
          example:
            "Seeds are said to have vitality, and a dynamic person can have vitality."
        }
      },
      {
        stem: "vid",
        meaning: "look",
        examples: ["video", "evidence", "provide"],
        explanation:
          "VID means look. We look at videos, evidence is brought out to look at, and to provide is to look forward.",
        nonfiction: {
          word: "videlicet",
          pronunciation: "vih-DEL-ih-set",
          definition: "namely; that is; for example",
          example:
            "We might say that Rome was overrun by the armies of a barbarian, viz., Alaric."
        }
      },
      {
        stem: "pater",
        meaning: "father",
        examples: ["paternal", "patriarch", "expatriate"],
        explanation:
          "PATER means father. Paternal behavior is fatherly, a patriarch is the male head of a family, and an expatriate lives outside the fatherland.",
        nonfiction: {
          word: "paternal",
          pronunciation: "puh-TER-nul",
          definition: "of the father",
          example:
            "Charlotte Bronte wrote, \"I am not writing to flatter paternal egotism.\""
        }
      },
      {
        stem: "matri",
        meaning: "mother",
        examples: ["maternal", "matriarch", "matrimony"],
        explanation:
          "MATRI means mother. Maternal means motherly, a matriarch is a female head of the family, and matrimony is marriage.",
        nonfiction: {
          word: "matriarch",
          pronunciation: "MAY-tree-ark",
          definition: "a female head of a family or tribe",
          example:
            "We sometimes use matriarch to describe a woman who has great power."
        }
      },
      {
        stem: "pop",
        meaning: "people",
        examples: ["popular", "population", "populous"],
        explanation:
          "POP means people. You are popular when people like you, the population is the people, and a populous region is full of people.",
        nonfiction: {
          word: "populous",
          pronunciation: "POP-yuh-lus",
          definition: "densely populated",
          example: "In Caesar's time, some regions of Gaul were populous."
        }
      }
    ],
    reviewStems: [
      { stem: "un", meaning: "not", examples: ["unfit", "unclear", "unequaled"] },
      { stem: "inter", meaning: "between", examples: ["interstate", "intermediary", "interface"] },
      { stem: "semi", meaning: "half", examples: ["semitone", "semilucid", "semicircle"] },
      { stem: "dis", meaning: "away", examples: ["dispute", "dissonant", "dissuade"] },
      { stem: "sym", meaning: "together", examples: ["symbol", "symposium", "symbiosis"] }
    ]
  },
  3: {
    lesson: 3,
    pdfLesson: "Lesson V",
    displayLesson: "Lesson III",
    newStems: [
      {
        stem: "loco",
        meaning: "place",
        examples: ["locomotive", "location", "dislocate"],
        explanation:
          "LOCO means place. Locomotives move from place to place, a location is a place, and to dislocate something is to put it out of place.",
        nonfiction: {
          word: "localized",
          pronunciation: "LOH-kuh-lized",
          definition: "restricted to a place",
          example:
            "The effect of a disease might be localized to a small area of a country."
        }
      },
      {
        stem: "sur",
        meaning: "over",
        examples: ["surface", "surrealist", "surfeit"],
        explanation:
          "SUR means over. The surface of the sea is over the rest, a surrealist goes beyond ordinary reality, and a surfeit is an excess.",
        nonfiction: {
          word: "surfeit",
          pronunciation: "SUR-fit",
          definition: "an excessive amount; too much",
          example:
            "In Ivanhoe, Sir Walter Scott wrote that his death was occasioned by a surfeit upon peaches and new ale."
        }
      },
      {
        stem: "alter",
        meaning: "other",
        examples: ["alteration", "alternative", "altruism"],
        explanation:
          "ALTER means other. An alteration makes something other than it was, an alternative is another option, and altruism is thinking of others.",
        nonfiction: {
          word: "altercation",
          pronunciation: "awl-ter-KAY-shun",
          definition: "a noisy argument",
          example:
            "The guns suddenly involved themselves in a hideous altercation with another band of guns."
        }
      },
      {
        stem: "contra",
        meaning: "against",
        examples: ["contradict", "contrast", "contrary"],
        explanation:
          "CONTRA means against. To contradict is to speak against what someone said, and to be contrary is to go against what is desired.",
        nonfiction: {
          word: "contrary",
          pronunciation: "KON-trair-ee",
          definition: "the opposite",
          example:
            "We make an argument, and our opponent claims the contrary."
        }
      },
      {
        stem: "stell",
        meaning: "star",
        examples: ["stellar", "constellation", "interstellar"],
        explanation:
          "STELL means star. Stellar means star-like, a constellation is a group of stars, and interstellar space is between the stars.",
        nonfiction: {
          word: "stellar",
          pronunciation: "STEL-er",
          definition: "of a star; excellent",
          example: "Your business can receive stellar ratings."
        }
      }
    ],
    reviewStems: [
      { stem: "circum", meaning: "around", examples: ["circus", "circumpolar", "circumlocution"] },
      { stem: "mal", meaning: "bad", examples: ["malcontent", "malign", "malapropism"] },
      { stem: "post", meaning: "after", examples: ["postgraduate", "posterior", "postlude"] },
      { stem: "equi", meaning: "equal", examples: ["equation", "equinox", "equitable"] },
      { stem: "ante", meaning: "before", examples: ["antedate", "ante meridiem", "antepenult"] }
    ]
  },
  4: {
    lesson: 4,
    pdfLesson: "Lesson VII",
    displayLesson: "Lesson IV",
    newStems: [
      {
        stem: "amat",
        meaning: "love",
        examples: ["amorous", "amateur", "amity"],
        explanation:
          "AMAT means love. Amorous feeling is full of love, an amateur loves an activity, and amity is loving friendship.",
        nonfiction: {
          word: "amatory",
          pronunciation: "AM-uh-tor-ee",
          definition: "romantic",
          example:
            "In The Mayor of Casterbridge, Thomas Hardy wrote of a man in his amatory rage."
        }
      },
      {
        stem: "luna",
        meaning: "moon",
        examples: ["lunar", "lunatic", "sublunar"],
        explanation:
          "LUNA means moon. A lunar landing is on the moon, and sublunar refers to things under the moon.",
        nonfiction: {
          word: "sublunar",
          pronunciation: "sub-LOO-ner",
          definition: "under the moon",
          example:
            "Jonathan Swift wrote that a celestial phenomenon had been pressed into sublunary service as a lover's signal."
        }
      },
      {
        stem: "greg",
        meaning: "group",
        examples: ["congregate", "segregate", "gregarious"],
        explanation:
          "GREG means group. To congregate is to group together, to segregate is to pull a group apart, and gregarious means group-loving.",
        nonfiction: {
          word: "aggregate",
          pronunciation: "AG-ri-gut",
          definition: "a collected mass",
          example:
            "Veteran regiments in the army were likely to be very small aggregations of men."
        }
      },
      {
        stem: "clam",
        meaning: "cry out",
        examples: ["clamor", "exclamation", "declaim"],
        explanation:
          "CLAM means cry out. A clamor is a great outcry, an exclamation is a loud cry, and to declaim is to make a noisy speech.",
        nonfiction: {
          word: "declaim",
          pronunciation: "dih-KLAYM",
          definition: "to speak passionately against something",
          example:
            "In Hard Times, Charles Dickens wrote that he had declaimed himself into a violent heat."
        }
      },
      {
        stem: "tang",
        meaning: "touch",
        examples: ["tangle", "tangent", "intangible"],
        explanation:
          "TANG means touch. A tangle is a knot of things touching, a tangent touches a circle, and intangible things cannot be touched.",
        nonfiction: {
          word: "entangled",
          pronunciation: "en-TANG-guld",
          definition: "snared, trapped, or involved",
          example: "People become entangled in conspiracies."
        }
      }
    ],
    reviewStems: [
      { stem: "aqua", meaning: "water", examples: ["aquifer", "aquaplane", "semiaquatic"] },
      { stem: "audi", meaning: "hear", examples: ["audition", "audiology", "audit"] },
      { stem: "scrib", meaning: "write", examples: ["transcribe", "scribble", "ascribe"] },
      { stem: "cede", meaning: "go", examples: ["antecedent", "concede", "intercede"] },
      { stem: "cise", meaning: "cut", examples: ["precise", "concise", "decisive"] }
    ]
  },
  5: {
    lesson: 5,
    pdfLesson: "Lesson IX",
    displayLesson: "Lesson V",
    newStems: [
      {
        stem: "mar",
        meaning: "sea",
        examples: ["marine", "maritime", "mariner"],
        explanation:
          "MAR means sea. The marine environment is the sea, maritime regulations govern ships, and a mariner is a sailor.",
        nonfiction: {
          word: "mariner",
          pronunciation: "MAIR-ih-ner",
          definition: "a sailor",
          example: "Samuel Taylor Coleridge wrote The Rime of the Ancient Mariner."
        }
      },
      {
        stem: "junct",
        meaning: "join",
        examples: ["conjunction", "junction", "adjunct"],
        explanation:
          "JUNCT means join. A conjunction joins words, a junction is where roads join, and an adjunct is joined as an added part.",
        nonfiction: {
          word: "adjunct",
          pronunciation: "AJ-ungkt",
          definition: "an unessential addition",
          example:
            "Walt Whitman mentioned the earth good and the stars good, and their adjuncts all good."
        }
      },
      {
        stem: "luc",
        meaning: "light",
        examples: ["lucidity", "translucent", "pellucid"],
        explanation:
          "LUC means light. Lucidity is brightness, translucent things let some light through, and pellucid waters are clear.",
        nonfiction: {
          word: "elucidate",
          pronunciation: "ih-LOO-sih-date",
          definition: "to explain or clarify",
          example:
            "Herman Melville wrote that two statements may be elucidated by the following examples."
        }
      },
      {
        stem: "medi",
        meaning: "middle",
        examples: ["medium", "Mediterranean", "in medias res"],
        explanation:
          "MEDI means middle. The medium is the middle, and in medias res means beginning in the middle of the story.",
        nonfiction: {
          word: "mediate",
          pronunciation: "MEE-dee-ate",
          definition: "to intervene in a dispute",
          example:
            "In David Copperfield, a character attempts to mediate between them."
        }
      },
      {
        stem: "tempor",
        meaning: "time",
        examples: ["temporal", "temporize", "contemporary"],
        explanation:
          "TEMPOR means time. Temporal beings are bounded by time, to temporize is to delay, and contemporaries live at the same time.",
        nonfiction: {
          word: "temporize",
          pronunciation: "TEM-puh-rize",
          definition: "to delay; to stall for time",
          example:
            "In Lost Horizon, James Hilton wrote that Miss Brinklow was in no mood to temporize."
        }
      }
    ],
    reviewStems: [
      { stem: "cred", meaning: "believe", examples: ["credulous", "credit", "discredit"] },
      { stem: "miss", meaning: "send", examples: ["missionary", "missile", "admission"] },
      { stem: "cide", meaning: "kill", examples: ["genocide", "herbicide", "fungicide"] },
      { stem: "dict", meaning: "say", examples: ["predict", "dictionary", "interdict"] },
      { stem: "bell", meaning: "war", examples: ["rebel", "belligerence", "casus belli"] }
    ]
  },
  6: {
    lesson: 6,
    pdfLesson: "Lesson XI",
    displayLesson: "Lesson VI",
    newStems: [
      {
        stem: "grat",
        meaning: "pleasing",
        examples: ["gratification", "ingratiate", "gratuitous"],
        explanation:
          "GRAT means pleasing. Gratification is being pleased, and to ingratiate yourself is to try to please others.",
        nonfiction: {
          word: "gratuitous",
          pronunciation: "gruh-TOO-ih-tus",
          definition: "uncalled for; unfounded; unmerited",
          example:
            "Henry David Thoreau wrote that we should feed and clothe him gratuitously sometimes."
        }
      },
      {
        stem: "curr",
        meaning: "run",
        examples: ["current", "recur", "incur"],
        explanation:
          "CURR means run. A current runs in a stream, something recurs when it happens again, and to incur costs is to run into them.",
        nonfiction: {
          word: "concur",
          pronunciation: "kun-KER",
          definition: "to agree; to happen at the same time",
          example:
            "In David Copperfield, Dickens wrote that it could not be done without Mr. Mills's sanction and concurrence."
        }
      },
      {
        stem: "trans",
        meaning: "across",
        examples: ["transfer", "transfusion", "transcendent"],
        explanation:
          "TRANS means across. To transfer is to move things across, and transcendent things cross beyond ordinary limits.",
        nonfiction: {
          word: "transcend",
          pronunciation: "tran-SEND",
          definition: "to go beyond limits",
          example:
            "E. M. Forster described the Lord of the Universe, who transcends human processes."
        }
      },
      {
        stem: "migr",
        meaning: "wander",
        examples: ["migrate", "migratory", "transmigration"],
        explanation:
          "MIGR means wander. To migrate is to wander to a new place, and migratory birds move seasonally.",
        nonfiction: {
          word: "migratory",
          pronunciation: "MY-gruh-tor-ee",
          definition: "moving seasonally",
          example:
            "His thoughts slowly migrated to his dreams of being a writer."
        }
      },
      {
        stem: "rupt",
        meaning: "break",
        examples: ["abrupt", "corrupt", "disrupt"],
        explanation:
          "RUPT means break. An abrupt change is a sharp break, corruption is broken morals, and to disrupt is to break up an event.",
        nonfiction: {
          word: "disruption",
          pronunciation: "dis-RUP-shun",
          definition: "a disturbing interruption",
          example:
            "A clamorous spectator might cause a disruption in court proceedings."
        }
      }
    ],
    reviewStems: [
      { stem: "spec", meaning: "look", examples: ["specter", "specious", "spectrum"] },
      { stem: "pend", meaning: "hang", examples: ["pending", "impending", "depend"] },
      { stem: "omni", meaning: "all", examples: ["omnipotent", "omnivorous", "omniscient"] },
      { stem: "re", meaning: "again", examples: ["reiterate", "regurgitate", "revive"] },
      { stem: "ex", meaning: "out", examples: ["exculpate", "exorbitant", "except"] }
    ]
  },
  7: {
    lesson: 7,
    pdfLesson: "Lesson XIII",
    displayLesson: "Lesson VII",
    newStems: [
      {
        stem: "clud",
        meaning: "close",
        examples: ["exclude", "included", "preclude"],
        explanation:
          "CLUD means close. To exclude is to close out, to be included is to be admitted, and to preclude is to close off a possibility.",
        nonfiction: {
          word: "preclude",
          pronunciation: "pree-KLOOD",
          definition: "to prevent from happening",
          example:
            "In Ethan Frome, Edith Wharton wrote that relief was so great as to preclude all other feelings."
        }
      },
      {
        stem: "se",
        meaning: "apart",
        examples: ["separate", "secede", "sedition"],
        explanation:
          "SE means apart. To separate is to put apart, to secede is to go apart, and sedition pulls people apart from the government.",
        nonfiction: {
          word: "seclude",
          pronunciation: "sih-KLOOD",
          definition: "to isolate from people",
          example:
            "Famous scholars often seclude themselves for years in order to write and research."
        }
      },
      {
        stem: "plu",
        meaning: "more",
        examples: ["plus", "pluralism", "nonplussed"],
        explanation:
          "PLU means more. A plus adds more, pluralism includes many groups, and nonplussed suggests being overwhelmed by too much.",
        nonfiction: {
          word: "nonplussed",
          pronunciation: "non-PLUST",
          definition: "surprised and confused",
          example:
            "In Moby Dick, a character is completely nonplussed and confounded about the stranger."
        }
      },
      {
        stem: "germ",
        meaning: "vital",
        examples: ["germ", "germinate", "germane"],
        explanation:
          "GERM means vital. A germ is a living organism, to germinate is to grow, and a germane idea is vital to the conversation.",
        nonfiction: {
          word: "germane",
          pronunciation: "jer-MAYN",
          definition: "relevant to the topic",
          example:
            "In Billy Budd, Herman Melville wrote that nothing especially germane to the story occurred."
        }
      },
      {
        stem: "fus",
        meaning: "pour",
        examples: ["transfusion", "infusion", "fusillade"],
        explanation:
          "FUS means pour. In transfusion, blood pours across; in infusion, ideas pour in; and a fusillade is an outpouring of gunfire.",
        nonfiction: {
          word: "infusion",
          pronunciation: "in-FYOO-zhun",
          definition: "an inpouring of a new element",
          example:
            "Kate Chopin wrote of a small infusion of French, which seemed to have been lost in dilution."
        }
      }
    ],
    reviewStems: [
      { stem: "bene", meaning: "good", examples: ["beneficial", "benevolent", "benign"] },
      { stem: "son", meaning: "sound", examples: ["consonant", "resonant", "assonance"] },
      { stem: "nov", meaning: "new", examples: ["innovate", "renovate", "nova"] },
      { stem: "sangui", meaning: "blood", examples: ["sanguine", "sanguinary", "consanguinity"] },
      { stem: "cogn", meaning: "know", examples: ["recognize", "cognomen", "precognition"] }
    ]
  },
  8: {
    lesson: 8,
    pdfLesson: "Lesson XV",
    displayLesson: "Lesson VIII",
    newStems: [
      {
        stem: "culp",
        meaning: "blame",
        examples: ["culprit", "culpable", "exculpate"],
        explanation:
          "CULP means blame. We blame the culprit, culpable means guilty, and to exculpate someone is to free that person from blame.",
        nonfiction: {
          word: "exculpate",
          pronunciation: "EK-skul-pate",
          definition: "to free from blame",
          example:
            "In Ivanhoe, Sir Walter Scott wrote that Gurth attempted no exculpation."
        }
      },
      {
        stem: "pugn",
        meaning: "fight",
        examples: ["pugnacious", "pugilist", "oppugn"],
        explanation:
          "PUGN means fight. A pugnacious person is combative, a pugilist is a fighter, and to oppugn something is to attack or resist it.",
        nonfiction: {
          word: "impugn",
          pronunciation: "im-PYOON",
          definition: "to dispute the truth of a statement",
          example:
            "In Ivanhoe, Sir Walter Scott wrote of those who impugn our authority."
        }
      },
      {
        stem: "urb",
        meaning: "city",
        examples: ["urban", "suburb", "urbane"],
        explanation:
          "URB means city. Urban means city-like, suburbs are neighborhoods around the city, and an urbane person is refined and citified.",
        nonfiction: {
          word: "urbane",
          pronunciation: "ur-BAYN",
          definition: "refined, courteous, and cosmopolitan",
          example:
            "In The American, Henry James wrote that he was determined to seem even more urbane than usual."
        }
      },
      {
        stem: "numer",
        meaning: "number",
        examples: ["numeral", "enumerate", "supernumerary"],
        explanation:
          "NUMER means number. A numeral is a number, to enumerate is to list, and supernumerary people are extra.",
        nonfiction: {
          word: "enumerate",
          pronunciation: "ih-NOO-muh-rate",
          definition: "to list; to mention one by one",
          example:
            "Benjamin Franklin mentioned several points of complaint which he enumerated."
        }
      },
      {
        stem: "acr",
        meaning: "sharp",
        examples: ["acrid", "acerbity", "acrimony"],
        explanation:
          "ACR means sharp. An acrid smell is sharp, acerbity is sharpness of temper, and acrimony is a sharp dispute.",
        nonfiction: {
          word: "acrimony",
          pronunciation: "AK-ri-moh-nee",
          definition: "bitterness; hard feelings",
          example:
            "In The House of the Seven Gables, Hawthorne wrote that her responses were little short of acrimonious."
        }
      }
    ],
    reviewStems: [
      { stem: "ject", meaning: "throw", examples: ["subject", "dejected", "interjection"] },
      { stem: "dorm", meaning: "sleep", examples: ["dormancy", "dormitive", "dormient"] },
      { stem: "magn", meaning: "great", examples: ["Magna Carta", "magnum opus", "magnanimous"] },
      { stem: "ver", meaning: "true", examples: ["aver", "verisimilitude", "verdical"] },
      { stem: "put", meaning: "think", examples: ["impute", "computer", "dispute"] }
    ]
  },
  9: {
    lesson: 9,
    pdfLesson: "Lesson XVII",
    displayLesson: "Lesson IX",
    newStems: [
      {
        stem: "per",
        meaning: "through",
        examples: ["percolate", "peregrinate", "perspicacity"],
        explanation:
          "PER means through. To percolate is to bubble through, to peregrinate is to wander through, and perspicacity sees through complications.",
        nonfiction: {
          word: "perspicacity",
          pronunciation: "per-spih-KAS-ih-tee",
          definition: "keen insight",
          example:
            "Henry James described an eagerness which might have made a perspicacious observer smile."
        }
      },
      {
        stem: "anim",
        meaning: "mind",
        examples: ["animal", "animadversion", "magnanimous"],
        explanation:
          "ANIM means mind. Animals have minds, animadversion is criticism, and magnanimous means great-minded and generous.",
        nonfiction: {
          word: "magnanimous",
          pronunciation: "mag-NAN-ih-mus",
          definition: "generous or forgiving",
          example:
            "In Jude the Obscure, Thomas Hardy wrote that he has magnanimously agreed to forgive all."
        }
      },
      {
        stem: "tort",
        meaning: "twist",
        examples: ["torturous", "tortuous", "retort"],
        explanation:
          "TORT means twist. Torture is named for twisting, a tortuous road twists and winds, and a retort twists a reply back.",
        nonfiction: {
          word: "tortuous",
          pronunciation: "TOR-choo-us",
          definition: "twisted; winding",
          example:
            "Harriet Beecher Stowe described the abrupt, tortuous windings of the Red River."
        }
      },
      {
        stem: "sanct",
        meaning: "holy",
        examples: ["sacrosanct", "sanctimonious", "sanction"],
        explanation:
          "SANCT means holy. Sacrosanct means very holy, sanctimonious means acting holier than others, and a sanction blesses or approves.",
        nonfiction: {
          word: "sanctimonious",
          pronunciation: "sank-tih-MOH-nee-us",
          definition: "self-righteous",
          example:
            "Emily Bronte wrote that he wore his most sanctimonious and sourest face."
        }
      },
      {
        stem: "voc",
        meaning: "voice",
        examples: ["vocal", "invocation", "vociferous"],
        explanation:
          "VOC means voice. Vocals use the voice, invocation is a call, and a vociferous person is full of voice.",
        nonfiction: {
          word: "vociferate",
          pronunciation: "voh-SIF-uh-rate",
          definition: "to argue or complain loudly",
          example:
            "Stephen Crane wrote that loud and vociferous congratulations were showered upon the maiden."
        }
      }
    ],
    reviewStems: [
      { stem: "archy", meaning: "government", examples: ["matriarch", "patriarch", "hierarchy"] },
      { stem: "bio", meaning: "life", examples: ["biogenesis", "exobiology", "biomorphic"] },
      { stem: "auto", meaning: "self", examples: ["automatic", "automaton", "autocracy"] },
      { stem: "chron", meaning: "time", examples: ["chronometer", "anachronism", "chronic"] },
      { stem: "dec", meaning: "ten", examples: ["decade", "decagon", "decathlon"] }
    ]
  },
  10: {
    lesson: 10,
    pdfLesson: "Lesson XIX",
    displayLesson: "Lesson X",
    newStems: [
      {
        stem: "punct",
        meaning: "point",
        examples: ["punctuate", "punctual", "punctilious"],
        explanation:
          "PUNCT means point. To punctuate is to insert points and symbols, punctual means at the appointed time, and punctilious means careful about correct points of behavior.",
        nonfiction: {
          word: "punctilious",
          pronunciation: "punk-TIL-ee-us",
          definition: "attentive to correct details",
          example:
            "In Moby Dick, Herman Melville describes a very stately punctilious gentleman."
        }
      },
      {
        stem: "trib",
        meaning: "pay",
        examples: ["tribute", "distribute", "contribute"],
        explanation:
          "TRIB means pay. A tribute pays honor, to distribute is to allot something like pay, and to contribute is to give to a cause.",
        nonfiction: {
          word: "retribution",
          pronunciation: "ret-rih-BYOO-shun",
          definition: "payback; punishment",
          example:
            "In The Natural, Bernard Malamud wrote that Bump did not like warnings of retribution."
        }
      },
      {
        stem: "cap",
        meaning: "take",
        examples: ["capture", "captivate", "captious"],
        explanation:
          "CAP means take. To capture is to take prisoner, to captivate is to take control of fascination, and captious means fault-finding.",
        nonfiction: {
          word: "capitulate",
          pronunciation: "kuh-PICH-uh-late",
          definition: "to surrender; to cease resisting",
          example:
            "Mary Shelley wrote about a man who thus capitulated for his safety."
        }
      },
      {
        stem: "pond",
        meaning: "weight",
        examples: ["ponder", "preponderance", "ponderous"],
        explanation:
          "POND means weight. To ponder is to think about weighty matters, preponderance is the bulk of evidence, and ponderous means heavy.",
        nonfiction: {
          word: "imponderable",
          pronunciation: "im-PON-der-uh-bul",
          definition: "difficult to answer or estimate",
          example:
            "Herman Melville asked, \"What things real are there, but imponderable thoughts?\""
        }
      },
      {
        stem: "rect",
        meaning: "right",
        examples: ["correct", "rectilinear", "rectitude"],
        explanation:
          "RECT means right. To correct is to make right, rectilinear means made of straight lines, and rectitude is moral uprightness.",
        nonfiction: {
          word: "rectify",
          pronunciation: "REK-tih-fy",
          definition: "to make right; to correct",
          example:
            "In The Tempest, Shakespeare wrote, \"Some oracle must rectify our knowledge.\""
        }
      }
    ],
    reviewStems: [
      { stem: "geo", meaning: "earth", examples: ["geothermal", "geophysics", "geosynchronous"] },
      { stem: "scope", meaning: "look", examples: ["horoscope", "electroscope", "periscope"] },
      { stem: "anti", meaning: "against", examples: ["anticline", "antibody", "antitoxin"] },
      { stem: "intro", meaning: "into", examples: ["introduce", "introspective", "introvert"] },
      { stem: "neo", meaning: "new", examples: ["neologism", "neoclassic", "neonatal"] }
    ]
  }
};
