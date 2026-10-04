"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Input, Modal } from "antd";
import { MobileOutlined, UserOutlined } from "@ant-design/icons";
import { StepEmail } from "./step-email";
import { StepCode } from "./step-code";
import { completeRegistration } from "../api";
import { setSession } from "@/shared/auth";
import { fetchMe } from "@/features/auth-session";
import { validatePhone, PHONE_INVALID_USER_MESSAGE, nameSchema } from "@/shared/lib";
import { SuccessScreen } from "@/features/auth-methods/ui/success-screen";

type Stage =
  | { step: "email" }
  | { step: "code";    email: string; password: string; devCode?: string }
  | { step: "profile"; email: string; password: string; code: string }
  | { step: "success"; accessToken: string; userId: string }
  | { step: "done" };

interface Props {
  onDone?: (result: { accessToken: string; userId: string }) => void;
}

export function RegisterEmailForm({ onDone }: Props) {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>({ step: "email" });

  const isModalOpen = stage.step === "code" || stage.step === "profile" || stage.step === "success";

  return (
    <div className="w-full">
      {/* Step 1: email + password (main card) */}
      {stage.step === "email" && (
        <StepEmail
          onSuccess={(email, password, devCode) =>
            setStage({ step: "code", email, password, devCode })
          }
        />
      )}

      {/* OTP → Profile → Success modal */}
      <Modal
        open={isModalOpen}
        footer={null}
        closable={false}
        centered
        width="min(440px, calc(100vw - 24px))"
        style={{ borderRadius: 24 }}
        styles={{ body: { padding: "28px 24px" } }}
      >
        {stage.step === "code" && (
          <StepCode
            email={stage.email}
            devCode={stage.devCode}
            onSuccess={(code) =>
              setStage({ step: "profile", email: stage.email, password: stage.password, code })
            }
            onBack={() => setStage({ step: "email" })}
          />
        )}

        {stage.step === "profile" && (
          <ProfileFormInModal
            email={stage.email}
            code={stage.code}
            password={stage.password}
            onSuccess={async (result) => {
              setSession(result.accessToken, null);
              try {
                const me = await fetchMe();
                setSession(result.accessToken, {
                  id: me.id, email: me.email,
                  firstName: me.firstName, lastName: me.lastName,
                  role: me.role, roles: me.roles, avatarUrl: me.avatarUrl,
                });
              } catch { /* token saved anyway */ }
              setStage({ step: "success", accessToken: result.accessToken, userId: result.userId });
            }}
            onBack={() => setStage({ step: "code", email: stage.email, password: stage.password })}
          />
        )}

        {stage.step === "success" && (
          <SuccessScreen
            onRedirect={() => {
              const s = stage as { step: "success"; accessToken: string; userId: string };
              setStage({ step: "done" });
              if (onDone) onDone({ accessToken: s.accessToken, userId: s.userId });
              else router.push("/");
            }}
          />
        )}
      </Modal>
    </div>
  );
}

function ProfileFormInModal({
  email,
  code,
  password,
  onSuccess,
  onBack,
}: {
  email: string;
  code: string;
  password: string;
  onSuccess: (result: { accessToken: string; userId: string }) => void;
  onBack: () => void;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName,  setLastName]  = useState("");
  const [phone,     setPhone]     = useState("+7");
  const [error,     setError]     = useState<string | null>(null);
  const [loading,   setLoading]   = useState(false);

  const phoneVal = useMemo(() => validatePhone(phone), [phone]);
  const canSubmit = firstName.trim().length >= 2 && lastName.trim().length >= 2 && phoneVal.ok;

  async function handleSubmit() {
    setError(null);
    if (!nameSchema.safeParse(firstName.trim()).success) { setError("Введите имя (минимум 2 буквы)"); return; }
    if (!nameSchema.safeParse(lastName.trim()).success)  { setError("Введите фамилию (минимум 2 буквы)"); return; }
    if (!phoneVal.ok) { setError(PHONE_INVALID_USER_MESSAGE); return; }
    setLoading(true);
    try {
      const result = await completeRegistration({
        email, code, password,
        phone: phoneVal.e164 ?? phone,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });
      onSuccess(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка регистрации");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="text-center pb-1">
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-green-100 mb-2">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M4 10l4 4 8-8" stroke="#22c55e" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h3 className="text-lg font-extrabold text-foreground">Почти готово!</h3>
        <p className="text-xs text-muted mt-0.5">Email подтверждён — заполните профиль</p>
      </div>

      {error && <Alert type="error" message={error} showIcon className="!rounded-xl" />}

      <div className="grid grid-cols-2 gap-2">
        <Input
          prefix={<UserOutlined className="text-muted" />}
          placeholder="Имя"
          autoComplete="given-name"
          size="large"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          className="!rounded-xl"
        />
        <Input
          placeholder="Фамилия"
          autoComplete="family-name"
          size="large"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          className="!rounded-xl"
        />
      </div>

      <Input
        prefix={<MobileOutlined className="text-muted" />}
        placeholder="+7 999 123 45 67"
        inputMode="tel"
        autoComplete="tel"
        size="large"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        className="!rounded-xl"
        status={!phoneVal.ok && phone.length > 2 ? "warning" : undefined}
      />
      {!phoneVal.ok && phone.length > 2 && (
        <p className="text-xs text-amber-600 -mt-2">Формат: +7 999 123 45 67</p>
      )}

      <Button
        type="primary"
        block
        size="large"
        loading={loading}
        disabled={!canSubmit}
        onClick={handleSubmit}
        className="!rounded-xl !font-semibold !shadow-md !shadow-amber-500/20"
      >
        Создать профиль
      </Button>

      <button
        type="button"
        onClick={onBack}
        className="w-full text-xs text-muted hover:text-foreground text-center transition-colors"
      >
        ← Изменить код
      </button>
    </div>
  );
}

