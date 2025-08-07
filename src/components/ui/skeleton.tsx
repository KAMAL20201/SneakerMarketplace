import { cn } from "@/lib/utils";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  );
}

// Page-specific skeleton components for better loading states
function PageSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <Skeleton className="h-8 w-64" />
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-6 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}

function FormSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
    </div>
  );
}

export { Skeleton, PageSkeleton, FormSkeleton };
