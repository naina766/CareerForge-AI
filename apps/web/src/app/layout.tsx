import type { Metadata } from 'next';
import './globals.css';
import { Navbar } from '../components/Navbar';
import { AuthProvider } from '../context/AuthContext';

export const metadata: Metadata = {
  title: 'CareerForge AI — AI-Powered Career & Job Intelligence Platform',
  description: 'Explainable AI-powered resume matching, skill-gap analysis, RAG career assistant, and job intelligence.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#090d16] text-slate-100 antialiased selection:bg-blue-600/30 selection:text-blue-200">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2.5 focus:bg-blue-600 focus:text-white focus:font-semibold focus:rounded-xl focus:shadow-2xl focus:ring-2 focus:ring-white focus:outline-none transition-all text-xs"
        >
          Skip to main content
        </a>
        <AuthProvider>
          <Navbar />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
