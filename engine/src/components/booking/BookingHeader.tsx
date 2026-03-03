import { ArrowLeft } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";

export function BookingHeader() {
  return (
    // Background color updated to match the NSC blue from your image
    <header className="sticky top-0 z-50 w-full bg-[#005ba4] shadow-md">
      <div className="flex h-20 items-center justify-between px-6 md:px-12">
        
        {/* Logo Section */}
        <div className="flex items-center gap-4">
          <a 
            href="https://nsc.gov.sb" 
            className="transition-transform hover:scale-105 active:scale-95 flex items-center gap-3"
          >
            {/* Note: If your logo has a white background, you might want to 
               use a version with a transparent background for this blue header.
            */}
            <Image 
              src="/nsc-logo.png" 
              alt="NSC Logo" 
              width={60} 
              height={60} 
              className="object-contain brightness-0 invert" // This utility makes a black logo white
              priority
            />
            <div className="hidden sm:block text-white">
              <p className="text-base font-bold leading-none">National Sports Council</p>
              <p className="text-[10px] opacity-80 uppercase tracking-widest mt-1">
                Solomon Islands
              </p>
            </div>
          </a>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-4">
          <Button 
            asChild 
            variant="outline" 
            size="sm" 
            className="rounded-full border-white text-white bg-transparent hover:bg-white hover:text-[#005ba4] transition-colors"
          >
            <a href="https://nsc.gov.sb" className="flex items-center gap-2 px-1">
              <ArrowLeft className="h-4 w-4" />
              <span className="font-semibold">Back to Website</span>
            </a>
          </Button>
        </div>
      </div>
    </header>
  );
}