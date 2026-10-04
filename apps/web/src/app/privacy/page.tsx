import Link from "next/link";
import { ArrowLeftOutlined } from "@ant-design/icons";

export const metadata = {
  title: "Политика конфиденциальности — Globox",
};

const SECTIONS = [
  {
    title: "1. Общие положения",
    text: "Настоящая политика конфиденциальности (далее — «Политика») действует в отношении всей информации, которую ООО «Маркетплиззз» (далее — «Компания») может получить о пользователе в ходе использования сайта и сервисов Globox. Используя сервис, вы соглашаетесь с условиями данной Политики.",
  },
  {
    title: "2. Какие данные мы собираем",
    items: [
      "Имя, фамилия и контактные данные (телефон, email) при регистрации",
      "Данные профиля из социальных сетей (ВКонтакте, MAX) при авторизации через них",
      "Информация об устройстве и браузере (IP-адрес, User-Agent)",
      "История заказов, отзывов и взаимодействий с платформой",
      "Файлы cookie и аналогичные технологии",
    ],
  },
  {
    title: "3. Цели обработки данных",
    items: [
      "Создание и управление учётной записью пользователя",
      "Оказание услуг по покупке и продаже товаров на платформе",
      "Отправка уведомлений о заказах и акциях (при согласии пользователя)",
      "Обеспечение безопасности и предотвращение мошенничества",
      "Улучшение качества сервиса на основе аналитики",
    ],
  },
  {
    title: "4. Хранение и защита данных",
    text: "Данные хранятся на защищённых серверах в России. Мы применяем шифрование, ограничение доступа и регулярный аудит безопасности. Персональные данные не передаются третьим лицам без согласия пользователя, за исключением случаев, предусмотренных законодательством РФ.",
  },
  {
    title: "5. Права пользователей",
    items: [
      "Запросить копию хранимых персональных данных",
      "Потребовать исправления неточных данных",
      "Запросить удаление аккаунта и всех связанных данных",
      "Отозвать согласие на получение маркетинговых уведомлений",
      "Обратиться с жалобой в Роскомнадзор",
    ],
  },
  {
    title: "6. Cookies",
    text: "Сайт использует cookie-файлы для обеспечения работы авторизации, сохранения настроек и аналитики. Вы можете отключить cookie в настройках браузера, однако это может привести к некорректной работе некоторых функций сервиса.",
  },
  {
    title: "7. Изменения политики",
    text: "Компания оставляет за собой право изменять данную Политику. Актуальная версия всегда доступна на этой странице. Продолжение использования сервиса после изменений означает согласие с новой редакцией.",
  },
  {
    title: "8. Контакты",
    text: "По вопросам обработки персональных данных: privacy@marketplizzzz.com",
  },
];

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 px-4 py-10">
      <div className="max-w-2xl mx-auto">
        {/* Back */}
        <div className="mb-8">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl bg-white/80 backdrop-blur border border-amber-200 shadow-sm hover:shadow-md text-sm font-medium text-muted hover:text-foreground transition-all"
          >
            <ArrowLeftOutlined style={{ fontSize: 11 }} />
            Назад
          </Link>
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            Политика конфиденциальности
          </h1>
          <p className="text-sm text-muted mt-2">
            Последнее обновление: 30 апреля 2025 г.
          </p>
        </div>

        {/* Sections */}
        <div className="space-y-6">
          {SECTIONS.map((s) => (
            <section
              key={s.title}
              className="bg-white/80 backdrop-blur rounded-2xl border border-border p-5 shadow-sm"
            >
              <h2 className="font-bold text-base text-foreground mb-2">{s.title}</h2>
              {s.text && (
                <p className="text-sm text-muted leading-relaxed">{s.text}</p>
              )}
              {s.items && (
                <ul className="mt-2 space-y-1">
                  {s.items.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-muted">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>

        <p className="mt-8 text-center text-xs text-muted">
          © {new Date().getFullYear()} Globox. Все права защищены.
        </p>
      </div>
    </main>
  );
}
