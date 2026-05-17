import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PronunciationButton } from "@/components/pronunciation-button";
import { getCurrentUser } from "@/lib/auth";
import { latinStemLessons } from "@/lib/latin-stem-lessons";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ courseId: string }>;
};

export default async function LatinStemsPage({ params }: Props) {
  const { courseId } = await params;
  const [user, course] = await Promise.all([
    getCurrentUser(),
    prisma.course.findFirst({
      where: { OR: [{ id: courseId }, { slug: courseId }] },
      include: {
        knowledge: {
          where: { type: "STEM" },
          orderBy: { sourceOrder: "asc" }
        }
      }
    })
  ]);

  if (!course) notFound();
  if (!user) redirect(`/login?next=/courses/${course.slug}/latin-stems`);

  const enrichedStemLessons = Object.values(latinStemLessons);
  const stemOverview = enrichedStemLessons.flatMap((lesson) => [
    ...lesson.newStems.map((stem) => ({
      stem: stem.stem,
      meaning: stem.meaning,
      example: stem.examples[0]
    })),
    ...lesson.reviewStems.map((stem) => ({
      stem: stem.stem,
      meaning: stem.meaning,
      example: stem.examples[0]
    }))
  ]);

  return (
    <main className="legacy-page">
      <section className="legacy-cover">
        <div className="legacy-label">LatinFun</div>
        <h1>Latin Stems</h1>
        <div className="legacy-subtitle">Caesar&apos;s English II 拉丁词根总表</div>
        <div className="legacy-gold-line" />
        <p>词根 · 含义 · 现代英文例词</p>
      </section>

      <div className="legacy-container wide">
        <Link className="legacy-back" href={`/courses/${course.slug}`}>← 返回学习中心首页</Link>

        {enrichedStemLessons.map((lesson) => (
          <section className="learning-lesson stem-lesson" key={lesson.lesson}>
            <header>
              <div>
                <h3>{lesson.displayLesson}</h3>
              </div>
            </header>

            <div className="stem-rich-section">
              <h4>New Latin Stems</h4>
              <div className="stem-rich-grid">
                {lesson.newStems.map((stem) => (
                  <article className="stem-rich-card" key={stem.stem}>
                    <div className="stem-head">
                      <div>
                        <strong>{stem.stem}</strong>
                        <span>{stem.meaning}</span>
                      </div>
                      <em>stem</em>
                    </div>

                    <div className="stem-examples">
                      {stem.examples.map((example) => (
                        <span key={example}>{example}</span>
                      ))}
                    </div>

                    <p>{stem.explanation}</p>

                    <div className="nonfiction-word">
                      <div className="nonfiction-word-head">
                        <div>
                          <span>Nonfiction word</span>
                          <strong>{stem.nonfiction.word}</strong>
                          <small>{stem.nonfiction.pronunciation}</small>
                        </div>
                        <PronunciationButton word={stem.nonfiction.word} />
                      </div>
                      <p>{stem.nonfiction.definition}</p>
                      <blockquote>{stem.nonfiction.example}</blockquote>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <div className="stem-rich-section">
              <h4>Review Stems</h4>
              <div className="stem-review-grid">
                {lesson.reviewStems.map((stem) => (
                  <article className="stem-review-card" key={stem.stem}>
                    <strong>{stem.stem}</strong>
                    <span>{stem.meaning}</span>
                    <small>{stem.examples.join(" · ")}</small>
                  </article>
                ))}
              </div>
            </div>
          </section>
        ))}

        <h2 className="legacy-section-title">全部拉丁词根总览</h2>
        <p className="stem-overview-note">10 lessons · 100 stems · one example each</p>
        <div className="learning-stem-grid">
          {stemOverview.map((stem, index) => (
            <article className="learning-stem" key={`${stem.stem}-${index}`}>
              <strong>{stem.stem}</strong>
              <span>{stem.meaning}</span>
              <small>{stem.example}</small>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
