import Link from "next/link";
import { notFound } from "next/navigation";
import { PronunciationButton } from "@/components/pronunciation-button";
import { prisma } from "@/lib/prisma";
import { lessonVocabulary } from "@/lib/lesson-vocabulary";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ courseId: string }>;
};

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getHighlightForms(word: string) {
  const lower = word.toLowerCase();
  const forms = new Set([lower, `${lower}s`, `${lower}es`, `${lower}ed`, `${lower}ing`, `${lower}ly`, `${lower}ness`]);

  if (lower.endsWith("e")) {
    const stem = lower.slice(0, -1);
    forms.add(`${stem}ed`);
    forms.add(`${stem}ing`);
  }

  if (lower.endsWith("y")) {
    const stem = lower.slice(0, -1);
    forms.add(`${stem}ied`);
    forms.add(`${stem}ies`);
  }

  if (lower.endsWith("ous")) {
    forms.add(`${lower}ly`);
    forms.add(`${lower}ness`);
    forms.add(`${lower.slice(0, -3)}ously`);
    forms.add(`${lower.slice(0, -3)}ousness`);
  }

  if (lower.endsWith("ent")) {
    forms.add(`${lower.slice(0, -3)}ence`);
  }

  return [...forms].sort((a, b) => b.length - a.length);
}

function renderPlainHighlightedText(text: string, word: string) {
  const forms = getHighlightForms(word);
  const pattern = new RegExp(`\\b(${forms.map(escapeRegExp).join("|")})\\b`, "gi");

  return text.split(pattern).map((part, index) => {
    if (forms.includes(part.toLowerCase())) {
      return <mark className="source-highlight" key={`${part}-${index}`}>{part}</mark>;
    }
    return part;
  });
}

function renderHighlightedText(text: string, word: string) {
  return text.split(/(\[\[.*?\]\])/g).map((part, index) => {
    if (part.startsWith("[[") && part.endsWith("]]")) {
      return <mark className="source-highlight" key={`${part}-${index}`}>{part.slice(2, -2)}</mark>;
    }
    return renderPlainHighlightedText(part, word);
  });
}

export default async function ClassicWordsPage({ params }: Props) {
  const { courseId } = await params;
  const course = await prisma.course.findFirst({
    where: { OR: [{ id: courseId }, { slug: courseId }] },
    include: {
      lessons: {
        orderBy: { order: "asc" },
        include: {
          vocabulary: { orderBy: { sourceOrder: "asc" } }
        }
      }
    }
  });

  if (!course) notFound();

  return (
    <main className="legacy-page">
      <section className="legacy-cover">
        <div className="legacy-label">LatinFun</div>
        <h1>Classic Words</h1>
        <div className="legacy-subtitle">Caesar&apos;s English II 经典词汇</div>
        <div className="legacy-gold-line" />
        <p>新学习词汇 · 复习词汇 · 文学出处 · 同反义词</p>
      </section>

      <div className="legacy-container wide">
        <Link className="legacy-back" href={`/courses/${course.slug}`}>← 返回学习中心首页</Link>

        {course.lessons.map((lesson) => {
          const enrichedVocabulary = lessonVocabulary[lesson.order] ?? [];

          return (
            <section className="learning-lesson" key={lesson.id}>
              <header>
                <h3>{`Lesson ${lesson.order}-vocabulary`}</h3>
              </header>

              {enrichedVocabulary.length > 0 ? (
                <div className="learning-rich-vocab">
                  <section>
                    <h4>New Learning Words</h4>
                    <div className="learning-rich-grid">
                      {enrichedVocabulary.filter((item) => item.group === "new").map((item) => (
                        <article className="learning-rich-card" key={item.word}>
                          <div className="learning-word-head">
                            <div>
                              <div className="learning-word-title">
                                <strong>{item.word}</strong>
                                <PronunciationButton word={item.word} />
                              </div>
                              <span>({item.pronunciation})</span>
                            </div>
                            <em>{item.partOfSpeech}</em>
                          </div>
                          <p>{item.definition}</p>
                          <div className="learning-source-list">
                            {item.sources.map((source) => (
                              <blockquote key={`${item.word}-${source.work}`}>
                                <span>{renderHighlightedText(source.text, item.word)}</span>
                                <cite>{source.work} · {source.author}{source.note ? ` · ${source.note}` : ""}</cite>
                              </blockquote>
                            ))}
                          </div>
                          <div className="learning-word-relations">
                            <div>
                              <b>Synonyms</b>
                              <span>{item.synonyms.join(" · ")}</span>
                            </div>
                            <div>
                              <b>Antonyms</b>
                              <span>{item.antonyms.join(" · ")}</span>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>

                  <section>
                    <h4>Review Words</h4>
                    <div className="learning-rich-grid">
                      {enrichedVocabulary.filter((item) => item.group === "review").map((item) => (
                        <article className="learning-rich-card review" key={item.word}>
                          <div className="learning-word-head">
                            <div>
                              <div className="learning-word-title">
                                <strong>{item.word}</strong>
                                <PronunciationButton word={item.word} />
                              </div>
                              <span>({item.pronunciation})</span>
                            </div>
                            <em>{item.partOfSpeech}</em>
                          </div>
                          <p>{item.definition}</p>
                          <div className="learning-source-list">
                            {item.sources.map((source) => (
                              <blockquote key={`${item.word}-${source.work}`}>
                                <span>{renderHighlightedText(source.text, item.word)}</span>
                                <cite>{source.work} · {source.author}</cite>
                              </blockquote>
                            ))}
                          </div>
                          <div className="learning-word-relations">
                            <div>
                              <b>Synonyms</b>
                              <span>{item.synonyms.join(" · ")}</span>
                            </div>
                            <div>
                              <b>Antonyms</b>
                              <span>{item.antonyms.join(" · ")}</span>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>
                </div>
              ) : null}

              {enrichedVocabulary.length === 0 && lesson.vocabulary.length > 0 ? (
                <div className="learning-vocab-list">
                  {lesson.vocabulary.map((item) => (
                    <article key={item.id}>
                      <strong>{item.word}</strong>
                      <span>{item.partOfSpeech}</span>
                      <p>{item.definition}</p>
                    </article>
                  ))}
                </div>
              ) : null}
            </section>
          );
        })}
      </div>
    </main>
  );
}
