import { AuthProvider } from "@/components/providers/AuthProvider";
import { WebSocketProvider } from "@/components/providers/WebSocketProvider";

export default function EditorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <WebSocketProvider>
        <div className="h-full bg-bg-primary text-text-primary font-mono text-[13px]">
          {children}
        </div>
      </WebSocketProvider>
    </AuthProvider>
  );
}
