import "./globals.css";

export const metadata = {
  title: "Feetsball 2026",
  description: "Weekly College Football Challenge",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0 }}>
        {children}
      </body>
    </html>
  );
}