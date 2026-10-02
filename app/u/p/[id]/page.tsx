import { redirect } from "next/navigation";
export default async function SharedPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/u/p/${id}/metrics`);
}
