import { ClassGridSkeleton } from "@/app/_components/classes/skeleton/class-grid-skeleton";
import { PageHeader } from "@/app/_components/page-header";

export default function Loading() {
  return (
    <div className="flex flex-col gap-8 p-6 py-0">
      <PageHeader
        heading="Classes"
        text="Access and manage your coding classes."
      />
      <ClassGridSkeleton />
    </div>
  );
}
