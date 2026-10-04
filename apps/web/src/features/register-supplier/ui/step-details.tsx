"use client";

import { useState } from "react";
import {
  Alert,
  Button,
  Checkbox,
  Form,
  Input,
  Radio,
  Select,
  Tag,
  Typography,
} from "antd";
import {
  isValidInn,
  isValidOgrn,
  isValidPavilionNumber,
  isValidPersonName,
  SUPPLIER_CATEGORIES_MAX,
  SUPPLIER_ENTITY_TYPES,
  SUPPLIER_LOCATIONS,
  SUPPLIER_TOP_CATEGORIES,
  type SupplierApplication,
  type SupplierCategoryId,
  type SupplierEntityType,
  type SupplierLocationId,
} from "@/shared/lib";
import { PhotoUploadField } from "@/shared/ui";
import { uploadSupplierPhoto } from "../api";

interface Props {
  sessionToken: string;
  phoneE164: string;
  onSuccess: (payload: SupplierApplication) => Promise<void>;
  onBack: () => void;
}

interface FormState {
  lastName: string;
  firstName: string;
  middleName: string;
  locationId: SupplierLocationId | null;
  pavilionNumber: string;
  entityType: SupplierEntityType | null;
  categories: SupplierCategoryId[];
  inn: string;
  ogrnip: string;
  passPhotoUrl: string | null;
  passSelfieUrl: string | null;
  acceptTerms: boolean;
}

const initial: FormState = {
  lastName: "",
  firstName: "",
  middleName: "",
  locationId: null,
  pavilionNumber: "",
  entityType: null,
  categories: [],
  inn: "",
  ogrnip: "",
  passPhotoUrl: null,
  passSelfieUrl: null,
  acceptTerms: false,
};

