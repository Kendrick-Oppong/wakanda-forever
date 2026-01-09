import ClientLayout from "@/components/ClientLayout";

export default function Home() {
  return (
    <ClientLayout>
      <main className="min-h-screen bg-background text-foreground selection:bg-white selection:text-black">
        home
      </main>
    </ClientLayout>
  );
}
