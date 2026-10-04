"use client";

import { useState } from "react";
import {
  Alert,
  Button,
  Checkbox,
  Form,
  InputNumber,
  Slider,
  Typography,
} from "antd";
import {
  MEDIATOR_COMMISSION_MAX,
  MEDIATOR_COMMISSION_MIN,
  MEDIATOR_COMMISSION_STEP,
  MEDIATOR_MIN_ORDER_FLOOR,
  MEDIATOR_MIN_ORDER_STEP,
  MEDIATOR_WORK_AREA_LABEL,
  type MediatorApplication,
} from "@/shared/lib";
import { PhotoUploadField } from "@/shared/ui";
import { uploadMediatorPhoto } from "../api";

interface Props {
  sessionToken: string;
  firstName: string;
  lastName: string;
  middleName: string;
  phoneE164: string;
  onBack: () => void;
  onSuccess: (payload: MediatorApplication) => Promise<void>;
}

export function MediatorTermsStep({
  sessionToken,
  firstName,
  lastName,
  middleName,
  phoneE164,
  onBack,
  onSuccess,
}: Props) {
  const [commissionRate, setCommissionRate] = useState(8);
  const [minOrderAmount, setMinOrderAmount] = useState(2000);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [passportPhotoUrl, setPassportPhotoUrl] = useState<string | null>(null);
  const [passSelfieUrl, setPassSelfieUrl] = useState<string | null>(null);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit() {
    setFormError(null);
    const e: Record<string, string> = {};
    if (
      commissionRate < MEDIATOR_COMMISSION_MIN ||
      commissionRate > MEDIATOR_COMMISSION_MAX
    ) {
      e.commissionRate = `Допустимо ${MEDIATOR_COMMISSION_MIN}–${MEDIATOR_COMMISSION_MAX}%`;
    }
    if (minOrderAmount < MEDIATOR_MIN_ORDER_FLOOR) {
      e.minOrderAmount = "Сумма не может быть отрицательной";
    }
    if (!avatarUrl) e.avatarUrl = "Загрузите аватарку";
    if (!passportPhotoUrl) e.passportPhotoUrl = "Загрузите фото паспорта";
    if (!passSelfieUrl) e.passSelfieUrl = "Загрузите селфи с пропуском";
    if (!acceptTerms) e.acceptTerms = "Необходимо принять условия";
    setErrors(e);
    if (Object.keys(e).length > 0) {
      setFormError("Проверьте отмеченные поля выше");
      return;
    }

    setSubmitting(true);
    try {
      const payload: MediatorApplication = {
        sessionToken,
        lastName,
        firstName,
        middleName,
        commissionRate,
        minOrderAmount,
        avatarUrl: avatarUrl!,
        passportPhotoUrl: passportPhotoUrl!,
        passSelfieUrl: passSelfieUrl!,
        acceptTerms: true,
      };
      await onSuccess(payload);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Не удалось отправить заявку",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Form layout="vertical" size="large" onFinish={handleSubmit}>
      <div className="mb-4">
        <div className="text-lg font-semibold">Условия работы</div>
        <div className="text-sm text-muted mt-1">
          Подтверждённый телефон:{" "}
          <span className="font-semibold text-foreground">{phoneE164}</span>{" "}
          ·{" "}
          <span className="text-amber-700 font-medium">{MEDIATOR_WORK_AREA_LABEL}</span>
        </div>
      </div>

      {/* Ставка */}
      <Typography.Title level={5} className="!mt-2 !mb-2">
        Процент комиссии
      </Typography.Title>
      <Form.Item
        validateStatus={errors.commissionRate ? "error" : undefined}
        help={
          errors.commissionRate ??
          "Удерживается с покупателя сверх стоимости товара."
        }
      >
        <div className="flex items-center gap-3">
          <Slider
            min={MEDIATOR_COMMISSION_MIN}
            max={MEDIATOR_COMMISSION_MAX}
            step={MEDIATOR_COMMISSION_STEP}
            value={commissionRate}
            onChange={(v) => setCommissionRate(v as number)}
            className="!flex-1"
          />
          <InputNumber
            value={commissionRate}
            onChange={(v) => setCommissionRate(Number(v ?? 0))}
            min={MEDIATOR_COMMISSION_MIN}
            max={MEDIATOR_COMMISSION_MAX}
            step={MEDIATOR_COMMISSION_STEP}
            addonAfter="%"
            className="!w-28"
          />
        </div>
      </Form.Item>

      {/* Мин. сумма */}
      <Typography.Title level={5} className="!mt-2 !mb-2">
        Минимальная сумма выкупа
      </Typography.Title>
      <Form.Item
        validateStatus={errors.minOrderAmount ? "error" : undefined}
        help={
          errors.minOrderAmount ??
          "Заказы дешевле этой суммы вы не принимаете. 0 — без ограничения."
        }
      >
        <InputNumber
          min={MEDIATOR_MIN_ORDER_FLOOR}
          step={MEDIATOR_MIN_ORDER_STEP}
          value={minOrderAmount}
          onChange={(v) => setMinOrderAmount(Number(v ?? 0))}
          addonAfter="₽"
          className="!w-44"
        />
      </Form.Item>

      {/* Фото */}
      <Typography.Title level={5} className="!mt-4 !mb-2">
        Фотографии
      </Typography.Title>
      <Form.Item
        required
        validateStatus={errors.avatarUrl ? "error" : undefined}
        help={errors.avatarUrl}
      >
        <PhotoUploadField
          label="Аватарка (видна покупателям в каталоге посредников)"
          value={avatarUrl}
          onChange={setAvatarUrl}
          upload={(f) => uploadMediatorPhoto(f, "avatar")}
          good={[
            "Лицо чётко видно по центру",
            "Одноцветный светлый фон",
            "Нейтральный взгляд, без фильтров",
          ]}
          bad={[
            "Солнцезащитные очки или маска",
            "Головной убор, закрывающий лицо",
            "Групповые фото или фото со спины",
          ]}
          exampleHint="Мин. разрешение 500×500 px"
        />
      </Form.Item>
      <Form.Item
        required
        validateStatus={errors.passportPhotoUrl ? "error" : undefined}
        help={errors.passportPhotoUrl}
      >
        <PhotoUploadField
          label="Разворот паспорта — страницы 2-3 (для модерации, не публикуется)"
          value={passportPhotoUrl}
          onChange={setPassportPhotoUrl}
          upload={(f) => uploadMediatorPhoto(f, "passport")}
          good={[
            "Разворот с фото полностью в кадре",
            "Читаемы все данные",
            "Без бликов и размытия",
          ]}
          bad={[
            "Одна из страниц обрезана",
            "Блики от вспышки или солнца",
            "Скан из Госуслуг (перефотографируйте оригинал)",
          ]}
          exampleHint="Мин. разрешение 1500×1000 px"
        />
      </Form.Item>
      <Form.Item
        required
        validateStatus={errors.passSelfieUrl ? "error" : undefined}
        help={errors.passSelfieUrl}
      >
        <PhotoUploadField
          label="Селфи с пропуском продавца Садовода"
          value={passSelfieUrl}
          onChange={setPassSelfieUrl}
          upload={(f) => uploadMediatorPhoto(f, "selfie")}
          good={[
            "Лицо и пропуск в одном кадре",
            "Текст бейджа читаем",
            "Лицо без очков и маски",
          ]}
          bad={[
            "Аватар вместо реального селфи",
            "Пропуск нечитаем",
            "Лицо вне кадра",
          ]}
        />
      </Form.Item>

      <Form.Item
        validateStatus={errors.acceptTerms ? "error" : undefined}
        help={errors.acceptTerms}
      >
        <Checkbox
          checked={acceptTerms}
          onChange={(e) => setAcceptTerms(e.target.checked)}
        >
          Понимаю, что платформа не участвует в денежных расчётах между
          покупателем, посредником и поставщиком
        </Checkbox>
      </Form.Item>

      {formError && (
        <Alert
          type="error"
          message={formError}
          showIcon
          className="!mb-3 !rounded-xl"
        />
      )}

      <div className="flex gap-2 mt-2">
        <Button
          size="large"
          onClick={onBack}
          className="!rounded-xl"
          disabled={submitting}
        >
          ← Назад
        </Button>
        <Button
          type="primary"
          htmlType="submit"
          loading={submitting}
          size="large"
          className="!rounded-xl !font-semibold !flex-1 !shadow-md !shadow-amber-500/20"
        >
          Отправить заявку
        </Button>
      </div>
    </Form>
  );
}

