import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ courseId: string }>;
};

export default async function LearningPage({ params }: Props) {
  const { courseId } = await params;
  redirect(`/courses/${courseId}/classic-words`);
}
