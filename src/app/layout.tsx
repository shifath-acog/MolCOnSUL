import { Inter } from "next/font/google";
import "./globals.css";
import Header from "./../components/Header";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "MolConSUL",
  description: "Molecular Conformer Search with Unsupervised Learning",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={cn(inter.className, "min-h-screen flex flex-col bg-background column-gap-40")}>
        <Header />
        <main className="flex-1">{children}</main>
        
      </body>
    </html>
  );
}