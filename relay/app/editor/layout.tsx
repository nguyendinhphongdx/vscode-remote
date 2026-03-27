import { AuthProvider } from "@/components/providers/AuthProvider";
import { WebSocketProvider } from "@/components/providers/WebSocketProvider";

export default function EditorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <WebSocketProvider>{children}</WebSocketProvider>
    </AuthProvider>
  );
}
