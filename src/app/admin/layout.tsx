import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Panel Kendali · Ngeprint",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
