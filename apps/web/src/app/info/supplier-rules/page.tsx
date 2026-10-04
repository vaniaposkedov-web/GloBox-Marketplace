"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Shield, Users, Package, CreditCard, AlertTriangle, CheckCircle2, HelpCircle } from "lucide-react";
import { MobileBottomNav } from "@/widgets/mobile-nav";

export default function SupplierRulesPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(135deg, #fdf4ff 0%, #fff1f2 50%, #fafaf9 100%)" }}>
      <MobileBottomNav />

      <main className="flex-1 w-full max-w-3xl mx-auto px-4 py-6 pb-40">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button type="button" onClick={() => router.back()}
            className="w-10 h-10 rounded-2xl bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 shadow-sm active:scale-95 shrink-0"
          >
            <ArrowLeft className="w-4 h-4 text-gray-600" />
          </button>
          <h1 className="text-lg sm:text-xl font-extrabold text-gray-900">Правила работы с посредниками</h1>
        </div>

        <div className="space-y-4">
          {/* Intro */}
          <Section
            icon={<Users className="w-4 h-4 text-blue-600" />}
            iconBg="linear-gradient(135deg,#dbeafe,#bfdbfe)"
            title="Кто такие посредники?"
          >
            <p className="text-sm text-gray-600 leading-relaxed">
              Посредники — это проверенные участники платформы, которые помогают вам приобрести товары
              из магазинов и организовать доставку. Каждый посредник проходит верификацию и имеет рейтинг,
              основанный на реальных отзывах покупателей.
            </p>
          </Section>

          {/* How it works */}
          <Section
            icon={<Package className="w-4 h-4 text-amber-600" />}
            iconBg="linear-gradient(135deg,#fef3c7,#fed7aa)"
            title="Как это работает?"
          >
            <ol className="text-sm text-gray-600 leading-relaxed space-y-3 list-none">
              <Step n={1}>Вы добавляете товары в корзину и заполняете данные получателя.</Step>
              <Step n={2}>Выбираете посредника из списка — ориентируйтесь на рейтинг, количество выполненных заказов и комиссию.</Step>
              <Step n={3}>Посредник получает ваш заказ, выкупает товары в магазине и организует отправку.</Step>
              <Step n={4}>Вы получаете товар и подтверждаете выполнение заказа.</Step>
            </ol>
          </Section>

          {/* Payment */}
          <Section
            icon={<CreditCard className="w-4 h-4 text-emerald-600" />}
            iconBg="linear-gradient(135deg,#d1fae5,#a7f3d0)"
            title="Оплата и комиссия"
          >
            <div className="text-sm text-gray-600 leading-relaxed space-y-2">
              <p>Оплата производится напрямую посреднику после согласования деталей заказа. Платформа не участвует в финансовых расчётах между вами и посредником.</p>
              <p>Комиссия посредника указана в его профиле и рассчитывается как процент от стоимости товаров. Точная сумма отображается при оформлении заказа.</p>
            </div>
          </Section>

          {/* Guarantees */}
          <Section
            icon={<Shield className="w-4 h-4 text-purple-600" />}
            iconBg="linear-gradient(135deg,#ede9fe,#ddd6fe)"
            title="Гарантии и безопасность"
          >
            <ul className="text-sm text-gray-600 leading-relaxed space-y-2 list-none">
              <Li>Все посредники проходят верификацию перед началом работы на платформе.</Li>
              <Li>Рейтинг и отзывы формируются на основе реальных заказов — выбирайте посредников с высоким рейтингом.</Li>
              <Li>В случае спорных ситуаций вы можете обратиться в службу поддержки платформы.</Li>
              <Li>История всех заказов и переписок сохраняется для вашей безопасности.</Li>
            </ul>
          </Section>

          {/* Rules */}
          <Section
            icon={<AlertTriangle className="w-4 h-4 text-red-500" />}
            iconBg="linear-gradient(135deg,#fee2e2,#fecaca)"
            title="Важные правила"
          >
            <ul className="text-sm text-gray-600 leading-relaxed space-y-2 list-none">
              <Li>Не передавайте личные данные (пароли, данные банковских карт) посреднику вне платформы.</Li>
              <Li>Все договорённости фиксируйте в чате заказа на платформе.</Li>
              <Li>Перед оплатой убедитесь, что посредник подтвердил заказ и согласовал сроки.</Li>
              <Li>При получении товара проверьте комплектность и соответствие заказу.</Li>
              <Li>Если возникли проблемы — не подтверждайте выполнение заказа и свяжитесь с поддержкой.</Li>
            </ul>
          </Section>

          {/* FAQ */}
          <Section
            icon={<HelpCircle className="w-4 h-4 text-gray-600" />}
            iconBg="linear-gradient(135deg,#f3f4f6,#e5e7eb)"
            title="Часто задаваемые вопросы"
          >
            <div className="text-sm text-gray-600 leading-relaxed space-y-4">
              <Faq q="Что делать, если посредник не отвечает?">
                Если посредник не выходит на связь в течение 24 часов, вы можете отменить заказ и выбрать другого посредника. Также вы можете обратиться в поддержку.
              </Faq>
              <Faq q="Можно ли отменить заказ?">
                Заказ можно отменить до момента выкупа товара посредником. После выкупа отмена возможна только по согласованию с посредником.
              </Faq>
              <Faq q="Как оценить посредника?">
                После завершения заказа вам будет предложено оставить отзыв и оценку. Это помогает другим покупателям сделать правильный выбор.
              </Faq>
            </div>
          </Section>
        </div>
      </main>
    </div>
  );
}

function Section({ icon, iconBg, title, children }: {
  icon: React.ReactNode; iconBg: string; title: string; children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
      <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-gray-50 bg-gradient-to-r from-gray-50 to-white">
        <div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0" style={{ background: iconBg }}>
          {icon}
        </div>
        <h2 className="text-sm font-bold text-gray-900">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 mt-0.5"
        style={{ background: "linear-gradient(135deg,#f59e0b,#ea580c)" }}>
        {n}
      </span>
      <span>{children}</span>
    </li>
  );
}

function Li({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2">
      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
      <span>{children}</span>
    </li>
  );
}

function Faq({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="font-semibold text-gray-800 mb-1">{q}</p>
      <p>{children}</p>
    </div>
  );
}
