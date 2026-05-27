import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AnalogiesAntonymsClient } from "@/components/analogies-antonyms-client";
import { analogiesAntonymsLessons } from "@/lib/analogies-antonyms";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ courseId: string }>;
  searchParams?: Promise<{ target?: string; returnTo?: string; reviewCategory?: string }>;
};

export default async function AnalogiesAntonymsPage({ params, searchParams }: Props) {
  const { courseId } = await params;
  const query = await searchParams;
  const [user, course] = await Promise.all([
    getCurrentUser(),
    prisma.course.findFirst({
      where: { OR: [{ id: courseId }, { slug: courseId }] }
    })
  ]);

  if (!course) notFound();
  if (!user) redirect(`/login?next=/courses/${course.slug}/analogies-antonyms`);
  const reviewTarget = query?.target ? safeDecode(query.target).trim().toLowerCase().replace(/\s+/g, " ") : "";
  const visibleLessons = reviewTarget
    ? analogiesAntonymsLessons.filter((lesson) =>
        [...lesson.analogies.map((question) => ({ ...question, kind: "analogy" })), ...lesson.antonyms.map((question) => ({ ...question, kind: "antonym" }))]
          .some((question) => `${lesson.lesson}:${question.kind}:${question.prompt}`.trim().toLowerCase().replace(/\s+/g, " ") === reviewTarget || question.prompt.trim().toLowerCase().replace(/\s+/g, " ") === reviewTarget)
      )
    : analogiesAntonymsLessons;

  return (
    <main className="legacy-page">
      <section className="legacy-cover">
        <div className="legacy-label">Caesar&apos;s English II</div>
        <h1>Analogies &amp; Antonyms</h1>
        <div className="legacy-subtitle">Caesar&apos;s Analogies · Caesar&apos;s Antonyms</div>
        <div className="legacy-gold-line" />
        <p>按课整理类比题与反义词练习</p>
      </section>

      <div className="legacy-container">
        <Link className="legacy-back" href={`/courses/${course.slug}`}>← 返回学习中心首页</Link>

        <div className="analogy-lesson-list">
          {visibleLessons.map((lesson) => (
            <section className="learning-lesson analogy-lesson" key={lesson.lesson}>
              <header>
                <div>
                  <h3>{lesson.lesson}</h3>
                </div>
              </header>

              <AnalogiesAntonymsClient
                courseId={course.id}
                lesson={lesson}
                reviewTarget={query?.target}
                returnTo={query?.returnTo}
              />
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
