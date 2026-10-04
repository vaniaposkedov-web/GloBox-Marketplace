"use client";

import { useState } from "react";
import { Button, Upload } from "antd";
import {
  CheckCircleFilled,
  CloseCircleFilled,
  UploadOutlined,
} from "@ant-design/icons";
import type { UploadFile } from "antd/es/upload/interface";

interface PhotoUploadFieldProps {
  value: string | null;
  onChange: (url: string | null) => void;
  /** Заголовок (например, «Фото пропуска») */
  label?: string;
  /** Какой колбэк дернуть при beforeUpload — реальный мок-загрузчик */
  upload: (file: File) => Promise<{ url: string }>;
  /** Список «правильно» */
  good: string[];
  /** Список «неправильно» */
  bad: string[];
  /** Картинка-пример; если null — не показывается */
  exampleHint?: string;
}

/**
 * Универсальный uploader для документов: AntD Upload + checklist «правильно/
 * неправильно» рядом, согласно требованиям спеки 2.4 шаг 7 и 3.5 шаг 5.
 */
export function PhotoUploadField({
  value,
  onChange,
  label,
  upload,
  good,
  bad,
  exampleHint,
}: PhotoUploadFieldProps) {
  const [uploading, setUploading] = useState(false);
  const [list, setList] = useState<UploadFile[]>([]);

  return (
    <div className="rounded-2xl border border-amber-200/60 bg-gradient-to-br from-amber-50/50 to-orange-50/40 p-4">
      {label && (
        <div className="font-semibold text-foreground mb-2">{label}</div>
      )}

      <div className="grid sm:grid-cols-[1fr_auto] gap-4 items-start">
        {/* Tips */}
        <div className="space-y-2 order-2 sm:order-1">
          <div>
            <div className="text-xs font-bold text-emerald-700 uppercase tracking-wide mb-1">
              ✅ Правильно
            </div>
            <ul className="space-y-0.5">
              {good.map((g, i) => (
                <li
                  key={i}
                  className="flex items-start gap-1.5 text-sm text-foreground/85"
                >
                  <CheckCircleFilled className="text-emerald-500 mt-0.5 shrink-0" />
                  <span>{g}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="text-xs font-bold text-rose-700 uppercase tracking-wide mb-1">
              ❌ Неправильно
            </div>
            <ul className="space-y-0.5">
              {bad.map((b, i) => (
                <li
                  key={i}
                  className="flex items-start gap-1.5 text-sm text-foreground/85"
                >
                  <CloseCircleFilled className="text-rose-500 mt-0.5 shrink-0" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>
          {exampleHint && (
            <div className="text-xs text-muted italic mt-1">{exampleHint}</div>
          )}
        </div>

        {/* Uploader */}
        <div className="order-1 sm:order-2 sm:w-44">
          <Upload.Dragger
            accept="image/*"
            maxCount={1}
            fileList={list}
            onRemove={() => {
              setList([]);
              onChange(null);
              return true;
            }}
            beforeUpload={async (file) => {
              setUploading(true);
              try {
                const res = await upload(file);
                onChange(res.url);
                setList([
                  {
                    uid: String(Date.now()),
                    name: file.name,
                    status: "done",
                    url: res.url,
                  },
                ]);
              } finally {
                setUploading(false);
              }
              return false;
            }}
            listType="picture"
            className="!rounded-xl"
            style={{
              padding: 12,
              borderColor: "#fbbf24",
              background: "#fff",
            }}
          >
            {!value && (
              <div className="text-center py-2">
                <Button
                  icon={<UploadOutlined />}
                  loading={uploading}
                  type="primary"
                  className="!rounded-xl !shadow-md !shadow-amber-500/25"
                >
                  Выбрать файл
                </Button>
                <div className="text-[11px] text-muted mt-2 leading-tight">
                  JPG / PNG, до 10 МБ
                </div>
              </div>
            )}
          </Upload.Dragger>
        </div>
      </div>
    </div>
  );
}
