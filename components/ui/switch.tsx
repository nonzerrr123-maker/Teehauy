"use client";
import * as React from "react";
import { Switch as SwitchPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";
function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return <SwitchPrimitive.Root data-slot="switch" className={cn("peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-transparent bg-input outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50 data-[state=checked]:bg-primary disabled:opacity-50", className)} {...props}><SwitchPrimitive.Thumb data-slot="switch-thumb" className="pointer-events-none block size-5 translate-x-0 rounded-full bg-white shadow transition-transform data-[state=checked]:translate-x-5" /></SwitchPrimitive.Root>;
}
export { Switch };
