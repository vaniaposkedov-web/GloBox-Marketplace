"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Button, Collapse, Slider } from "antd";
import {
  ArrowRightOutlined,
  CheckCircleFilled,
  ClockCircleOutlined,
  DollarOutlined,
  IdcardOutlined,
  PercentageOutlined,
  RocketOutlined,
  SafetyCertificateOutlined,
  ShopOutlined,
  ShoppingOutlined,
  StarFilled,
  TeamOutlined,
  ThunderboltFilled,
  TrophyOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { SiteHeader } from "@/widgets/header";
import {
  MEDIATOR_COMMISSION_MAX,
  MEDIATOR_COMMISSION_MIN,
  MEDIATOR_REVIEW_SLA_HOURS,
  MEDIATOR_WORK_AREA_LABEL,
} from "@/shared/lib";
import { useSession, isMediator } from "@/shared/auth";
import { ScrollReveal } from "@/shared/ui/scroll-reveal";

export default function MediatorLandingPage() {
  const { user, hydrated } = useSession();
  const alreadyMediator = isMediator(user?.role, user?.roles);

  const ctaButton = hydrated && alreadyMediator ? (
    <Link href="/mediator/status">
      <Button
        type="primary"
        size="large"
        className="!rounded-xl !font-semibold !shadow-lg !shadow-fuchsia-500/30 !h-12 !px-8 !text-base !bg-fuchsia-600 !border-fuchsia-600 hover:!bg-fuchsia-700 hover:!border-fuchsia-700 !w-full sm:!w-auto"
        icon={<ArrowRightOutlined />}
      >
        Открыть кабинет
      </Button>
    </Link>
  ) : (
    <Button
      type="primary"
      size="large"
      className="!rounded-xl !font-semibold !shadow-lg !shadow-fuchsia-500/30 !h-12 !px-8 !text-base !bg-fuchsia-600 !border-fuchsia-600 hover:!bg-fuchsia-700 hover:!border-fuchsia-700 !w-full sm:!w-auto"
      icon={<ThunderboltFilled />}
      onClick={() => alert("Регистрация посредников скоро будет доступна на posred-globox.ru")}
    >
      Стать посредником — бесплатно
    </Button>
  );

  return (
    <div className="min-h-screen flex flex-col bg-stone-50">
      <SiteHeader />
      <main className="flex-1">

        {/* ══════ HERO ══════ */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-100/70 via-rose-50/50 to-orange-50/40" />
          <div className="absolute inset-0 pointer-events-none" aria-hidden>
            <div className="absolute -top-24 -left-24 w-[20rem] sm:w-[36rem] h-[20rem] sm:h-[36rem] rounded-full bg-fuchsia-300/25 blur-3xl blob-float-a" />
            <div className="absolute -bottom-32 right-0 w-[16rem] sm:w-[30rem] h-[16rem] sm:h-[30rem] rounded-full bg-rose-300/20 blur-3xl blob-float-b" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[28rem] sm:w-[50rem] h-[28rem] sm:h-[50rem] rounded-full bg-fuchsia-200/10 blur-3xl blob-float-c" />
          </div>

          <div className="relative max-w-6xl mx-auto px-4 pt-10 pb-14 sm:pt-16 sm:pb-20 lg:pt-24 lg:pb-28">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-fuchsia-600/10 border border-fuchsia-600/20 text-fuchsia-700 text-sm font-semibold mb-6 fade-in-up" style={{ animationDelay: '0.1s' }}>
              <TeamOutlined />
              Посредник на Садоводе
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black leading-[1.1] max-w-4xl tracking-tight fade-in-up" style={{ animationDelay: '0.25s' }}>
              Зарабатывайте{" "}
              <span className="bg-gradient-to-r from-fuchsia-600 via-rose-500 to-orange-500 bg-clip-text text-transparent gradient-text-animated">
                {MEDIATOR_COMMISSION_MIN}–{MEDIATOR_COMMISSION_MAX}%
              </span>
              {" "}с каждого выкупа
            </h1>

            <p className="mt-4 sm:mt-6 text-base sm:text-lg md:text-xl text-stone-600 max-w-2xl leading-relaxed fade-in-up" style={{ animationDelay: '0.4s' }}>
              Покупатели из регионов находят товар в каталоге Globox, а вы
              выкупаете его у поставщика на Садоводе и передаёте на отправку.
              Комиссию устанавливаете сами. {MEDIATOR_WORK_AREA_LABEL}.
            </p>

            <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 fade-in-up" style={{ animationDelay: '0.55s' }}>
              {ctaButton}
              <Link href="/seller" className="sm:w-auto">
                <Button size="large" className="!rounded-xl !h-12 !px-6 !font-medium !w-full sm:!w-auto">
                  <ShopOutlined /> Я поставщик
                </Button>
              </Link>
            </div>

            {/* Trust badges */}
            <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-2 sm:gap-x-6 sm:gap-y-2 text-xs sm:text-sm text-stone-500 fade-in-up" style={{ animationDelay: '0.65s' }}>
              <span className="flex items-center gap-1.5">
                <CheckCircleFilled className="text-green-500" /> Бесплатное подключение
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircleFilled className="text-green-500" /> Ставку устанавливаете сами
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircleFilled className="text-green-500" /> Можно совмещать с ролью поставщика
              </span>
            </div>

            {/* Stats bar */}
            <div className="mt-8 sm:mt-12 grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
              {[
                { value: `${MEDIATOR_COMMISSION_MIN}–${MEDIATOR_COMMISSION_MAX}%`, label: "Ваша комиссия",    icon: <PercentageOutlined /> },
                { value: "100 000+",                                                label: "Покупателей в день", icon: <TeamOutlined /> },
                { value: "0 ₽",                                                    label: "За подключение",     icon: <DollarOutlined /> },
                { value: `${MEDIATOR_REVIEW_SLA_HOURS} ч`,                         label: "Модерация заявки",   icon: <ClockCircleOutlined /> },
              ].map((s, i) => (
                <div
                  key={i}
                  className="rounded-2xl bg-white/80 backdrop-blur border border-fuchsia-200/60 p-4 text-center shadow-sm pop-in hover-float"
                  style={{ animationDelay: `${0.7 + i * 0.1}s` }}
                >
                  <div className="text-fuchsia-600 text-lg mb-1">{s.icon}</div>
                  <div className="text-xl sm:text-2xl md:text-3xl font-black text-stone-800">{s.value}</div>
                  <div className="text-xs text-stone-500 mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════ КАЛЬКУЛЯТОР ДОХОДА ══════ */}
        <EarningsCalculator />

        {/* ══════ КАК ВСЁ УСТРОЕНО ══════ */}
        <section className="py-12 sm:py-16 lg:py-20 bg-white">
          <div className="max-w-6xl mx-auto px-4">
            <ScrollReveal animation="fade-up" className="text-center mb-8 sm:mb-12">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold">
                Как работает посредник на Globox
              </h2>
              <p className="mt-3 text-stone-500 max-w-xl mx-auto">
                Простая и прозрачная схема: покупатель заказывает — вы выкупаете — получаете комиссию
              </p>
            </ScrollReveal>

            <div className="grid md:grid-cols-3 gap-4 sm:gap-6">
              {[
                {
                  step: "01",
                  title: "Покупатель оформляет заказ",
                  text: "Покупатель из любого города находит товар в каталоге Globox и выбирает вас как посредника для выкупа.",
                  color: "fuchsia",
                },
                {
                  step: "02",
                  title: "Вы выкупаете товар",
                  text: "Приходите к поставщику в павильон на Садоводе, выкупаете товар по указанной цене и подтверждаете в приложении.",
                  color: "rose",
                },
                {
                  step: "03",
                  title: "Получаете комиссию",
                  text: `Покупатель оплачивает вам стоимость товара + вашу комиссию (${MEDIATOR_COMMISSION_MIN}–${MEDIATOR_COMMISSION_MAX}%). Платформа в расчётах не участвует.`,
                  color: "orange",
                },
              ].map((s, i) => (
                <ScrollReveal key={i} animation="fade-up" delay={i * 0.12}>
                <div className="relative">
                  <div className="rounded-2xl border border-stone-200 bg-stone-50/50 p-6 h-full hover:shadow-lg hover:border-fuchsia-300 hover-float transition-all duration-300">
                    <div className="text-5xl font-black text-stone-200 mb-4">{s.step}</div>
                    <h3 className="text-lg font-bold mb-2">{s.title}</h3>
                    <p className="text-sm text-stone-500 leading-relaxed">{s.text}</p>
                  </div>
                  {i < 2 && (
                    <div className="hidden md:flex absolute top-1/2 -right-3 w-6 h-6 bg-fuchsia-100 border border-fuchsia-300 rounded-full items-center justify-center text-fuchsia-600 text-xs z-10">
                      →
                    </div>
                  )}
                </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        {/* ══════ ПРЕИМУЩЕСТВА ══════ */}
        <section className="py-12 sm:py-16 lg:py-20 bg-gradient-to-b from-stone-50 to-white">
          <div className="max-w-6xl mx-auto px-4">
            <ScrollReveal animation="fade-up" className="text-center mb-8 sm:mb-12">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-fuchsia-50 border border-fuchsia-200 text-fuchsia-700 text-xs font-bold uppercase tracking-wider mb-4">
                <StarFilled /> Преимущества
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold">
                Почему стоит стать посредником
              </h2>
            </ScrollReveal>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[
                {
                  icon: <DollarOutlined className="text-2xl" />,
                  title: "Вы сами назначаете ставку",
                  text: `От ${MEDIATOR_COMMISSION_MIN}% до ${MEDIATOR_COMMISSION_MAX}% от суммы заказа. Заказ на 10 000 ₽ при ставке 10% = 1 000 ₽ вам. Меняйте ставку в любой момент.`,
                },
                {
                  icon: <ShoppingOutlined className="text-2xl" />,
                  title: "Гибкий минимум выкупа",
                  text: "Укажите минимальную сумму заказа, которую вы готовы взять. Мелкие заказы не будут отвлекать, если не хотите.",
                },
                {
                  icon: <RocketOutlined className="text-2xl" />,
                  title: "Быстрый старт",
                  text: `Регистрация за 10 минут, модерация до ${MEDIATOR_REVIEW_SLA_HOURS} часов. Уже на следующий день вы можете принимать заказы.`,
                },
                {
                  icon: <SafetyCertificateOutlined className="text-2xl" />,
                  title: "Доверие покупателей",
                  text: "Ваш аватар, рейтинг и количество выполненных заказов видны покупателям. Чем больше заказов — тем больше доверия.",
                },
                {
                  icon: <UserOutlined className="text-2xl" />,
                  title: "Совмещайте с поставкой",
                  text: "Можно быть одновременно поставщиком и посредником. Продавайте свой товар и выкупайте чужой — два источника дохода.",
                },
                {
                  icon: <TeamOutlined className="text-2xl" />,
                  title: "Растущий спрос",
                  text: "Покупатели из 85 регионов России не могут приехать на Садовод лично. Им нужен человек на месте — это вы.",
                },
              ].map((b, i) => (
                <ScrollReveal key={i} animation="fade-up" delay={i * 0.08}>
                  <div className="group rounded-2xl border border-stone-200 bg-white p-6 hover:shadow-lg hover:border-fuchsia-300 hover-float hover-accent-left transition-all duration-300 h-full">
                    <div className="w-12 h-12 rounded-xl bg-fuchsia-100 text-fuchsia-600 flex items-center justify-center mb-4 group-hover:icon-bounce">
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

        {/* ══════ 4 ШАГА РЕГИСТРАЦИИ ══════ */}
        <section className="py-12 sm:py-16 lg:py-20 bg-white">
          <div className="max-w-6xl mx-auto px-4">
            <ScrollReveal animation="fade-up" className="text-center mb-8 sm:mb-12">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold">
                Стать посредником за 4 шага
              </h2>
              <p className="mt-3 text-stone-500">
                Всё онлайн. Не нужно приходить ни в какой офис.
              </p>
            </ScrollReveal>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {[
                {
                  step: 1,
                  title: "ФИО и телефон",
                  text: "Введите ФИО как в паспорте и подтвердите номер телефона через MAX-бот.",
                  icon: <IdcardOutlined className="text-2xl" />,
                },
                {
                  step: 2,
                  title: "Условия работы",
                  text: `Установите вашу ставку (${MEDIATOR_COMMISSION_MIN}–${MEDIATOR_COMMISSION_MAX}%) и минимальную сумму выкупа. Можно менять в любой момент.`,
                  icon: <PercentageOutlined className="text-2xl" />,
                },
                {
                  step: 3,
                  title: "Три фотографии",
                  text: "Аватарка (лицо чётко видно), разворот паспорта (стр. 2-3) и селфи с пропуском на рынок.",
                  icon: <SafetyCertificateOutlined className="text-2xl" />,
                },
                {
                  step: 4,
                  title: `Модерация ${MEDIATOR_REVIEW_SLA_HOURS} ч`,
                  text: "После проверки вы появитесь в каталоге посредников. Покупатели смогут вас выбирать для выкупа.",
                  icon: <TrophyOutlined className="text-2xl" />,
                },
              ].map((s) => (
                <ScrollReveal key={s.step} animation="scale" delay={s.step * 0.12}>
                  <div className="relative rounded-2xl border border-stone-200 bg-stone-50/50 p-6 hover:shadow-md hover-float transition group">
                    <div className="absolute -top-3 -left-1 w-8 h-8 rounded-full bg-fuchsia-500 text-white text-sm font-bold flex items-center justify-center shadow-md">
                      {s.step}
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-fuchsia-50 text-fuchsia-600 flex items-center justify-center mb-4 mt-2 group-hover:icon-bounce">
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

        {/* ══════ ВАЖНО ЗНАТЬ ══════ */}
        <section className="py-12 sm:py-16 lg:py-20 bg-stone-50">
          <div className="max-w-6xl mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-8 lg:gap-10 items-start">

              <ScrollReveal animation="fade-left">
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold mb-4 sm:mb-6">
                  Важно знать
                </h2>
                <div className="space-y-4">
                  {[
                    {
                      title: "Платформа не участвует в расчётах",
                      desc: "Все финансовые вопросы (оплата за товар, комиссия посредника, способ передачи средств) — между покупателем и посредником.",
                    },
                    {
                      title: "Ставка меняется без модерации",
                      desc: `Комиссия (${MEDIATOR_COMMISSION_MIN}–${MEDIATOR_COMMISSION_MAX}%) и минимальная сумма выкупа меняются в кабинете в один клик. Изменения действуют для новых заказов.`,
                    },
                    {
                      title: "Посредник + поставщик = можно",
                      desc: "Вы можете продавать свой товар и одновременно выкупать товар для покупателей у других поставщиков. Два источника дохода.",
                    },
                    {
                      title: "Покупатель + посредник = нельзя",
                      desc: "Один аккаунт не может быть и покупателем, и посредником. Это разные роли с разной ответственностью.",
                    },
                    {
                      title: "ФИО и паспорт — только через техподдержку",
                      desc: "После одобрения изменить ФИО, фото паспорта или пропуска можно только через запрос в техподдержку. Аватарка, ставка и минимум выкупа — свободно.",
                    },
                  ].map((item, i) => (
                    <div key={i} className="flex gap-3 items-start">
                      <CheckCircleFilled className="text-fuchsia-500 text-lg mt-0.5 shrink-0" />
                      <div>
                        <div className="font-semibold">{item.title}</div>
                        <div className="text-sm text-stone-500">{item.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollReveal>

              <ScrollReveal animation="fade-right">
              <div className="rounded-2xl sm:rounded-3xl bg-gradient-to-br from-fuchsia-500 via-rose-500 to-orange-500 p-5 sm:p-8 text-white">
                <h3 className="text-2xl font-extrabold mb-2">
                  Документы для регистрации
                </h3>
                <p className="text-white/70 text-sm mb-6">
                  3 фотографии — и вы в системе
                </p>
                <div className="space-y-4">
                  {[
                    {
                      num: "1",
                      title: "Аватарка (портрет)",
                      desc: "Лицо чётко видно, без очков и масок. Публикуется в каталоге посредников.",
                    },
                    {
                      num: "2",
                      title: "Разворот паспорта (стр. 2-3)",
                      desc: "Фото с данными читаемы, без бликов. Видят только модераторы.",
                    },
                    {
                      num: "3",
                      title: "Селфи с пропуском на рынок",
                      desc: "Лицо + пропуск в одном кадре, текст пропуска читается.",
                    },
                  ].map((doc) => (
                    <div key={doc.num} className="rounded-xl bg-white/15 backdrop-blur-sm border border-white/20 p-4">
                      <div className="flex gap-3 items-start">
                        <div className="w-8 h-8 rounded-full bg-white/20 text-white font-bold text-sm flex items-center justify-center shrink-0">
                          {doc.num}
                        </div>
                        <div>
                          <div className="font-bold">{doc.title}</div>
                          <div className="text-white/70 text-xs mt-0.5">{doc.desc}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 pt-4 border-t border-white/20 text-sm text-white/70">
                  JPG / PNG, до 10 МБ. Минимум 500×500 px для аватарки, 1500×1000 px для паспорта.
                </div>
              </div>
              </ScrollReveal>
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
                  label: <span className="font-semibold">Сколько реально можно заработать?</span>,
                  children: <p className="text-stone-500">Зависит от вашей ставки и количества заказов. При ставке 10% и 5 заказах в день по 8 000 ₽ средний чек — это 4 000 ₽ комиссии в день или ~120 000 ₽ в месяц. Чем выше рейтинг и больше выполненных заказов — тем чаще вас выбирают.</p>,
                },
                {
                  key: "2",
                  label: <span className="font-semibold">Нужно ли быть зарегистрированным продавцом?</span>,
                  children: <p className="text-stone-500">Нет, для посредника не нужен статус ИП или самозанятого. Вам нужен только пропуск на рынок и паспорт. Но мы рекомендуем оформить самозанятость для легальности расчётов.</p>,
                },
                {
                  key: "3",
                  label: <span className="font-semibold">Как покупатель мне платит?</span>,
                  children: <p className="text-stone-500">Платформа не участвует в денежных расчётах. Покупатель и посредник договариваются сами: перевод на карту, наличные при встрече и т. д. Платформа фиксирует факт сделки и заказ.</p>,
                },
                {
                  key: "4",
                  label: <span className="font-semibold">Могу ли я отказаться от заказа?</span>,
                  children: <p className="text-stone-500">Да, но частые отказы влияют на рейтинг. Установите минимальную сумму выкупа, чтобы не получать заказы, которые вам невыгодны.</p>,
                },
                {
                  key: "5",
                  label: <span className="font-semibold">Можно ли быть одновременно поставщиком и посредником?</span>,
                  children: <p className="text-stone-500">Да! Вы можете продавать свой товар в кабинете поставщика (seller-globox.ru) и одновременно принимать заказы на выкуп в кабинете посредника (posred-globox.ru). Но быть покупателем и посредником одновременно нельзя.</p>,
                },
                {
                  key: "6",
                  label: <span className="font-semibold">Как быстро рассмотрят мою заявку?</span>,
                  children: <p className="text-stone-500">До {MEDIATOR_REVIEW_SLA_HOURS} часов. Если заявка не рассмотрена вовремя, вы увидите контакт техподдержки для ускорения. Чаще всего — в тот же рабочий день.</p>,
                },
                {
                  key: "7",
                  label: <span className="font-semibold">По какой территории я работаю?</span>,
                  children: <p className="text-stone-500">{MEDIATOR_WORK_AREA_LABEL}. Ограничений по корпусам нет — вы можете выкупать товар у любого поставщика на рынке. Если в будущем появятся другие площадки — вопрос будет пересмотрен.</p>,
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
              <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-500 via-rose-500 to-orange-500" />
              <div className="absolute inset-0 opacity-20 hidden sm:block" style={{
                backgroundImage: "radial-gradient(rgba(255,255,255,1) 1px, transparent 1px)",
                backgroundSize: "24px 24px",
              }} />
              <div className="relative p-6 sm:p-8 md:p-12 text-center text-white">
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-black mb-3 sm:mb-4">
                  Начните зарабатывать на Садоводе
                </h2>
                <p className="text-white/80 text-lg max-w-xl mx-auto mb-8">
                  Бесплатная регистрация, модерация за {MEDIATOR_REVIEW_SLA_HOURS} часа,
                  ставка {MEDIATOR_COMMISSION_MIN}–{MEDIATOR_COMMISSION_MAX}% — вы решаете.
                </p>
                <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-3 sm:gap-4">
                  <Button
                    size="large"
                    className="!rounded-xl !font-bold !h-12 !px-8 !text-base !bg-white !text-fuchsia-600 !border-white hover:!bg-fuchsia-50 !w-full sm:!w-auto"
                    icon={<ThunderboltFilled />}
                    onClick={() => alert("Регистрация посредников скоро будет доступна на posred-globox.ru")}
                  >
                    Подать заявку
                  </Button>
                  <Link href="/seller" className="sm:w-auto">
                    <Button
                      size="large"
                      className="!rounded-xl !font-medium !h-12 !px-8 !border-white/40 !text-white hover:!bg-white/10 !w-full sm:!w-auto"
                      ghost
                    >
                      Я хочу быть поставщиком
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
          Globox — платформа для продавцов и посредников ТК «Садовод», Москва, 14-й км МКАД
        </div>
      </main>
    </div>
  );
}

/* ── Калькулятор дохода ──────────────────────────────────────────── */

function EarningsCalculator() {
  const [rate, setRate] = useState(10);
  const [orders, setOrders] = useState(5);
  const [avg, setAvg] = useState(8000);

  const daily = useMemo(() => Math.round(orders * avg * rate / 100), [rate, orders, avg]);
  const monthly = daily * 30;

  return (
    <section className="py-12 sm:py-16 lg:py-20 bg-white">
      <div className="max-w-6xl mx-auto px-4">
        <ScrollReveal animation="fade-up" className="text-center mb-8 sm:mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-fuchsia-50 border border-fuchsia-200 text-fuchsia-700 text-xs font-bold uppercase tracking-wider mb-4">
            <DollarOutlined /> Калькулятор дохода
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold">
            Сколько можно заработать
          </h2>
          <p className="mt-3 text-stone-500 max-w-lg mx-auto">
            Двигайте ползунки и посмотрите, какой доход вы можете получать как посредник
          </p>
        </ScrollReveal>

        <ScrollReveal animation="scale" className="max-w-3xl mx-auto">
          <div className="rounded-2xl sm:rounded-3xl border border-stone-200 bg-stone-50/50 p-4 sm:p-6 md:p-8 space-y-5 sm:space-y-6">

            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-stone-600 font-medium">Ваша ставка</span>
                <span className="font-bold text-fuchsia-600">{rate}%</span>
              </div>
              <Slider
                min={MEDIATOR_COMMISSION_MIN}
                max={MEDIATOR_COMMISSION_MAX}
                step={0.5}
                value={rate}
                onChange={setRate}
                className="[&_.ant-slider-track]:!bg-fuchsia-500 [&_.ant-slider-handle]:!border-fuchsia-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-stone-600 font-medium">Заказов в день</span>
                <span className="font-bold text-fuchsia-600">{orders}</span>
              </div>
              <Slider
                min={1}
                max={20}
                value={orders}
                onChange={setOrders}
                className="[&_.ant-slider-track]:!bg-fuchsia-500 [&_.ant-slider-handle]:!border-fuchsia-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-stone-600 font-medium">Средний чек заказа</span>
                <span className="font-bold text-fuchsia-600">{avg.toLocaleString("ru-RU")} ₽</span>
              </div>
              <Slider
                min={1000}
                max={50000}
                step={1000}
                value={avg}
                onChange={setAvg}
                className="[&_.ant-slider-track]:!bg-fuchsia-500 [&_.ant-slider-handle]:!border-fuchsia-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4 pt-4 border-t border-stone-200">
              <div className="rounded-xl sm:rounded-2xl bg-white border border-stone-200 p-3 sm:p-5 text-center">
                <div className="text-[10px] sm:text-xs text-stone-500 uppercase tracking-wider mb-1">В день</div>
                <div className="text-xl sm:text-3xl font-black text-fuchsia-600">
                  {daily.toLocaleString("ru-RU")} ₽
                </div>
              </div>
              <div className="rounded-xl sm:rounded-2xl bg-gradient-to-br from-fuchsia-500 to-rose-500 p-3 sm:p-5 text-center text-white">
                <div className="text-[10px] sm:text-xs text-white/70 uppercase tracking-wider mb-1">В месяц</div>
                <div className="text-xl sm:text-3xl font-black">
                  {monthly.toLocaleString("ru-RU")} ₽
                </div>
              </div>
            </div>

            <p className="text-xs text-stone-400 text-center">
              * Расчёт приблизительный. Реальный доход зависит от количества заказов и суммы выкупа.
            </p>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
