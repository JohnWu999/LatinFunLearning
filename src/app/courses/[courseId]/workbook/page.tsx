import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ courseId: string }>;
};

export default async function WorkbookRedirectPage({ params }: Props) {
  const { courseId } = await params;
  redirect(`/courses/${courseId}`);
}
