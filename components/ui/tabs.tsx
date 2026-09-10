"use client";
import * as React from "react";
import { Tabs as TabsPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

function Tabs(props: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return <TabsPrimitive.Root data-slot="tabs" {...props} />;
}
function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return <TabsPrimitive.List data-slot="tabs-list" className={cn("inline-flex h-11 w-full items-center rounded-xl bg-muted p-1 text-muted-foreground", className)} {...props} />;
}
function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return <TabsPrimitive.Trigger data-slot="tabs-trigger" className={cn("inline-flex h-9 flex-1 items-center justify-center rounded-lg px-3 text-xs font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/40 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm", className)} {...props} />;
}
function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content data-slot="tabs-content" className={cn("mt-4 outline-none", className)} {...props} />;
}
export { Tabs, TabsList, TabsTrigger, TabsContent };
