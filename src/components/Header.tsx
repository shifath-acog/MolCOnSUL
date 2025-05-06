import { Button } from "@/components/ui/button";
import Image from "next/image";

export default function Header() {
  return (
    <header className="fixed top-0 left-0 w-full bg-background text-foreground shadow-md z-50 flex items-center justify-between px-4 py-2">
  <div className="flex items-center">
  <Image 
  src="/aganitha-logo.png" 
  alt="Aganitha Logo" 
  width={120} 
  height={120} 
  style={{ objectFit: 'contain' }} 
/>

  </div>
  
  {/* Centered Content */}
  <div className="flex flex-col items-center">
    <h1 className="text-xl font-bold text-primary">MolConSUL</h1>
    <p className="text-sm text-muted-foreground">Molecular Conformer Search with Unsupervised Learning</p>
  </div>
  
  {/* Empty div to maintain balance */}
  <div className="w-12"></div> {/* Optional, to keep other elements in place if needed */}
</header>


  );
}