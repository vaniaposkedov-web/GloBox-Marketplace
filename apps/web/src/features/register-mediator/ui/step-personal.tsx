"use client";

import { useMemo, useState } from "react";
import { Alert, Button, Form, Input } from "antd";
import { MobileOutlined } from "@ant-design/icons";
import {
  isValidPersonName,
  PHONE_INVALID_USER_MESSAGE,
  validatePhone,
} from "@/shared/lib";
import { requestMediatorCode } from "../api";

interface Props {
  initialFirstName: string;
  initialLastName: string;
  initialMiddleName: string;
  initialPhone: string;
  onSuccess: (data: {
    firstName: string;
    lastName: string;
    middleName: string;
    phoneE164: string;
    devCode: string;
    masked: string;
    maxStartToken: string;
  }) => void;
}

export function MediatorPersonalStep({
  initialFirstName,
  initialLastName,
  initialMiddleName,
  initialPhone,
  onSuccess,
}: Props) {
  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [middleName, setMiddleName] = useState(initialMiddleName);
  const [phone, setPhone] = useState(initialPhone || "+7");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const phoneCheck = useMemo(() => validatePhone(phone), [phone]);

  async function handleSubmit() {
    setFormError(null);
    const e: Record<string, string> = {};
    if (!isValidPersonName(lastName)) e.lastName = "Введите фамилию";
    if (!isValidPersonName(firstName)) e.firstName = "Введите имя";
    if (middleName.trim() && !isValidPersonName(middleName)) {
      e.middleName = "Только буквы, пробелы и дефисы";
    }
    if (!phoneCheck.ok || !phoneCheck.e164) {
      e.phone = PHONE_INVALID_USER_MESSAGE;
    }
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    setLoading(true);
    try {
      const res = await requestMediatorCode(phoneCheck.e164!);
      onSuccess({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        middleName: middleName.trim(),
        phoneE164: phoneCheck.e164!,
        devCode: res.devCode,
        masked: res.maskedPhone,
        maxStartToken: res.maxStartToken,
      });
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Не удалось отправить код",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Form layout="vertical" size="large" onFinish={handleSubmit}>
      <div className="mb-4">
        <div className="text-lg font-semibold">Кто вы?</div>
        <div className="text-sm text-muted mt-1">
          ФИО будет видно покупателям и поставщикам. Номер телефона мы
          подтвердим через мессенджер MAX.
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <Form.Item
          label="Фамилия"
          required
          validateStatus={errors.lastName ? "error" : undefined}
          help={errors.lastName}
        >
          <Input
            placeholder="Иванова"
            autoComplete="family-name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="!rounded-xl"
          />
        </Form.Item>
        <Form.Item
          label="Имя"
          required
          validateStatus={errors.firstName ? "error" : undefined}
          help={errors.firstName}
        >
          <Input
            placeholder="Анна"
            autoComplete="given-name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="!rounded-xl"
          />
        </Form.Item>
      </div>
      <Form.Item
        label="Отчество (необязательно)"
        validateStatus={errors.middleName ? "error" : undefined}
        help={errors.middleName}
      >
        <Input
          placeholder="Сергеевна"
          autoComplete="additional-name"
          value={middleName}
          onChange={(e) => setMiddleName(e.target.value)}
          className="!rounded-xl"
        />
      </Form.Item>

      <Form.Item
        label="Номер телефона"
        required
        validateStatus={errors.phone ? "error" : undefined}
        help={errors.phone ?? "На него придёт код в MAX"}
      >
        <Input
          prefix={<MobileOutlined className="text-muted" />}
          inputMode="tel"
          autoComplete="tel"
          placeholder="+7 999 123 45 67"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="!rounded-xl"
        />
      </Form.Item>

      {formError && (
        <Alert
          type="error"
          message={formError}
          showIcon
          className="!mb-3 !rounded-xl"
        />
      )}

      <Button
        type="primary"
        htmlType="submit"
        block
        size="large"
        loading={loading}
        disabled={!phoneCheck.ok}
        className="!rounded-xl !font-semibold !shadow-md !shadow-amber-500/20"
      >
        Отправить код в MAX
      </Button>
    </Form>
  );
}
