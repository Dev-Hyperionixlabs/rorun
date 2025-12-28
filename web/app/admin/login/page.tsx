import { AdminLoginCard } from "./login-card";

export default function AdminLoginPage({
  searchParams,
}: {
  searchParams?: { reason?: string };
}) {
  const reason = searchParams?.reason || null;
  return <AdminLoginCard reason={reason} />;
}


