export const metadata = {
  title: "FinAPI — Standardized SEC EDGAR Financials & Fundamental Metrics",
  description: "High-performance cached SEC EDGAR financial statement data, 91 standardized concepts, and computed financial ratios for 10,000+ public companies.",
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
