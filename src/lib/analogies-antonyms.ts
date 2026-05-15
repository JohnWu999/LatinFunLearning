export type MultipleChoiceQuestion = {
  prompt: string;
  options: string[];
  correctAnswerIndex?: number;
};

export type AnalogiesAntonymsLesson = {
  lesson: string;
  sourceLesson: string;
  analogies: MultipleChoiceQuestion[];
  antonyms: MultipleChoiceQuestion[];
};

export const analogiesAntonymsLessons: AnalogiesAntonymsLesson[] = [
  {
    lesson: "Lesson I",
    sourceLesson: "PDF Lesson I",
    analogies: [
      {
        prompt: "INTRACELLULAR : CELL ::",
        options: ["advocate : oppose", "transfer : goods", "interior : car", "century : year"],
        correctAnswerIndex: 2
      },
      {
        prompt: "ADVOCATE : OPPOSE ::",
        options: ["complex : intricate", "combine : merge", "adhere : stick", "complete : partial"],
        correctAnswerIndex: 3
      }
    ],
    antonyms: [
      {
        prompt: "ADVOCATE",
        options: ["articulate", "revoke", "invoke", "resist"],
        correctAnswerIndex: 3
      },
      {
        prompt: "COMPLEX",
        options: ["elemental", "complete", "intricate", "ornate"],
        correctAnswerIndex: 0
      }
    ]
  },
  {
    lesson: "Lesson II",
    sourceLesson: "PDF Lesson III",
    analogies: [
      {
        prompt: "VITAL : MORBID ::",
        options: ["patriarch : matriarch", "populous : people", "evidence : courtroom", "matrimony : mother"],
        correctAnswerIndex: 0
      },
      {
        prompt: "EXPATRIATE : COUNTRY ::",
        options: ["paternal : attitude", "revitalize : dilapidated", "abandon : ship", "provide : neglect"],
        correctAnswerIndex: 2
      }
    ],
    antonyms: [
      {
        prompt: "REVITALIZE",
        options: ["raze", "revive", "improve", "review"],
        correctAnswerIndex: 0
      },
      {
        prompt: "VITAL",
        options: ["revived", "vilify", "vivacious", "moribund"],
        correctAnswerIndex: 3
      }
    ]
  },
  {
    lesson: "Lesson III",
    sourceLesson: "PDF Lesson V",
    analogies: [
      {
        prompt: "SURFEIT : PAUCITY ::",
        options: ["stellar : interstellar", "surface : submerge", "excess : scarcity", "locomotion : place"],
        correctAnswerIndex: 2
      },
      {
        prompt: "ALTRUISM : BENEVOLENCE ::",
        options: ["surrealism : imagination", "alteration : tradition", "contradiction : assent", "stellar : constellation"],
        correctAnswerIndex: 0
      }
    ],
    antonyms: [
      {
        prompt: "CONTRADICTION",
        options: ["refutation", "advocation", "confirmation", "interrogation"],
        correctAnswerIndex: 2
      },
      {
        prompt: "ALTRUISM",
        options: ["anger", "consideration", "benevolence", "malice"],
        correctAnswerIndex: 3
      }
    ]
  },
  {
    lesson: "Lesson IV",
    sourceLesson: "PDF Lesson VII",
    analogies: [
      {
        prompt: "GREGARIOUS : HERMIT ::",
        options: ["tangent : circle", "cautious : amity", "clamorous : crowd", "sane : lunatic"],
        correctAnswerIndex: 3
      },
      {
        prompt: "CONGREGATE : GATHER ::",
        options: ["segregate : exclude", "alternate : turn", "contradict : support", "silent : vociferate"],
        correctAnswerIndex: 0
      }
    ],
    antonyms: [
      {
        prompt: "AMITY",
        options: ["equanimity", "hostility", "conviviality", "bon vivant"],
        correctAnswerIndex: 1
      },
      {
        prompt: "INTANGIBLE",
        options: ["tangled", "implied", "tacit", "concrete"],
        correctAnswerIndex: 3
      }
    ]
  },
  {
    lesson: "Lesson V",
    sourceLesson: "PDF Lesson IX",
    analogies: [
      {
        prompt: "MARITIME : SEA ::",
        options: ["blue : color", "aviation : air", "medium : length", "mariner : captain"],
        correctAnswerIndex: 1
      },
      {
        prompt: "CONTEMPORARY : ANCESTOR ::",
        options: ["temporize : stall", "glass : pellucid", "self : descendant", "junction : crossroads"],
        correctAnswerIndex: 2
      }
    ],
    antonyms: [
      {
        prompt: "TRANSLUCENT",
        options: ["medium", "adjunct", "temporal", "opaque"],
        correctAnswerIndex: 3
      },
      {
        prompt: "LUCIDITY",
        options: ["confusion", "brilliance", "eclipse", "perspicacity"],
        correctAnswerIndex: 0
      }
    ]
  },
  {
    lesson: "Lesson VI",
    sourceLesson: "PDF Lesson XI",
    analogies: [
      {
        prompt: "TOADY : INGRATIATE ::",
        options: ["current : event", "corrupt : crime", "transfuse : blood", "bird : migrate"],
        correctAnswerIndex: 3
      },
      {
        prompt: "TRANSFER : GOODS ::",
        options: ["hunger : gratify", "corrupt : money", "transfuse : blood", "costs : incur"],
        correctAnswerIndex: 2
      }
    ],
    antonyms: [
      {
        prompt: "INCUR",
        options: ["avoid", "recur", "current", "transfer"],
        correctAnswerIndex: 0
      },
      {
        prompt: "GRATUITOUS",
        options: ["transcendent", "justified", "corrupt", "disrupted"],
        correctAnswerIndex: 1
      }
    ]
  },
  {
    lesson: "Lesson VII",
    sourceLesson: "PDF Lesson XIII",
    analogies: [
      {
        prompt: "PRECLUDE : AVOID ::",
        options: ["secede : withdraw", "seed : germinate", "exclude : include", "blood : transfusion"],
        correctAnswerIndex: 0
      },
      {
        prompt: "GUNS : FUSILLADE ::",
        options: ["separate : unify", "germane : relevant", "exclude : barriers", "tubes : transfusion"],
        correctAnswerIndex: 3
      }
    ],
    antonyms: [
      {
        prompt: "NONPLUSSED",
        options: ["germane", "lucid", "infused", "precluded"],
        correctAnswerIndex: 1
      },
      {
        prompt: "SEDITION",
        options: ["exclusion", "patriotism", "germination", "treachery"],
        correctAnswerIndex: 1
      }
    ]
  },
  {
    lesson: "Lesson VIII",
    sourceLesson: "PDF Lesson XV",
    analogies: [
      {
        prompt: "PUGILIST : PUGNACIOUS ::",
        options: ["urban : suburban", "culprit : culpable", "exculpate : innocent", "enumerate : items"],
        correctAnswerIndex: 1
      },
      {
        prompt: "OPPUGN : SANCTION ::",
        options: ["pugilist : glove", "city : suburb", "supernumerary : extra", "exculpate : convict"],
        correctAnswerIndex: 3
      }
    ],
    antonyms: [
      {
        prompt: "ACRIMONY",
        options: ["pugnacity", "verisimilitude", "urbanity", "harmony"],
        correctAnswerIndex: 3
      },
      {
        prompt: "PUGNACIOUS",
        options: ["mollifying", "oppugning", "enumerating", "exculpating"],
        correctAnswerIndex: 0
      }
    ]
  },
  {
    lesson: "Lesson IX",
    sourceLesson: "PDF Lesson XVII",
    analogies: [
      {
        prompt: "WINNER : MAGNANIMOUS ::",
        options: ["tortuous : road", "relic : sacrosanct", "conversation : retort", "scholar : perspicacious"],
        correctAnswerIndex: 3
      },
      {
        prompt: "SANCTIMONIOUS : HUMILITY ::",
        options: ["magnanimous : generous", "vocal : vociferous", "vociferous : taciturnity", "torturous : painful"],
        correctAnswerIndex: 2
      }
    ],
    antonyms: [
      {
        prompt: "PERSPICACITY",
        options: ["anachronism", "magnanimity", "vociferous", "obtuseness"],
        correctAnswerIndex: 3
      },
      {
        prompt: "TORTUOUS",
        options: ["animal", "simple", "automatic", "torturous"],
        correctAnswerIndex: 1
      }
    ]
  },
  {
    lesson: "Lesson X",
    sourceLesson: "PDF Lesson XIX",
    analogies: [
      {
        prompt: "BALLOON : PONDEROUS ::",
        options: ["rectify : correct", "delay : punctual", "speak : diatribe", "burden : heavy"],
        correctAnswerIndex: 1
      },
      {
        prompt: "PONDER : IDEA ::",
        options: ["tribute : pay", "retribution : vengeance", "rectify : mistake", "punctilious : conduct"],
        correctAnswerIndex: 2
      }
    ],
    antonyms: [
      {
        prompt: "CAPTIVATE",
        options: ["bore", "rectify", "tedium", "punctuate"],
        correctAnswerIndex: 0
      },
      {
        prompt: "DIATRIBE",
        options: ["preponderance", "euphemism", "tribute", "speech"],
        correctAnswerIndex: 1
      }
    ]
  }
];
