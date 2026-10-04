"use client";

import { useMemo, useState } from "react";
import { Alert, Button, Form, Input } from "antd";
import { MobileOutlined } from "@ant-design/icons";
import { validatePhone, PHONE_INVALID_USER_MESSAGE } from "@/shared/lib";
import { requestSupplierCode } from "../api";

interface Props {
  onSuccess: (
    phoneE164: string,
    devCode: string,
    masked: string,
    maxStartToken: string,
  ) => void;
}

export function SupplierPhoneStep({ onSuccess }: Props) {
  const [phone, setPhone] = useState("+7");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const validation = useMemo(() => validatePhone(phone), [phone]);

  async function handleSubmit() {
    setError(null);
    if (!validation.ok || !validation.e164) {
      setError(PHONE_INVALID_USER_MESSAGE);
      return;
    }
    setLoading(true);
    try {
      const res = await requestSupplierCode(validation.e164);
      onSuccess(validation.e164, res.devCode, res.maskedPhone, res.maxStartToken);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось отправить код");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Form layout="vertical" onFinish={handleSubmit} size="large">
      <div className="mb-4">
        <div className="text-lg font-semibold">Подтверждение номера</div>
        <div className="text-sm text-muted mt-1">
          Введите номер телефона — код придёт в мессенджер MAX.
          Номер используется как логин для входа в кабинет поставщика.
        </div>
      </div>

      {error && (
        <Alert type="error" message={error} showIcon className="!mb-3 !rounded-xl" />
      )}

      <Form.Item
        label="Номер телефона"
        validateStatus={!validation.ok && phone.length > 2 ? "warning" : undefined}
        help={
          !validation.ok && phone.length > 2 ? (
            <span className="text-xs">Формат: +7 999 123 45 67</span>
          ) : (
            <span className="text-xs text-muted">
              Россия, Казахстан, Беларусь и другие СНГ (кроме Украины)
            </span>
          )
        }
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

      <Button
        type="primary"
        htmlType="submit"
        block
        size="large"
        loading={loading}
        disabled={!validation.ok}
        className="!rounded-xl !font-semibold !shadow-md !shadow-amber-500/20"
      >
        Отправить код в MAX
      </Button>
    </Form>
  );
}