export function SupplierDetailsStep({
  sessionToken,
  phoneE164,
  onSuccess,
  onBack,
}: Props) {
  const [v, setV] = useState<FormState>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setV((prev) => ({ ...prev, [key]: value }));
  }

  function validate(): Record<string, string> {
    const e: Record<string, string> = {};
    if (!isValidPersonName(v.lastName)) e.lastName = "Введите фамилию";
    if (!isValidPersonName(v.firstName)) e.firstName = "Введите имя";
    if (v.middleName.trim() && !isValidPersonName(v.middleName)) {
      e.middleName = "Только буквы, пробелы и дефисы";
    }
    if (!v.locationId) e.locationId = "Выберите локацию";
    if (!isValidPavilionNumber(v.pavilionNumber)) {
      e.pavilionNumber = "Укажите номер павильона";
    }
    if (!v.entityType) e.entityType = "Выберите правовую форму";
    if (v.categories.length < 1)
      e.categories = "Выберите хотя бы одну категорию";
    if (v.categories.length > SUPPLIER_CATEGORIES_MAX) {
      e.categories = `Максимум ${SUPPLIER_CATEGORIES_MAX} категории`;
    }
    if (v.inn.trim() && !isValidInn(v.inn)) {
      e.inn = "ИНН должен содержать 10 или 12 цифр";
    }
    if (v.ogrnip.trim() && !isValidOgrn(v.ogrnip)) {
      e.ogrnip = "ОГРН/ОГРНИП — 13 или 15 цифр";
    }
    if (!v.passPhotoUrl) e.passPhotoUrl = "Загрузите фото пропуска";
    if (!v.passSelfieUrl) e.passSelfieUrl = "Загрузите селфи с пропуском";
    if (!v.acceptTerms) e.acceptTerms = "Необходимо принять условия";
    return e;
  }

  async function handleSubmit() {
    setFormError(null);
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) {
      setFormError("Проверьте отмеченные поля выше");
      return;
    }
    setSubmitting(true);
    try {
      const payload: SupplierApplication = {
        sessionToken,
        lastName: v.lastName.trim(),
        firstName: v.firstName.trim(),
        middleName: v.middleName.trim(),
        locationId: v.locationId!,
        pavilionNumber: v.pavilionNumber.trim(),
        entityType: v.entityType!,
        categories: v.categories,
        inn: v.inn.trim() || undefined,
        ogrnip: v.ogrnip.trim() || undefined,
        passPhotoUrl: v.passPhotoUrl!,
        passSelfieUrl: v.passSelfieUrl!,
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

  const selectedLocation = SUPPLIER_LOCATIONS.find(
    (l) => l.id === v.locationId,
  );

  return (
    <Form layout="vertical" size="large" onFinish={handleSubmit}>
      <div className="mb-4">
        <div className="text-lg font-semibold">Анкета поставщика</div>
        <div className="text-sm text-muted mt-1">
          Подтверждённый телефон:{" "}
          <span className="font-semibold text-foreground">{phoneE164}</span>
        </div>
      </div>

      {/* ФИО */}
      <Typography.Title level={5} className="!mt-2 !mb-2">
        ФИО
      </Typography.Title>
      <div className="grid sm:grid-cols-2 gap-3">
        <Form.Item
          label="Фамилия"
          required
          validateStatus={errors.lastName ? "error" : undefined}
          help={errors.lastName}
        >
          <Input
            placeholder="Иванов"
            autoComplete="family-name"
            value={v.lastName}
            onChange={(e) => update("lastName", e.target.value)}
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
            placeholder="Иван"
            autoComplete="given-name"
            value={v.firstName}
            onChange={(e) => update("firstName", e.target.value)}
            className="!rounded-xl"
          />
        </Form.Item>
      </div>
      <Form.Item
        label="Отчество (необязательно)"
        validateStatus={errors.middleName ? "error" : undefined}
        help={errors.middleName ?? "Можно оставить пустым для иностранцев"}
      >
        <Input
          placeholder="Иванович"
          autoComplete="additional-name"
          value={v.middleName}
          onChange={(e) => update("middleName", e.target.value)}
          className="!rounded-xl"
        />
      </Form.Item>

      {/* Локация */}
      <Typography.Title level={5} className="!mt-4 !mb-2">
        Торговая точка
      </Typography.Title>
      <Form.Item
        label="Локация"
        required
        validateStatus={errors.locationId ? "error" : undefined}
        help={errors.locationId}
      >
        <Radio.Group
          value={v.locationId ?? undefined}
          onChange={(e) => update("locationId", e.target.value)}
          className="!flex !flex-col !gap-2"
        >
          {SUPPLIER_LOCATIONS.map((l) => (
            <Radio key={l.id} value={l.id} className="!items-start">
              <span className="font-medium">{l.label}</span>
              <span className="text-xs text-muted ml-2">
                Формат: {l.pavilionFormat}
              </span>
            </Radio>
          ))}
        </Radio.Group>
      </Form.Item>
      <Form.Item
        label={`Номер павильона${selectedLocation ? ` (${selectedLocation.pavilionFormat})` : ""}`}
        required
        validateStatus={errors.pavilionNumber ? "error" : undefined}
        help={errors.pavilionNumber}
      >
        <Input
          placeholder={selectedLocation?.pavilionFormat ?? "2А-35"}
          value={v.pavilionNumber}
          onChange={(e) => update("pavilionNumber", e.target.value)}
          className="!rounded-xl"
        />
      </Form.Item>

      {/* Тип субъекта */}
      <Typography.Title level={5} className="!mt-4 !mb-2">
        Правовая форма
      </Typography.Title>
      <Form.Item
        required
        validateStatus={errors.entityType ? "error" : undefined}
        help={errors.entityType}
      >
        <Radio.Group
          value={v.entityType ?? undefined}
          onChange={(e) => update("entityType", e.target.value)}
          className="!flex !flex-col !gap-2"
        >
          {SUPPLIER_ENTITY_TYPES.map((t) => (
            <Radio key={t.id} value={t.id}>
              {t.label}
            </Radio>
          ))}
        </Radio.Group>
      </Form.Item>

      {/* Категории */}
      <Typography.Title level={5} className="!mt-4 !mb-2">
        Категории товаров (до {SUPPLIER_CATEGORIES_MAX})
      </Typography.Title>
      <Form.Item
        required
        validateStatus={errors.categories ? "error" : undefined}
        help={
          errors.categories ??
          `Выбрано: ${v.categories.length} из ${SUPPLIER_CATEGORIES_MAX}`
        }
      >
        <Select
          mode="multiple"
          placeholder="Выберите 1–3 категории верхнего уровня"
          value={v.categories}
          onChange={(values: SupplierCategoryId[]) => {
            if (values.length <= SUPPLIER_CATEGORIES_MAX) {
              update("categories", values);
            }
          }}
          maxTagCount="responsive"
          className="!rounded-xl"
          options={SUPPLIER_TOP_CATEGORIES.map((c) => ({
            value: c.id,
            label: c.label,
          }))}
        />
        {v.categories.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {v.categories.map((id) => {
              const label =
                SUPPLIER_TOP_CATEGORIES.find((c) => c.id === id)?.label ?? id;
              return (
                <Tag key={id} color="orange" className="!rounded-lg">
                  {label}
                </Tag>
              );
            })}
          </div>
        )}
      </Form.Item>

      {/* ИНН/ОГРН */}
      <Typography.Title level={5} className="!mt-4 !mb-2">
        Документы (необязательно)
      </Typography.Title>
      <div className="grid sm:grid-cols-2 gap-3">
        <Form.Item
          label="ИНН"
          validateStatus={errors.inn ? "error" : undefined}
          help={errors.inn ?? "10 или 12 цифр"}
        >
          <Input
            inputMode="numeric"
            placeholder="7707083893"
            value={v.inn}
            onChange={(e) => update("inn", e.target.value.replace(/\D/g, ""))}
            maxLength={12}
            className="!rounded-xl"
          />
        </Form.Item>
        <Form.Item
          label="ОГРН / ОГРНИП"
          validateStatus={errors.ogrnip ? "error" : undefined}
          help={errors.ogrnip ?? "13 или 15 цифр"}
        >
          <Input
            inputMode="numeric"
            placeholder="1234567890123"
            value={v.ogrnip}
            onChange={(e) =>
              update("ogrnip", e.target.value.replace(/\D/g, ""))
            }
            maxLength={15}
            className="!rounded-xl"
          />
        </Form.Item>
      </div>

      {/* Фото */}
      <Typography.Title level={5} className="!mt-4 !mb-2">
        Фотографии для проверки модерации
      </Typography.Title>
      <Form.Item
        required
        validateStatus={errors.passPhotoUrl ? "error" : undefined}
        help={errors.passPhotoUrl}
      >
        <PhotoUploadField
          label="Фото пропуска (фронтальная сторона)"
          value={v.passPhotoUrl}
          onChange={(url) => update("passPhotoUrl", url)}
          upload={uploadSupplierPhoto}
          good={[
            "Пропуск полностью в кадре",
            "Читаемые ФИО, номер, печать",
            "Чёткое фото без бликов",
          ]}
          bad={[
            "Пропуск обрезан или не влез в кадр",
            "Размыто, текст не читается",
            "Яркие блики от вспышки",
          ]}
          exampleHint="Мин. разрешение 1000×1000 px"
        />
      </Form.Item>
      <Form.Item
        required
        validateStatus={errors.passSelfieUrl ? "error" : undefined}
        help={errors.passSelfieUrl}
      >
        <PhotoUploadField
          label="Селфи с пропуском (лицо + пропуск в одном кадре)"
          value={v.passSelfieUrl}
          onChange={(url) => update("passSelfieUrl", url)}
          upload={uploadSupplierPhoto}
          good={[
            "Лицо чётко видно без очков и маски",
            "Пропуск рядом с лицом",
            "Ровный свет, светлый фон",
          ]}
          bad={[
            "Сильная тень на лице",
            "Пропуск далеко или нечитаем",
            "Солнцезащитные очки",
          ]}
        />
      </Form.Item>

      <Form.Item
        validateStatus={errors.acceptTerms ? "error" : undefined}
        help={errors.acceptTerms}
      >
        <Checkbox
          checked={v.acceptTerms}
          onChange={(e) => update("acceptTerms", e.target.checked)}
        >
          Принимаю условия размещения и обработки персональных данных
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

