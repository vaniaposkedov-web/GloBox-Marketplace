"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Result, Steps } from "antd";
import { setSession } from "@/shared/auth";
import type { SupplierApplication } from "@/shared/lib";
import { submitSupplierApplication } from "../api";
import { SupplierPhoneStep } from "./step-phone";
import { SupplierCodeStep } from "./step-code";
import { SupplierDetailsStep } from "./step-details";

type Stage =
  | { step: "phone" }
  | {
      step: "code";
      phoneE164: string;
      devCode: string;
      masked: string;
      maxStartToken: string;
    }
  | { step: "details"; phoneE164: string; sessionToken: string }
  | { step: "submitted" };

export function RegisterSupplierForm() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>({ step: "phone" });

  const stepIndex =
    stage.step === "phone"
      ? 0
      : stage.step === "code"
        ? 1
        : stage.step === "details"
          ? 2
          : 3;

  async function handleSubmitApplication(payload: SupplierApplication) {
    const res = await submitSupplierApplication(payload);
    setSession(res.accessToken, {
      id: res.userId,
      email: "",
      firstName: payload.firstName,
      lastName: payload.lastName,
      role: "SUPPLIER",
      roles: ["SUPPLIER"],
      avatarUrl: null,
    });
    setStage({ step: "submitted" });
    setTimeout(() => router.push("/seller/status"), 1100);
  }

  return (
    <div className="w-full max-w-xl mx-auto">
      <Steps
        current={stepIndex}
        size="small"
        items={[
          { title: "Телефон" },
          { title: "Код MAX" },
          { title: "Анкета" },
          { title: "На модерации" },
        ]}
      />
      <div className="mt-6">
        {stage.step === "phone" && (
          <SupplierPhoneStep
            onSuccess={(phoneE164, devCode, masked, maxStartToken) =>
              setStage({
                step: "code",
                phoneE164,
                devCode,
                masked,
                maxStartToken,
              })
            }
          />
        )}
        {stage.step === "code" && (
          <SupplierCodeStep
            phoneE164={stage.phoneE164}
            initialDevCode={stage.devCode}
            masked={stage.masked}
            initialMaxToken={stage.maxStartToken}
            onBack={() => setStage({ step: "phone" })}
            onSuccess={(sessionToken) =>
              setStage({
                step: "details",
                phoneE164: stage.phoneE164,
                sessionToken,
              })
            }
          />
        )}
        {stage.step === "details" && (
          <SupplierDetailsStep
            phoneE164={stage.phoneE164}
            sessionToken={stage.sessionToken}
            onBack={() =>
              setStage({
                step: "code",
                phoneE164: stage.phoneE164,
                devCode: "",
                masked: stage.phoneE164,
                maxStartToken: "",
              })
            }
            onSuccess={handleSubmitApplication}
          />
        )}
        {stage.step === "submitted" && (
          <Result
            status="success"
            title="Заявка отправлена!"
            subTitle="Мы рассмотрим её в течение 24 часов и пришлём решение в кабинет."
          />
        )}
      </div>
    </div>
  );
}
