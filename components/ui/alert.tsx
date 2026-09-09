import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
const alertVariants = cva("relative w-full rounded-xl border p-4 text-sm", { variants: { variant: { default: "border-border bg-card text-card-foreground", destructive: "border-red-400/20 bg-red-400/10 text-red-200", success: "border-emerald-400/20 bg-emerald-400/10 text-emerald-200", warning: "border-amber-300/20 bg-amber-300/10 text-amber-100" } }, defaultVariants: { variant: "default" } });
function Alert({ className, variant, ...props }: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) { return <div role="alert" data-slot="alert" className={cn(alertVariants({ variant }), className)} {...props} />; }
function AlertTitle({ className, ...props }: React.ComponentProps<"h5">) { return <h5 data-slot="alert-title" className={cn("mb-1 font-semibold leading-none", className)} {...props} />; }
function AlertDescription({ className, ...props }: React.ComponentProps<"div">) { return <div data-slot="alert-description" className={cn("text-xs leading-5 opacity-85", className)} {...props} />; }
export { Alert, AlertTitle, AlertDescription };
