"use client";
import * as React from "react";
import { X } from "lucide-react";
import { Dialog as SheetPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

function Sheet(props: React.ComponentProps<typeof SheetPrimitive.Root>) { return <SheetPrimitive.Root data-slot="sheet" {...props} />; }
function SheetTrigger(props: React.ComponentProps<typeof SheetPrimitive.Trigger>) { return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />; }
function SheetClose(props: React.ComponentProps<typeof SheetPrimitive.Close>) { return <SheetPrimitive.Close data-slot="sheet-close" {...props} />; }
function SheetPortal(props: React.ComponentProps<typeof SheetPrimitive.Portal>) { return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />; }
function SheetOverlay({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Overlay>) {
  return <SheetPrimitive.Overlay data-slot="sheet-overlay" className={cn("fixed inset-0 z-50 bg-black/70 backdrop-blur-sm data-[state=closed]:animate-out data-[state=open]:animate-in", className)} {...props} />;
}
function SheetContent({ className, children, side = "bottom", ...props }: React.ComponentProps<typeof SheetPrimitive.Content> & { side?: "bottom" | "right" }) {
  return <SheetPortal><SheetOverlay /><SheetPrimitive.Content data-slot="sheet-content" className={cn("fixed z-50 border-border bg-card text-card-foreground shadow-2xl outline-none", side === "bottom" ? "inset-x-0 bottom-0 mx-auto max-h-[92dvh] max-w-[760px] rounded-t-[28px] border-x border-t pb-[max(env(safe-area-inset-bottom),1rem)]" : "inset-y-0 right-0 w-[88%] max-w-sm border-l", className)} {...props}>{children}<SheetPrimitive.Close className="absolute right-4 top-4 rounded-full p-2 text-muted-foreground transition hover:bg-accent hover:text-foreground"><X className="size-4" /><span className="sr-only">ปิด</span></SheetPrimitive.Close></SheetPrimitive.Content></SheetPortal>;
}
function SheetHeader({ className, ...props }: React.ComponentProps<"div">) { return <div data-slot="sheet-header" className={cn("space-y-1.5 px-5 pb-3 pt-6", className)} {...props} />; }
function SheetTitle({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Title>) { return <SheetPrimitive.Title data-slot="sheet-title" className={cn("text-lg font-semibold", className)} {...props} />; }
function SheetDescription({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Description>) { return <SheetPrimitive.Description data-slot="sheet-description" className={cn("text-sm text-muted-foreground", className)} {...props} />; }
function SheetFooter({ className, ...props }: React.ComponentProps<"div">) { return <div data-slot="sheet-footer" className={cn("flex flex-col gap-2 px-5 pt-4", className)} {...props} />; }
export { Sheet, SheetTrigger, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter };
