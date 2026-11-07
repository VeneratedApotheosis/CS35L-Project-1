import HabitDetails from "@/views/HabitDetails"

export default async function HabitPage({ params }: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <HabitDetails id={id} />
}
