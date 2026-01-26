import { Spinner } from "@/components/ui/spinner";

function LoadingSpinner() {
  return (
    <div className="flex min-h-[50vh] w-full items-center justify-center px-4 py-12 text-muted-foreground">
      <div className="flex items-center gap-3 rounded-lg bg-background/80 px-4 py-3 shadow-sm ring-1 ring-border/50">
        <Spinner className="size-5" />
        <span className="text-sm font-medium">Loading...</span>
      </div>
    </div>
  );
}

export { LoadingSpinner };
