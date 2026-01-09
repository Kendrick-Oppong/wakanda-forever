"use client";

import { Loader } from "@/components/loader/Loader";

export default function ClientLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <Loader />
      {children}
    </>
  );
}
