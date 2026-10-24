export const metadata = {
  title: "SECAPI — SEC EDGAR financials",
  description: "Cached SEC EDGAR financial data by ticker",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "ui-sans-serif, system-ui, sans-serif", margin: 0, background: "#0b0d10", color: "#e6e8eb" }}>
        {children}
      </body>
    </html>
  );
}
