"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Result, Steps } from "antd";
import { setSession } from "@/shared/auth";
import type { MediatorApplication } from "@/shared/lib";
import { submitMediatorApplication } from "../api";
import { MediatorPersonalStep } from "./step-personal";
import { MediatorCodeStep } from "./step-code";
import { MediatorTermsStep } from "./step-terms";

type Stage =
  | { step: "personal" }
  | {
      step: "code";
      firstName: string;
      lastName: string;
      middleName: string;
      phoneE164: string;
      devCode: string;
      masked: string;
      maxStartToken: string;
    }
  | {
      step: "terms";
      firstName: string;
      lastName: string;
      middleName: string;
      phoneE164: string;
      sessionToken: string;
    }
  | { step: "submitted" };

export function RegisterMediatorForm() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>({ step: "personal" });

  const stepIndex =
    stage.step === "personal"
      ? 0
      : stage.step === "code"
        ? 1
        : stage.step === "terms"
          ? 2
          : 3;

  async function handleApply(payload: MediatorApplication) {
    const res = await submitMediatorApplication(payload);
    setSession(res.accessToken, {
      id: res.userId,
      email: "",
      firstName: payload.firstName,
      lastName: payload.lastName,
      role: "MEDIATOR",
      roles: ["MEDIATOR"],
      avatarUrl: payload.avatarUrl,
    });
    setStage({ step: "submitted" });
    setTimeout(() => router.push("/mediator/status"), 1100);
  }

  return (
    <div className="w-full max-w-xl mx-auto">
      <Steps
        current={stepIndex}
        size="small"
        items={[
          { title: "ФИО + телефон" },
          { title: "Код MAX" },
          { title: "Условия + фото" },
          { title: "На модерации" },
        ]}
      />
      <div className="mt-6">
        {stage.step === "personal" && (
          <MediatorPersonalStep
            initialFirstName=""
            initialLastName=""
            initialMiddleName=""
            initialPhone=""
            onSuccess={(d) =>
              setStage({
                step: "code",
                firstName: d.firstName,
                lastName: d.lastName,
                middleName: d.middleName,
                phoneE164: d.phoneE164,
                devCode: d.devCode,
                masked: d.masked,
                maxStartToken: d.maxStartToken,
              })
            }
          />
        )}
        {stage.step === "code" && (
          <MediatorCodeStep
            phoneE164={stage.phoneE164}
            initialDevCode={stage.devCode}
            masked={stage.masked}
            initialMaxToken={stage.maxStartToken}
            onBack={() => setStage({ step: "personal" })}
            onSuccess={(sessionToken) =>
              setStage({
                step: "terms",
                firstName: stage.firstName,
                lastName: stage.lastName,
                middleName: stage.middleName,
                phoneE164: stage.phoneE164,
                sessionToken,
              })
            }
          />
        )}
        {stage.step === "terms" && (
          <MediatorTermsStep
            sessionToken={stage.sessionToken}
            firstName={stage.firstName}
            lastName={stage.lastName}
            middleName={stage.middleName}
            phoneE164={stage.phoneE164}
            onBack={() =>
              setStage({
                step: "code",
                firstName: stage.firstName,
                lastName: stage.lastName,
                middleName: stage.middleName,
                phoneE164: stage.phoneE164,
                devCode: "",
                masked: stage.phoneE164,
                maxStartToken: "",
              })
            }
            onSuccess={handleApply}
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
