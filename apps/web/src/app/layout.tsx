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
      <body className="min-h-screen bg-[#090d16] text-slate-100 antialiased selection:bg-teal-500/30 selection:text-teal-200">
        <AuthProvider>
          <Navbar />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
