"use client";

import { Loader } from "@/components/loader/Loader";
import { LoaderProvider, useLoaderComplete } from "@/contexts/LoaderContext";

export default function ClientLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <LoaderProvider>
      <ClientLayoutContent>{children}</ClientLayoutContent>
    </LoaderProvider>
  );
}

function ClientLayoutContent({ children }: { children: React.ReactNode }) {
  const { setLoaderComplete } = useLoaderComplete();

  return (
    <>
      <Loader onComplete={() => setLoaderComplete(true)} />
      {children}
    </>
  );
}
