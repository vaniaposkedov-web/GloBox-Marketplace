import { PasswordResetForm } from "@/features/password-reset";

export const metadata = {
  title: "Восстановление пароля — Marketplace",
};

export default function ForgotPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12">
      <PasswordResetForm />
    </main>
  );
}
