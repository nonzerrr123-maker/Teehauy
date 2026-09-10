import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
function NativeSelect({ className, children, ...props }: React.ComponentProps<"select">) {
  return <div className="relative"><select data-slot="native-select" className={cn("h-11 w-full appearance-none rounded-xl border border-input bg-background/55 px-3.5 pe-10 text-sm text-foreground outline-none focus:border-primary/50 focus:ring-2 focus:ring-ring/20", className)} {...props}>{children}</select><ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /></div>;
}
export { NativeSelect };
