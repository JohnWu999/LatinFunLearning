import { additionalLessonVocabulary } from "@/lib/lesson-vocabulary-extra";

export type VocabularySource = {
  text: string;
  work: string;
  author: string;
  note?: string;
};

export type LessonVocabularyCard = {
  word: string;
  pronunciation: string;
  partOfSpeech: string;
  definition: string;
  group: "new" | "review";
  sources: VocabularySource[];
  synonyms: string[];
  antonyms: string[];
};

const baseLessonVocabulary: Record<number, LessonVocabularyCard[]> = {
  1: [
    {
      word: "placate",
      pronunciation: "PLAY-kate",
      partOfSpeech: "verb",
      definition: "to appease; to calm someone who is angry or upset",
      group: "new",
      sources: [
        {
          text: "Nothing [[placated]] the anger of the indignant crowd.",
          work: "Caesar's Grammar",
          author: "Michael Clay Thompson"
        },
        {
          text: "He had never seen his father so cold and [[implacable]].",
          work: "The Yearling",
          author: "Marjorie Kinnan Rawlings",
          note: "word family: implacable"
        }
      ],
      synonyms: ["appease", "pacify", "calm"],
      antonyms: ["provoke", "anger", "inflame"]
    },
    {
      word: "derision",
      pronunciation: "de-RIZH-un",
      partOfSpeech: "noun",
      definition: "ridicule; mocking scorn",
      group: "new",
      sources: [
        {
          text: "His mind heard howls of derision.",
          work: "The Red Badge of Courage",
          author: "Stephen Crane"
        },
        {
          text: "Tom withered him with derision.",
          work: "Tom Sawyer",
          author: "Mark Twain"
        }
      ],
      synonyms: ["ridicule", "mockery", "scorn"],
      antonyms: ["respect", "praise", "admiration"]
    },
    {
      word: "vivacious",
      pronunciation: "vie-VAY-shuss",
      partOfSpeech: "adjective",
      definition: "full of life; lively and spirited",
      group: "new",
      sources: [
        {
          text: "full of vivacious conversation",
          work: "David Copperfield",
          author: "Charles Dickens"
        },
        {
          text: "Snowball was a more vivacious pig than Napoleon.",
          work: "Animal Farm",
          author: "George Orwell"
        }
      ],
      synonyms: ["lively", "spirited", "animated"],
      antonyms: ["dull", "lifeless", "sluggish"]
    },
    {
      word: "procure",
      pronunciation: "pro-KYURE",
      partOfSpeech: "verb",
      definition: "to acquire; to get something by effort",
      group: "new",
      sources: [
        {
          text: "My idea was to procure clothing.",
          work: "The Invisible Man",
          author: "H.G. Wells"
        },
        {
          text: "I hoped to procure some means of fire.",
          work: "The Time Machine",
          author: "H.G. Wells"
        }
      ],
      synonyms: ["obtain", "acquire", "secure"],
      antonyms: ["lose", "forfeit", "surrender"]
    },
    {
      word: "retort",
      pronunciation: "ree-TORT",
      partOfSpeech: "noun / verb",
      definition: "a quick, clever reply; to answer sharply",
      group: "new",
      sources: [
        {
          text: "the missionary turned round briskly to retort",
          work: "Lost Horizon",
          author: "James Hilton"
        },
        {
          text: "the retort silenced Matthew",
          work: "Anne of Green Gables",
          author: "L.M. Montgomery"
        }
      ],
      synonyms: ["reply", "comeback", "rejoinder"],
      antonyms: ["silence", "acceptance", "concession"]
    },
    {
      word: "countenance",
      pronunciation: "COWN-tuh-nuns",
      partOfSpeech: "noun",
      definition: "facial expression",
      group: "review",
      sources: [
        {
          text: "vivacious countenance",
          work: "Caesar's Sesquipedalian Story",
          author: "Michael Clay Thompson"
        },
        {
          text: "a paternal and benevolent countenance",
          work: "Caesar's Grammar",
          author: "Michael Clay Thompson"
        }
      ],
      synonyms: ["face", "expression", "visage"],
      antonyms: ["blankness", "mask", "concealment"]
    },
    {
      word: "profound",
      pronunciation: "pro-FOUND",
      partOfSpeech: "adjective",
      definition: "deep; intense or thoughtful",
      group: "review",
      sources: [
        {
          text: "profoundly weary of his extended campaigns",
          work: "Caesar's Sesquipedalian Story",
          author: "Michael Clay Thompson"
        },
        {
          text: "A profound silence descended over the German forest.",
          work: "Caesar's Grammar",
          author: "Michael Clay Thompson"
        }
      ],
      synonyms: ["deep", "intense", "thoughtful"],
      antonyms: ["shallow", "superficial", "slight"]
    },
    {
      word: "manifest",
      pronunciation: "MAN-uh-fest",
      partOfSpeech: "adjective / verb",
      definition: "obvious; clear to see",
      group: "review",
      sources: [
        {
          text: "A manifest determination clouded Caesar's vivacious countenance.",
          work: "Caesar's Sesquipedalian Story",
          author: "Michael Clay Thompson"
        },
        {
          text: "The crowd's anger was manifest on their countenances.",
          work: "Caesar's Grammar",
          author: "Michael Clay Thompson"
        }
      ],
      synonyms: ["obvious", "clear", "evident"],
      antonyms: ["hidden", "obscure", "unclear"]
    },
    {
      word: "prodigious",
      pronunciation: "pro-DIJ-us",
      partOfSpeech: "adjective",
      definition: "huge; unusually large or impressive",
      group: "review",
      sources: [
        {
          text: "prodigious problems of the attack",
          work: "Caesar's Sesquipedalian Story",
          author: "Michael Clay Thompson"
        },
        {
          text: "Caesar had a prodigious vitality.",
          work: "Caesar's Grammar",
          author: "Michael Clay Thompson"
        }
      ],
      synonyms: ["huge", "enormous", "immense"],
      antonyms: ["tiny", "slight", "ordinary"]
    },
    {
      word: "languor",
      pronunciation: "LANG-gur",
      partOfSpeech: "noun",
      definition: "weakness; tired heaviness",
      group: "review",
      sources: [
        {
          text: "enemies weakened by languor",
          work: "Caesar's Sesquipedalian Story",
          author: "Michael Clay Thompson"
        },
        {
          text: "the languor of the hot afternoon",
          work: "Caesar's Grammar",
          author: "Michael Clay Thompson"
        }
      ],
      synonyms: ["weakness", "weariness", "listlessness"],
      antonyms: ["energy", "vigor", "vitality"]
    }
  ],
  2: [
    {
      word: "audible",
      pronunciation: "AW-dih-bul",
      partOfSpeech: "adjective",
      definition: "able to be heard",
      group: "new",
      sources: [
        {
          text: "the chant was audible but...still wordless",
          work: "Lord of the Flies",
          author: "William Golding"
        },
        {
          text: "a subdued impassioned murmur was audible",
          work: "The Great Gatsby",
          author: "F. Scott Fitzgerald"
        }
      ],
      synonyms: ["hearable", "clear", "perceptible"],
      antonyms: ["inaudible", "silent", "muted"]
    },
    {
      word: "benevolent",
      pronunciation: "ben-EH-vo-lent",
      partOfSpeech: "adjective",
      definition: "charitable; kind and wishing good for others",
      group: "new",
      sources: [
        {
          text: "winking, benevolent eyes",
          work: "Lord Jim",
          author: "Joseph Conrad"
        },
        {
          text: "benevolent-minded ladies and gentlemen",
          work: "Jane Eyre",
          author: "Charlotte Bronte"
        }
      ],
      synonyms: ["kind", "charitable", "generous"],
      antonyms: ["cruel", "hostile", "malicious"]
    },
    {
      word: "somber",
      pronunciation: "SOM-burr",
      partOfSpeech: "adjective",
      definition: "gloomy; dark or serious in mood",
      group: "new",
      sources: [
        {
          text: "Democrats and Republicans alike...sat in somber silence.",
          work: "Profiles in Courage",
          author: "John F. Kennedy"
        },
        {
          text: "Then he heard a somber rolling of the drums.",
          work: "Johnny Tremain",
          author: "Esther Forbes"
        }
      ],
      synonyms: ["gloomy", "solemn", "melancholy"],
      antonyms: ["cheerful", "bright", "joyful"]
    },
    {
      word: "prostrate",
      pronunciation: "PROSS-trait",
      partOfSpeech: "adjective / verb",
      definition: "lying flat, especially face-down; to throw down",
      group: "new",
      sources: [
        {
          text: "lying on top of the prostrate Rat",
          work: "The Wind in the Willows",
          author: "Kenneth Grahame"
        },
        {
          text: "Behold the tyrant prostrate in the dust",
          work: "Profiles in Courage",
          author: "John F. Kennedy"
        }
      ],
      synonyms: ["flat", "fallen", "collapsed"],
      antonyms: ["upright", "standing", "raised"]
    },
    {
      word: "profuse",
      pronunciation: "pro-FYOOS",
      partOfSpeech: "adjective",
      definition: "abundant; given or existing in large amounts",
      group: "new",
      sources: [
        {
          text: "the profuse sweat from his brow",
          work: "Moby Dick",
          author: "Herman Melville"
        },
        {
          text: "He blushed profusely",
          work: "Vanity Fair",
          author: "William Makepeace Thackeray"
        }
      ],
      synonyms: ["abundant", "plentiful", "lavish"],
      antonyms: ["scarce", "limited", "sparse"]
    },
    {
      word: "serene",
      pronunciation: "suh-REEN",
      partOfSpeech: "adjective",
      definition: "calm; peaceful and untroubled",
      group: "review",
      sources: [
        {
          text: "The serene silence and darkness of the night",
          work: "The Legion",
          author: "Michael Clay Thompson"
        },
        {
          text: "the city's serenity",
          work: "Caesar's Grammar",
          author: "Michael Clay Thompson"
        }
      ],
      synonyms: ["calm", "peaceful", "tranquil"],
      antonyms: ["agitated", "troubled", "chaotic"]
    },
    {
      word: "acute",
      pronunciation: "uh-KYOOT",
      partOfSpeech: "adjective",
      definition: "sharp; intense or keen",
      group: "review",
      sources: [
        {
          text: "the acute orders of the commanders",
          work: "The Legion",
          author: "Michael Clay Thompson"
        },
        {
          text: "acute: sharp",
          work: "Review Words from Caesar's English I",
          author: "Michael Clay Thompson"
        }
      ],
      synonyms: ["sharp", "keen", "intense"],
      antonyms: ["dull", "mild", "blunt"]
    },
    {
      word: "grotesque",
      pronunciation: "gro-TESK",
      partOfSpeech: "adjective",
      definition: "distorted; strange in an unnatural or unpleasant way",
      group: "review",
      sources: [
        {
          text: "The countenances of the soldiers were manifestly grotesque",
          work: "The Legion",
          author: "Michael Clay Thompson"
        },
        {
          text: "grotesque: distorted",
          work: "Review Words from Caesar's English I",
          author: "Michael Clay Thompson"
        }
      ],
      synonyms: ["distorted", "bizarre", "misshapen"],
      antonyms: ["normal", "natural", "graceful"]
    },
    {
      word: "condescend",
      pronunciation: "KON-duh-send",
      partOfSpeech: "verb",
      definition: "to patronize; to act as if one is superior",
      group: "review",
      sources: [
        {
          text: "the normal condescending retorts of the soldiers",
          work: "The Legion",
          author: "Michael Clay Thompson",
          note: "word family: condescending"
        },
        {
          text: "condescend: to patronize",
          work: "Review Words from Caesar's English I",
          author: "Michael Clay Thompson"
        }
      ],
      synonyms: ["patronize", "talk down", "belittle"],
      antonyms: ["respect", "honor", "defer"]
    },
    {
      word: "odious",
      pronunciation: "OH-dee-us",
      partOfSpeech: "adjective",
      definition: "hateful; extremely unpleasant",
      group: "review",
      sources: [
        {
          text: "those derisive and odious barbarians",
          work: "The Legion",
          author: "Michael Clay Thompson"
        },
        {
          text: "odious: hateful",
          work: "Review Words from Caesar's English I",
          author: "Michael Clay Thompson"
        }
      ],
      synonyms: ["hateful", "repulsive", "detestable"],
      antonyms: ["pleasant", "lovable", "admirable"]
    }
  ]
};

export const lessonVocabulary: Record<number, LessonVocabularyCard[]> = {
  ...baseLessonVocabulary,
  ...additionalLessonVocabulary
};
