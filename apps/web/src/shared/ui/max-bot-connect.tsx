"use client";

import Image from "next/image";
import { Alert, Button } from "antd";
import { QrcodeOutlined, MessageOutlined } from "@ant-design/icons";

interface MaxBotConnectProps {
  /** Имя бота без @, например GloBoxSellerBot или GloBoxMediatorBot */
  botName: string;
  /** Уникальный токен сессии для deep-link `?start=<token>` */
  sessionToken?: string;
  /** Заголовок над блоком */
  title?: string;
  /** Описание */
  description?: string;
}

/**
 * Унифицированный блок «Открыть в MAX»: кнопка с deep-link и QR-код для
 * десктопа (генерируется через api.qrserver.com — без локальных зависимостей).
 *
 * Соответствует ТЗ блок 2.4 шаг 1 и блок 3.5 шаг 2:
 *   max://bot/<BotName>?start=<session_token>
 *
 * Пока MAX-бот не подключён, визуально работает как анимированный
 * placeholder — пользователь может скопировать ссылку или отсканировать QR.
 */
export function MaxBotConnect({
  botName,
  sessionToken,
  title = "Откройте бота в MAX",
  description,
}: MaxBotConnectProps) {
  const deepLink = sessionToken
    ? `max://bot/${botName}?start=${encodeURIComponent(sessionToken)}`
    : `max://bot/${botName}`;
  const fallbackHttps = sessionToken
    ? `https://max.ru/bot/${botName}?start=${encodeURIComponent(sessionToken)}`
    : `https://max.ru/bot/${botName}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(
    deepLink,
  )}&size=160x160&bgcolor=fffdf9&color=3b2415&margin=8`;

  return (
    <div className="rounded-2xl border border-amber-200/60 bg-gradient-to-br from-amber-50 to-orange-50 p-4 mb-3">
      <div className="flex items-start gap-4">
        <div className="hidden sm:flex shrink-0">
          <div className="rounded-xl border border-amber-200 bg-white p-1.5 shadow-md shadow-amber-500/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrUrl}
              alt={`QR-код для @${botName}`}
              width={120}
              height={120}
              className="rounded-lg"
            />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 text-amber-900 font-semibold">
            <MessageOutlined /> {title}
          </div>
          <p className="text-xs text-amber-900/75 mt-1 leading-snug">
            {description ??
              `Нажмите кнопку — откроется чат с ботом @${botName} в мессенджере MAX. На десктопе отсканируйте QR-код через мобильное приложение MAX.`}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="primary"
              size="middle"
              href={deepLink}
              icon={<MessageOutlined />}
              className="!rounded-xl !font-semibold !shadow-md !shadow-amber-500/25"
            >
              Открыть в MAX
            </Button>
            <Button
              size="middle"
              href={fallbackHttps}
              target="_blank"
              rel="noopener"
              icon={<QrcodeOutlined />}
              className="!rounded-xl"
            >
              Не открылось — ссылкой
            </Button>
          </div>
        </div>
      </div>
      <Alert
        type="info"
        showIcon
        className="!mt-3 !rounded-xl !bg-white/60 !border-amber-200"
        message="После /start бот попросит поделиться контактом — нажмите «Отправить номер». Бот пришлёт 6-значный код, его нужно ввести ниже."
      />
    </div>
  );
}

