import type { Metadata } from "next";
import ConfigureAmplify from "@/components/ConfigureAmplify";
import "./globals.css";

export const metadata: Metadata = {
  title: "Team Status Board",
  description: "cognito-local + Amplify integration demo",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ConfigureAmplify />
        {children}
      </body>
    </html>
  );
}
