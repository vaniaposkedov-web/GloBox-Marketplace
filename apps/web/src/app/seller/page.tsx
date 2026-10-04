"use client";

import Link from "next/link";
import { Button, Collapse } from "antd";
import {
  ArrowRightOutlined,
  CheckCircleFilled,
  DollarOutlined,
  IdcardOutlined,
  LineChartOutlined,
  MobileOutlined,
  RocketOutlined,
  SafetyCertificateOutlined,
  ShopOutlined,
  StarFilled,
  TeamOutlined,
  ThunderboltFilled,
  TrophyOutlined,
} from "@ant-design/icons";
import { SiteHeader } from "@/widgets/header";
import { SUPPLIER_REVIEW_SLA_HOURS } from "@/shared/lib";
import { useSession, isSupplier } from "@/shared/auth";
import { ScrollReveal } from "@/shared/ui/scroll-reveal";
import { useScrollReveal } from "@/shared/hooks/use-scroll-reveal";

export default function SellerLandingPage() {
  const { user, hydrated } = useSession();
  const alreadySupplier = isSupplier(user?.role, user?.roles);

  const ctaButton = hydrated && alreadySupplier ? (
    <Link href="/seller/status">
      <Button
        type="primary"
        size="large"
        className="!rounded-xl !font-semibold !shadow-lg !shadow-amber-500/30 !h-12 !px-8 !text-base !w-full sm:!w-auto"
        icon={<ArrowRightOutlined />}
      >
        Открыть кабинет
      </Button>
    </Link>
  ) : (
    <Button
      type="primary"
      size="large"
      className="!rounded-xl !font-semibold !shadow-lg !shadow-amber-500/30 !h-12 !px-8 !text-base !w-full sm:!w-auto"
      icon={<ThunderboltFilled />}
      onClick={() => alert("Регистрация поставщиков скоро будет доступна на seller-globox.ru")}
    >
      Стать поставщиком — бесплатно
    </Button>
  );

  return (
    <div className="min-h-screen flex flex-col bg-stone-50">
      <SiteHeader />
      <main className="flex-1">

        {/* ══════ HERO ══════ */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-100/80 via-orange-50/60 to-rose-50/40" />
          <div className="absolute inset-0 pointer-events-none" aria-hidden>
            <div className="absolute -top-24 -left-24 w-[20rem] sm:w-[36rem] h-[20rem] sm:h-[36rem] rounded-full bg-amber-300/25 blur-3xl blob-float-a" />
            <div className="absolute -bottom-32 right-0 w-[16rem] sm:w-[30rem] h-[16rem] sm:h-[30rem] rounded-full bg-rose-300/20 blur-3xl blob-float-b" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[28rem] sm:w-[50rem] h-[28rem] sm:h-[50rem] rounded-full bg-orange-200/10 blur-3xl blob-float-c" />
          </div>

          <div className="relative max-w-6xl mx-auto px-4 pt-10 pb-14 sm:pt-16 sm:pb-20 lg:pt-24 lg:pb-28">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-600/10 border border-amber-600/20 text-amber-700 text-sm font-semibold mb-6 fade-in-up" style={{ animationDelay: '0.1s' }}>
              <ShopOutlined />
              Для продавцов ТК «Садовод»
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black leading-[1.1] max-w-4xl tracking-tight fade-in-up" style={{ animationDelay: '0.25s' }}>
              Ваш павильон —{" "}
              <span className="bg-gradient-to-r from-amber-600 via-orange-500 to-rose-500 bg-clip-text text-transparent gradient-text-animated">
                теперь онлайн
              </span>
            </h1>

            <p className="mt-4 sm:mt-6 text-base sm:text-lg md:text-xl text-stone-600 max-w-2xl leading-relaxed fade-in-up" style={{ animationDelay: '0.4s' }}>
              Globox — цифровая витрина для продавцов Садовода.
              Покупатели со всей России находят ваши товары в каталоге,
              а вы получаете заказы в личном кабинете.
              Без сайта, без рекламы, без абонплаты.
            </p>

            <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 fade-in-up" style={{ animationDelay: '0.55s' }}>
              {ctaButton}
              <Link href="/mediator" className="sm:w-auto">
                <Button size="large" className="!rounded-xl !h-12 !px-6 !font-medium !w-full sm:!w-auto">
                  <TeamOutlined /> Я посредник
                </Button>
              </Link>
            </div>

            {/* Trust badges */}
            <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-2 sm:gap-x-6 sm:gap-y-2 text-xs sm:text-sm text-stone-500 fade-in-up" style={{ animationDelay: '0.65s' }}>
              <span className="flex items-center gap-1.5">
                <CheckCircleFilled className="text-green-500" /> Бесплатное подключение
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircleFilled className="text-green-500" /> Модерация за {SUPPLIER_REVIEW_SLA_HOURS} часа
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircleFilled className="text-green-500" /> Работает с ИП, ООО, самозанятыми
              </span>
            </div>

            {/* Stats bar */}
            <div className="mt-8 sm:mt-12 grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
              {[
                { value: "30 000+",  label: "Продавцов на Садоводе", icon: <ShopOutlined /> },
                { value: "100 000+", label: "Покупателей в день",    icon: <TeamOutlined /> },
                { value: "0 ₽",     label: "За подключение",        icon: <DollarOutlined /> },
                { value: "24/7",    label: "Приём заказов",          icon: <LineChartOutlined /> },
              ].map((s, i) => (
                <div
                  key={i}
                  className="rounded-2xl bg-white/80 backdrop-blur border border-amber-200/60 p-4 text-center shadow-sm pop-in hover-float"
                  style={{ animationDelay: `${0.7 + i * 0.1}s` }}
                >
                  <div className="text-amber-600 text-lg mb-1">{s.icon}</div>
                  <div className="text-xl sm:text-2xl md:text-3xl font-black text-stone-800">{s.value}</div>
                  <div className="text-xs text-stone-500 mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════ ПОЧЕМУ GLOBOX ══════ */}
        <section className="py-12 sm:py-16 lg:py-20 bg-white">
          <div className="max-w-6xl mx-auto px-4">
            <ScrollReveal animation="fade-up" className="text-center mb-8 sm:mb-12">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold uppercase tracking-wider mb-4">
                <StarFilled /> Преимущества
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold">
                Почему продавцы выбирают Globox
              </h2>
              <p className="mt-3 text-stone-500 max-w-xl mx-auto">
                Мы создали платформу специально под реалии рынка «Садовод» — здесь всё заточено под вас
              </p>
            </ScrollReveal>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[
                {
                  icon: <DollarOutlined className="text-2xl" />,
                  title: "Бесплатный старт",
                  text: "Нет абонплаты, нет платы за размещение. Регистрация, публикация товаров — 0 ₽. Комиссия только при продаже.",
                  color: "amber",
                },
                {
                  icon: <RocketOutlined className="text-2xl" />,
                  title: "Быстрый запуск",
                  text: "Заполните анкету за 10 минут, загрузите фото пропуска. Модерация — до 24 часов. На следующий день вы уже принимаете заказы.",
                  color: "orange",
                },
                {
                  icon: <MobileOutlined className="text-2xl" />,
                  title: "Заказы прямо в MAX",
                  text: "Уведомления о новых заказах приходят в мессенджер MAX — вы всегда на связи, даже если нет под рукой компьютера.",
                  color: "rose",
                },
                {
                  icon: <SafetyCertificateOutlined className="text-2xl" />,
                  title: "Верификация продавцов",
                  text: "Каждый поставщик проходит проверку: фото пропуска, селфи, ФИО. Покупатели доверяют — конверсия растёт.",
                  color: "emerald",
                },
                {
                  icon: <LineChartOutlined className="text-2xl" />,
                  title: "Онлайн-покупатели со всей РФ",
                  text: "Садовод — крупнейший рынок России. Через Globox ваши товары увидят не только москвичи, но и покупатели из регионов.",
                  color: "blue",
                },
                {
                  icon: <TeamOutlined className="text-2xl" />,
                  title: "Посредники работают на вас",
                  text: "Встроенная система посредников: они выкупают товар для покупателей из других городов. Больше заказов без усилий.",
                  color: "purple",
                },
              ].map((b, i) => (
                <ScrollReveal key={i} animation="fade-up" delay={i * 0.08}>
                  <div className="group rounded-2xl border border-stone-200 bg-stone-50/50 p-6 hover:shadow-lg hover:border-amber-300 hover-float hover-accent-left transition-all duration-300 h-full">
                    <div className={`w-12 h-12 rounded-xl bg-${b.color}-100 text-${b.color}-600 flex items-center justify-center mb-4 group-hover:icon-bounce`}>
                      {b.icon}
                    </div>
                    <h3 className="text-lg font-bold mb-2">{b.title}</h3>
                    <p className="text-sm text-stone-500 leading-relaxed">{b.text}</p>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        {/* ══════ КАК ЭТО РАБОТАЕТ ══════ */}
        <section className="py-12 sm:py-16 lg:py-20 bg-gradient-to-b from-stone-50 to-white">
          <div className="max-w-6xl mx-auto px-4">
            <ScrollReveal animation="fade-up" className="text-center mb-8 sm:mb-12">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold">
                Как стать поставщиком за 4 шага
              </h2>
              <p className="mt-3 text-stone-500">
                Регистрация занимает 10 минут. Всё онлайн.
              </p>
            </ScrollReveal>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  step: 1,
                  title: "Подтвердите телефон",
                  text: "Введите номер и подтвердите через MAX-бот. Это ваш логин и канал связи с покупателями.",
                  icon: <MobileOutlined className="text-2xl" />,
                },
                {
                  step: 2,
                  title: "Заполните анкету",
                  text: "ФИО, корпус и павильон, тип субъекта (ИП/ООО/самозанятый), до 3 категорий товаров.",
                  icon: <IdcardOutlined className="text-2xl" />,
                },
                {
                  step: 3,
                  title: "Загрузите пропуск",
                  text: "Фото пропуска на рынок отдельно + селфи с пропуском. Данные видны только модераторам.",
                  icon: <SafetyCertificateOutlined className="text-2xl" />,
                },
                {
                  step: 4,
                  title: "Получите доступ",
                  text: `Модерация до ${SUPPLIER_REVIEW_SLA_HOURS} часов. После одобрения — публикуйте товары и принимайте заказы.`,
                  icon: <TrophyOutlined className="text-2xl" />,
                },
              ].map((s) => (
                <ScrollReveal key={s.step} animation="scale" delay={s.step * 0.12}>
                  <div className="relative rounded-2xl border border-stone-200 bg-white p-6 hover:shadow-md hover-float transition group">
                    <div className="absolute -top-3 -left-1 w-8 h-8 rounded-full bg-amber-500 text-white text-sm font-bold flex items-center justify-center shadow-md">
                      {s.step}
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4 mt-2 group-hover:icon-bounce">
                      {s.icon}
                    </div>
                    <h3 className="font-bold text-base mb-2">{s.title}</h3>
                    <p className="text-sm text-stone-500 leading-relaxed">{s.text}</p>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        {/* ══════ КОМУ ПОДХОДИТ ══════ */}
        <section className="py-12 sm:py-16 lg:py-20 bg-white">
          <div className="max-w-6xl mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-8 lg:gap-10 items-center">
              <ScrollReveal animation="fade-left">
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold mb-4 sm:mb-6">
                  Кому подходит Globox
                </h2>
                <div className="space-y-4">
                  {[
                    { title: "Продавцам одежды и обуви", desc: "Женская, мужская, детская — самые востребованные категории на Садоводе" },
                    { title: "Продавцам аксессуаров и сумок", desc: "Бижутерия, ремни, кошельки, рюкзаки — импульсные покупки с высокой маржой" },
                    { title: "Продавцам текстиля и косметики", desc: "Домашний текстиль, парфюмерия — стабильный спрос круглый год" },
                    { title: "Оптовикам и розничным продавцам", desc: "Работайте с единичными и оптовыми заказами — на платформе есть и те, и другие" },
                  ].map((item, i) => (
                    <div key={i} className="flex gap-3 items-start">
                      <CheckCircleFilled className="text-amber-500 text-lg mt-0.5 shrink-0" />
                      <div>
                        <div className="font-semibold">{item.title}</div>
                        <div className="text-sm text-stone-500">{item.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollReveal>

              <ScrollReveal animation="fade-right">
                <div className="rounded-3xl bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 p-5 sm:p-8 text-white">
                  <h3 className="text-2xl font-extrabold mb-6">
                    Локации на Садоводе
                  </h3>
                  <div className="space-y-4">
                    {[
                      { name: "Корпус А (крытый)", desc: "Этажи, линии, павильоны — формат 2А-35", pavilions: "2 000+" },
                      { name: "Корпус Б (крытый)", desc: "Этажи, линии, павильоны — формат 1Б-12", pavilions: "1 500+" },
                      { name: "Некрытый рынок", desc: "Торговые ряды — свободный формат нумерации", pavilions: "5 000+" },
                    ].map((loc, i) => (
                      <div key={i} className="rounded-xl bg-white/15 backdrop-blur-sm border border-white/20 p-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-bold">{loc.name}</div>
                            <div className="text-white/70 text-xs mt-0.5">{loc.desc}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-xl font-black">{loc.pavilions}</div>
                            <div className="text-white/60 text-[10px] uppercase">павильонов</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 pt-4 border-t border-white/20 text-sm text-white/70">
                    14-й км МКАД, Москва. Крупнейший рынок России.
                  </div>
                </div>
              </ScrollReveal>
            </div>
          </div>
        </section>

        {/* ══════ ТИП СУБЪЕКТА ══════ */}
        <section className="py-12 sm:py-16 lg:py-20 bg-stone-50">
          <div className="max-w-6xl mx-auto px-4">
            <ScrollReveal animation="fade-up" className="text-center mb-8 sm:mb-10">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold">
                Подходит любой правовой форме
              </h2>
              <p className="mt-3 text-stone-500">
                Физлицо, самозанятый, ИП или ООО — регистрируйтесь уже сейчас
              </p>
            </ScrollReveal>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {[
                { title: "Физлицо",     desc: "Продаёте от себя, без регистрации бизнеса",   emoji: "👤" },
                { title: "Самозанятый", desc: "Налог 4–6%, простая отчётность через приложение", emoji: "📱" },
                { title: "ИП",          desc: "Полноценный бизнес с расчётным счётом",       emoji: "📋" },
                { title: "ООО",         desc: "Юридическое лицо с любой системой налогообложения", emoji: "🏢" },
              ].map((t, i) => (
                <ScrollReveal key={i} animation="scale" delay={i * 0.1}>
                <div className="rounded-2xl bg-white border border-stone-200 p-5 text-center hover:shadow-md hover:border-amber-300 hover-float transition">
                  <div className="text-4xl mb-3">{t.emoji}</div>
                  <div className="font-bold text-base">{t.title}</div>
                  <div className="text-xs text-stone-500 mt-1.5 leading-relaxed">{t.desc}</div>
                </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        {/* ══════ FAQ ══════ */}
        <section className="py-12 sm:py-16 lg:py-20 bg-white">
          <div className="max-w-3xl mx-auto px-4">
            <ScrollReveal animation="fade-up" className="text-center mb-8 sm:mb-10">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold">
                Частые вопросы
              </h2>
            </ScrollReveal>

            <Collapse
              bordered={false}
              expandIconPosition="end"
              className="!bg-transparent"
              items={[
                {
                  key: "1",
                  label: <span className="font-semibold">Сколько стоит подключение?</span>,
                  children: <p className="text-stone-500">Подключение полностью бесплатное. Вы не платите за регистрацию, публикацию товаров или размещение в каталоге. Комиссия взимается только при успешной продаже.</p>,
                },
                {
                  key: "2",
                  label: <span className="font-semibold">Какие документы нужны для регистрации?</span>,
                  children: <p className="text-stone-500">Пропуск продавца на рынок (фото отдельно + селфи с пропуском). Для самозанятых, ИП и ООО — ИНН и ОГРНИП (по желанию). Паспорт не требуется.</p>,
                },
                {
                  key: "3",
                  label: <span className="font-semibold">Как быстро рассмотрят заявку?</span>,
                  children: <p className="text-stone-500">Стандартный срок — до {SUPPLIER_REVIEW_SLA_HOURS} часов. Большинство заявок рассматриваются в тот же рабочий день. Если что-то не так — вам напишут в чат, и можно будет быстро исправить.</p>,
                },
                {
                  key: "4",
                  label: <span className="font-semibold">Можно ли быть одновременно поставщиком и посредником?</span>,
                  children: <p className="text-stone-500">Да! Вы можете продавать свой товар как поставщик и одновременно выкупать товар для покупателей у других продавцов как посредник. Это две разные роли с отдельными кабинетами.</p>,
                },
                {
                  key: "5",
                  label: <span className="font-semibold">Зачем нужен мессенджер MAX?</span>,
                  children: <p className="text-stone-500">Через MAX вы подтверждаете номер телефона при регистрации (бесплатно, без SMS). В дальнейшем через MAX вы получаете уведомления о заказах, сообщения от покупателей и техподдержки — прямо в мессенджер.</p>,
                },
                {
                  key: "6",
                  label: <span className="font-semibold">Какие категории товаров можно продавать?</span>,
                  children: <p className="text-stone-500">При регистрации вы выбираете до 3 категорий: одежда (женская, мужская, детская), обувь, сумки и аксессуары, косметика и парфюмерия, ювелирные изделия, текстиль для дома и другие. Список категорий будет расширяться.</p>,
                },
                {
                  key: "7",
                  label: <span className="font-semibold">Могу ли изменить данные после одобрения?</span>,
                  children: <p className="text-stone-500">Пароль и настройки уведомлений — в любой момент. Номер павильона, ФИО, категории и тип субъекта — только через заявку в техподдержку. Это сделано для безопасности покупателей.</p>,
                },
              ]}
            />
          </div>
        </section>

        {/* ══════ ФИНАЛЬНЫЙ CTA ══════ */}
        <section className="py-12 sm:py-16 lg:py-20">
          <div className="max-w-4xl mx-auto px-4">
            <ScrollReveal animation="zoom">
            <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500" />
              <div className="absolute inset-0 opacity-20 hidden sm:block" style={{
                backgroundImage: "radial-gradient(rgba(255,255,255,1) 1px, transparent 1px)",
                backgroundSize: "24px 24px",
              }} />
              <div className="relative p-6 sm:p-8 md:p-12 text-center text-white">
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-black mb-3 sm:mb-4">
                  Начните продавать онлайн уже сегодня
                </h2>
                <p className="text-white/80 text-lg max-w-xl mx-auto mb-8">
                  Бесплатная регистрация, модерация за {SUPPLIER_REVIEW_SLA_HOURS} часа, заказы 24/7.
                  Присоединяйтесь к продавцам Садовода на Globox.
                </p>
                <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-3 sm:gap-4">
                  <Button
                    size="large"
                    className="!rounded-xl !font-bold !h-12 !px-8 !text-base !bg-white !text-amber-600 !border-white hover:!bg-amber-50 !w-full sm:!w-auto"
                    icon={<ThunderboltFilled />}
                    onClick={() => alert("Регистрация поставщиков скоро будет доступна на seller-globox.ru")}
                  >
                    Подать заявку
                  </Button>
                  <Link href="/mediator" className="sm:w-auto">
                    <Button
                      size="large"
                      className="!rounded-xl !font-medium !h-12 !px-8 !border-white/40 !text-white hover:!bg-white/10 !w-full sm:!w-auto"
                      ghost
                    >
                      Я хочу быть посредником
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
            </ScrollReveal>
          </div>
        </section>

        {/* ══════ FOOTER NOTE ══════ */}
        <div className="text-center py-8 text-xs text-stone-400">
          Globox — платформа для продавцов ТК «Садовод», Москва, 14-й км МКАД
        </div>
      </main>
    </div>
  );
}
