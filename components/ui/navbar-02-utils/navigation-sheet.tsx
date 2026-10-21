import * as React from "react";
import { Menu } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

export const NavigationSheet = () => {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" aria-label="Open Navigation Menu">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="bg-[#fafaf9]">
        <SheetHeader>
          <SheetTitle className="text-left text-[#14171c] font-bold text-lg">ScholarX Menu</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-4 py-6">
          <a href="#hero" className="text-sm font-semibold text-[#14171c] hover:text-[#0b4a39] transition-colors py-1">
            Home
          </a>
          <a href="#strip" className="text-sm font-semibold text-[#14171c] hover:text-[#0b4a39] transition-colors py-1">
            Capabilities
          </a>
          <a href="#viva" className="text-sm font-semibold text-[#14171c] hover:text-[#0b4a39] transition-colors py-1">
            AI Oral Viva
          </a>
          <a href="#obe" className="text-sm font-semibold text-[#14171c] hover:text-[#0b4a39] transition-colors py-1">
            OBE & Accreditation
          </a>
          <a href="#ocr" className="text-sm font-semibold text-[#14171c] hover:text-[#0b4a39] transition-colors py-1">
            PYQ OCR Miner
          </a>
          <a href="#roles" className="text-sm font-semibold text-[#14171c] hover:text-[#0b4a39] transition-colors py-1">
            Portals
          </a>
          <div className="pt-4 border-t border-[#eceeee] flex flex-col gap-2.5">
            <a href="/login" className="w-full text-center py-2 text-sm font-semibold text-[#14171c] border border-[#eceeee] rounded-lg bg-white">
              Sign In
            </a>
            <a href="/login" className="w-full text-center py-2 text-sm font-semibold text-white bg-[#0b4a39] rounded-lg">
              Sign Up / Demo
            </a>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
