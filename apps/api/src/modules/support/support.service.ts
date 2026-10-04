import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AiBotService } from "./ai-bot.service";
import { NotificationService } from "../notifications/notification.service";
import type { UserRole, SupportTicketStatus } from "@prisma/client";

// ——— DTO-типы (повторяем минимально, чтобы не тянуть zod в рантайм) ———
interface CreateTicketInput {
  subject: string;
  message: string;
  attachments?: string[];
}

interface PostMessageInput {
  text: string;
  attachments?: string[];
}

interface ListFilterInput {
  status?: SupportTicketStatus;
  role?: "SUPPLIER" | "MEDIATOR";
  page: number;
  limit: number;
}

// ——— AI-бот поддержки GloBox ———
const BOT_GREETING = `Здравствуйте! 👋 Я — виртуальный ассистент GloBox.

Я могу помочь вам с:
• Верификацией и статусом заявки
• Загрузкой документов
• Изменением данных профиля
• Комиссией и условиями работы
• Заказами и выплатами
• Общими вопросами о платформе

Напишите ваш вопрос — я постараюсь помочь! Если потребуется, подключу оператора.`;

const ESCALATION_PATTERNS = [
  /оператор/i, /человек/i, /менеджер/i, /живой/i, /реальн/i,
  /соедин.*поддержк/i, /переключ/i, /переведи/i, /хочу.*говорить/i,
  /позов/i, /вызов/i, /подключ.*специалист/i, /свяжите/i,
];

const BOT_KNOWLEDGE: { patterns: RegExp[]; response: string }[] = [
  {
    patterns: [/верификац/i, /статус.*заявк/i, /когда.*проверят/i, /сколько.*ждать/i, /рассмотрен/i, /подтвержден/i, /модерац/i],
    response: "Верификация обычно занимает до 24 часов в рабочие дни.\n\nЧтобы ускорить процесс, убедитесь что:\n📸 Фото паспорта чёткое, все данные читаемы\n🤳 Селфи с паспортом — лицо и данные хорошо видны\n✅ Указанные данные совпадают с документами\n\nЕсли прошло больше 24 часов — напишите «оператор», и я подключу специалиста.",
  },
  {
    patterns: [/загрузк.*документ/i, /загрузить.*фото/i, /не загружается/i, /ошибк.*загрузк/i, /формат.*фото/i, /фото.*паспорт/i, /селфи/i],
    response: "Для загрузки документов:\n📋 Допустимые форматы: JPG, PNG\n📏 Максимальный размер: 10 МБ\n📸 Фото должно быть чётким, без бликов\n\nСоветы:\n• Снимайте при хорошем освещении\n• Все данные на фото должны быть читаемы\n• Не обрезайте края документа\n\nЕсли проблема сохраняется — попробуйте другой браузер или напишите «оператор».",
  },
  {
    patterns: [/отклон/i, /отказ/i, /почему отклонили/i, /причин.*отказ/i, /не одобрили/i],
    response: "Если ваша заявка была отклонена, причина указана в комментарии администратора в вашем профиле.\n\nЧастые причины отклонения:\n• Нечитаемые документы\n• Несовпадение данных\n• Неполный комплект документов\n\nВы можете исправить данные в профиле и подать заявку повторно. Если нужна помощь — напишите «оператор».",
  },
  {
    patterns: [/изменить.*данн/i, /сменить.*фио/i, /поменять.*телефон/i, /обновить.*паспорт/i, /изменение данных/i, /редактир/i],
    response: "Для изменения персональных данных (ФИО, телефон, документы) напишите мне что именно нужно изменить, и я создам запрос.\n\nИли вы можете перейти в раздел Профиль и обновить данные самостоятельно.\n\nОбработка запроса занимает до 24 часов.",
  },
  {
    patterns: [/комисси/i, /ставк/i, /процент/i, /сколько.*берёте/i, /вознагражден/i],
    response: "Комиссионная ставка устанавливается при регистрации и отображается в вашем профиле.\n\nИзменение ставки возможно только через администратора. Если у вас есть вопросы по условиям — напишите «оператор» для связи со специалистом.",
  },
  {
    patterns: [/как.*работа/i, /как.*начать/i, /инструкц/i, /не понимаю/i, /что делать/i, /с чего начать/i],
    response: "Вот краткая инструкция по работе:\n\n1️⃣ Заполните профиль и загрузите документы\n2️⃣ Дождитесь верификации (до 24 часов)\n3️⃣ После одобрения вы получите доступ к заказам\n4️⃣ Принимайте заказы и выполняйте их\n5️⃣ Получайте вознаграждение\n\nЕсли что-то непонятно — спрашивайте, я помогу!",
  },
  {
    patterns: [/заказ/i, /где.*заказ/i, /мои.*заказ/i, /нет.*заказ/i, /принять.*заказ/i],
    response: "Заказы отображаются в разделе «Заказы» в вашем кабинете.\n\nЧтобы получать заказы:\n✅ Ваш профиль должен быть верифицирован\n✅ Вы должны быть активны на платформе\n\nЕсли заказов нет — это может быть связано с текущей нагрузкой. Новые заказы появляются автоматически.",
  },
  {
    patterns: [/выплат/i, /деньг/i, /оплат/i, /когда.*получ/i, /баланс/i, /вывод/i],
    response: "Информация о выплатах и балансе доступна в разделе «Кабинет».\n\nВыплаты производятся в соответствии с условиями сотрудничества. Для уточнения деталей по конкретной выплате — напишите «оператор».",
  },
  {
    patterns: [/привет/i, /здравствуйте/i, /добрый день/i, /доброе утро/i, /добрый вечер/i, /хай/i, /хей/i],
    response: "Здравствуйте! 😊 Рад вас видеть! Чем могу помочь?\n\nВы можете спросить меня о:\n• Верификации\n• Заказах\n• Документах\n• Условиях работы\n\nИли напишите «оператор» для связи со специалистом.",
  },
  {
    patterns: [/спасибо/i, /благодар/i, /спс/i],
    response: "Пожалуйста! 😊 Рад был помочь. Если возникнут ещё вопросы — пишите, я всегда на связи!",
  },
  {
    patterns: [/проблем/i, /ошибк/i, /баг/i, /не работает/i, /сломал/i, /глючит/i],
    response: "Мне жаль, что у вас возникла проблема! 😔\n\nПожалуйста, опишите подробнее:\n• Что именно не работает?\n• На какой странице?\n• Какую ошибку видите?\n\nЭто поможет мне быстрее разобраться. Если проблема сложная — я подключу специалиста.",
  },
  {
    patterns: [/профиль/i, /аккаунт/i, /личн.*кабинет/i, /настройк/i],
    response: "Ваш профиль и настройки доступны через меню в верхней части страницы.\n\nВ профиле вы можете:\n• Просмотреть свои данные\n• Обновить фото\n• Изменить настройки уведомлений\n\nДля изменения паспортных данных или ФИО — потребуется повторная верификация.",
  },
  {
    patterns: [/удалить.*аккаунт/i, /удалить.*профиль/i, /деактивир/i],
    response: "Для удаления аккаунта необходимо обратиться к оператору поддержки. Напишите «оператор», и специалист поможет вам с этим вопросом.",
  },
  {
    patterns: [/пароль/i, /не могу.*войти/i, /забыл/i, /сброс/i, /восстанов/i],
    response: "Для восстановления доступа к аккаунту:\n\n1️⃣ Перейдите на страницу входа\n2️⃣ Нажмите «Забыли пароль?»\n3️⃣ Введите ваш email\n4️⃣ Следуйте инструкциям в письме\n\nЕсли письмо не приходит — проверьте папку «Спам». Если проблема сохраняется — напишите «оператор».",
  },
];

function generateBotReply(text: string, userMsgCount: number): { text: string; escalate: boolean } {
  if (ESCALATION_PATTERNS.some((p) => p.test(text))) {
    return {
      text: "Конечно! Перевожу вас на оператора поддержки. Пожалуйста, подождите — специалист подключится в ближайшее время. 🙋‍♂️",
      escalate: true,
    };
  }
  for (const rule of BOT_KNOWLEDGE) {
    if (rule.patterns.some((p) => p.test(text))) {
      return { text: rule.response, escalate: false };
    }
  }
  if (userMsgCount >= 3) {
    return {
      text: "Кажется, ваш вопрос лучше решит наш специалист. Перевожу вас на оператора поддержки! 🙋‍♂️\n\nПожалуйста, подождите — оператор подключится в ближайшее время.",
      escalate: true,
    };
  }
  return {
    text: "Я не совсем понял ваш вопрос 🤔\n\nПопробуйте описать проблему подробнее, или напишите «оператор» чтобы я подключил специалиста поддержки.",
    escalate: false,
  };
}

@Injectable()
export class SupportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiBot: AiBotService,
    private readonly notifications: NotificationService,
  ) {}

  // ========== ПОЛЬЗОВАТЕЛЬСКИЕ ЭНДПОИНТЫ ==========

  /** Создать тикет (SUPPLIER / MEDIATOR) */
  async createTicket(userId: string, role: UserRole, dto: CreateTicketInput) {
    const result = await this.prisma.$transaction(async (tx) => {
      const ticket = await tx.supportTicket.create({
        data: {
          authorId: userId,
          authorRole: role,
          subject: dto.subject,
          status: "WAITING_ADMIN",
        },
      });

      const message = await tx.supportMessage.create({
        data: {
          ticketId: ticket.id,
          sender: "USER",
          senderId: userId,
          text: dto.message,
          attachments: dto.attachments ? JSON.stringify(dto.attachments) : null,
        },
      });

      return { ticket, message };
    });

    // Автоответ бота (AI или fallback) — используем настройки по роли
    const roleKey = role === "MEDIATOR" ? "mediator" : role === "SUPPLIER" ? "supplier" : "buyer";
    const botResp = await this.aiBot.generateReply(`${dto.subject} ${dto.message}`, [], 0, roleKey);
    if (!botResp.escalate) {
      await this.prisma.$transaction([
        this.prisma.supportMessage.create({
          data: { ticketId: result.ticket.id, sender: "SYSTEM", text: botResp.text },
        }),
        this.prisma.supportTicket.update({
          where: { id: result.ticket.id },
          data: { lastMessageAt: new Date() },
        }),
      ]);
    }

    return result;
  }

  /** Мои тикеты (пагинация) */
  async myTickets(userId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.supportTicket.findMany({
        where: { authorId: userId },
        orderBy: { lastMessageAt: "desc" },
        skip,
        take: limit,
        include: {
          _count: { select: { messages: true } },
        },
      }),
      this.prisma.supportTicket.count({ where: { authorId: userId } }),
    ]);
    return { items, total, page, limit };
  }

  /** Тикет с сообщениями (только автор или ADMIN) */
  async getTicket(ticketId: string, userId: string, role: UserRole) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        messages: { orderBy: { createdAt: "asc" } },
        author: { select: { id: true, email: true, firstName: true, lastName: true, role: true } },
      },
    });
    if (!ticket) throw new NotFoundException("Тикет не найден");
    if (ticket.authorId !== userId && role !== "ADMIN") {
      throw new ForbiddenException("Нет доступа к этому тикету");
    }

    // Пометить сообщения прочитанными
    if (role === "ADMIN") {
      await this.prisma.supportMessage.updateMany({
        where: { ticketId, readByAdminAt: null },
        data: { readByAdminAt: new Date() },
      });
    } else {
      await this.prisma.supportMessage.updateMany({
        where: { ticketId, readByAuthorAt: null, sender: { not: "USER" } },
        data: { readByAuthorAt: new Date() },
      });
    }

    return ticket;
  }

  /** Отправить сообщение в тикет (USER) */
  async postMessage(ticketId: string, userId: string, dto: PostMessageInput) {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException("Тикет не найден");
    if (ticket.authorId !== userId) throw new ForbiddenException("Нет доступа");
    if (ticket.status === "CLOSED") throw new BadRequestException("Тикет закрыт");

    const [message] = await this.prisma.$transaction([
      this.prisma.supportMessage.create({
        data: {
          ticketId,
          sender: "USER",
          senderId: userId,
          text: dto.text,
          attachments: dto.attachments ? JSON.stringify(dto.attachments) : null,
        },
      }),
      this.prisma.supportTicket.update({
        where: { id: ticketId },
        data: { status: "WAITING_ADMIN", lastMessageAt: new Date() },
      }),
    ]);

    return message;
  }

  /** Закрыть тикет (USER — свой, ADMIN — любой) */
  async closeTicket(ticketId: string, userId: string, role: UserRole) {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException("Тикет не найден");
    if (ticket.authorId !== userId && role !== "ADMIN") throw new ForbiddenException("Нет доступа");

    return this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: { status: "CLOSED", closedAt: new Date() },
    });
  }

  // ========== ADMIN ЭНДПОИНТЫ ==========

  /** Список всех тикетов с фильтрами */
  async adminListTickets(filter: ListFilterInput) {
    const where: Record<string, unknown> = {};
    if (filter.status) where.status = filter.status;
    if (filter.role) where.authorRole = filter.role;

    const skip = (filter.page - 1) * filter.limit;
    const [items, total] = await Promise.all([
      this.prisma.supportTicket.findMany({
        where,
        orderBy: { lastMessageAt: "desc" },
        skip,
        take: filter.limit,
        include: {
          author: { select: { id: true, email: true, firstName: true, lastName: true, role: true } },
          _count: { select: { messages: true } },
        },
      }),
      this.prisma.supportTicket.count({ where }),
    ]);
    return { items, total, page: filter.page, limit: filter.limit };
  }

  /** Admin: ответить на тикет */
  async adminReply(ticketId: string, adminId: string, dto: PostMessageInput) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: { author: { select: { id: true } } },
    });
    if (!ticket) throw new NotFoundException("Тикет не найден");
    if (ticket.status === "CLOSED") throw new BadRequestException("Тикет закрыт");

    const [message] = await this.prisma.$transaction([
      this.prisma.supportMessage.create({
        data: {
          ticketId,
          sender: "ADMIN",
          senderId: adminId,
          text: dto.text,
          attachments: dto.attachments ? JSON.stringify(dto.attachments) : null,
        },
      }),
      this.prisma.supportTicket.update({
        where: { id: ticketId },
        data: { status: "WAITING_USER", lastMessageAt: new Date() },
      }),
    ]);

    // Notify ticket author
    this.notifications.notify(
      ticket.authorId,
      `💬 Ответ от службы поддержки GloBox:\n\n«${dto.text.slice(0, 200)}${dto.text.length > 200 ? "…" : ""}»\n\nОткройте чат поддержки, чтобы ответить.`,
    ).catch(() => {});

    return message;
  }

  /** Admin: включить бота обратно (убрать метку "админ подключён") */
  async adminEnableBot(ticketId: string) {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException("Тикет не найден");
    if (ticket.status === "CLOSED") throw new BadRequestException("Тикет закрыт");

    // Remove all ADMIN messages so hasAdminMsg becomes false and bot takes over
    await this.prisma.supportMessage.deleteMany({
      where: { ticketId, sender: "ADMIN" },
    });

    await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: { status: "OPEN" },
    });

    // Add system message
    await this.prisma.supportMessage.create({
      data: { ticketId, sender: "SYSTEM", text: "AI-бот снова подключён. Я готов помочь! 🤖" },
    });

    return { ok: true };
  }

  /** Admin: количество непрочитанных тикетов (для бейджа) */
  async adminUnreadCount() {
    const count = await this.prisma.supportTicket.count({
      where: { status: "WAITING_ADMIN" },
    });
    return { count };
  }

  // ========== SINGLE-CHAT MODE (мессенджер) ==========

  /** Получить или создать единственный активный чат пользователя */
  async getOrCreateChat(userId: string, role: UserRole) {
    let ticket = await this.prisma.supportTicket.findFirst({
      where: { authorId: userId, status: { not: "CLOSED" } },
      orderBy: { createdAt: "desc" },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });

    if (!ticket) {
      ticket = await this.prisma.$transaction(async (tx) => {
        const t = await tx.supportTicket.create({
          data: { authorId: userId, authorRole: role, subject: "Чат с поддержкой", status: "OPEN" },
        });
        await tx.supportMessage.create({
          data: { ticketId: t.id, sender: "SYSTEM", text: BOT_GREETING },
        });
        return tx.supportTicket.findUniqueOrThrow({
          where: { id: t.id },
          include: { messages: { orderBy: { createdAt: "asc" } } },
        });
      });
    }

    // Пометить сообщения прочитанными
    await this.prisma.supportMessage.updateMany({
      where: { ticketId: ticket.id, readByAuthorAt: null, sender: { not: "USER" } },
      data: { readByAuthorAt: new Date() },
    });

    const hasAdminMsg = ticket.messages.some((m) => m.sender === "ADMIN");
    const mode: "bot" | "waiting" | "admin" =
      hasAdminMsg ? "admin" : ticket.status === "WAITING_ADMIN" ? "waiting" : "bot";

    return {
      id: ticket.id,
      status: ticket.status,
      mode,
      messages: ticket.messages.map((m) => ({
        id: m.id,
        sender: m.sender,
        text: m.text,
        createdAt: m.createdAt,
      })),
      createdAt: ticket.createdAt,
    };
  }

  /** Отправить сообщение в активный чат (с AI-ботом) */
  async chatSendMessage(userId: string, text: string) {
    const ticket = await this.prisma.supportTicket.findFirst({
      where: { authorId: userId, status: { not: "CLOSED" } },
      orderBy: { createdAt: "desc" },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
    if (!ticket) throw new NotFoundException("Нет активного чата");

    // Добавить сообщение пользователя
    await this.prisma.$transaction([
      this.prisma.supportMessage.create({
        data: { ticketId: ticket.id, sender: "USER", senderId: userId, text },
      }),
      this.prisma.supportTicket.update({
        where: { id: ticket.id },
        data: { lastMessageAt: new Date() },
      }),
    ]);

    // Проверить, подключился ли админ
    const hasAdminMsg = ticket.messages.some((m) => m.sender === "ADMIN");

    if (!hasAdminMsg) {
      // Режим бота — генерируем ответ (AI или fallback)
      const userMsgCount = ticket.messages.filter((m) => m.sender === "USER").length + 1;
      const history = ticket.messages.map((m) => ({ sender: m.sender, text: m.text }));
      const ticketRole = ticket.authorRole === "MEDIATOR" ? "mediator" : ticket.authorRole === "SUPPLIER" ? "supplier" : "buyer";
      const botResp = await this.aiBot.generateReply(text, history, userMsgCount, ticketRole);

      await this.prisma.supportMessage.create({
        data: { ticketId: ticket.id, sender: "SYSTEM", text: botResp.text },
      });

      await this.prisma.supportTicket.update({
        where: { id: ticket.id },
        data: {
          status: botResp.escalate ? "WAITING_ADMIN" : "OPEN",
          lastMessageAt: new Date(),
        },
      });
    } else {
      // Режим админа — просто обновляем статус
      await this.prisma.supportTicket.update({
        where: { id: ticket.id },
        data: { status: "WAITING_ADMIN", lastMessageAt: new Date() },
      });
    }

    return { ok: true };
  }

  /** Закрыть активный чат */
  async chatClose(userId: string) {
    const ticket = await this.prisma.supportTicket.findFirst({
      where: { authorId: userId, status: { not: "CLOSED" } },
      orderBy: { createdAt: "desc" },
    });
    if (!ticket) throw new NotFoundException("Нет активного чата");

    await this.prisma.supportTicket.update({
      where: { id: ticket.id },
      data: { status: "CLOSED", closedAt: new Date() },
    });
    return { ok: true };
  }

  /** Начать новый чат (закрыть текущий) */
  async chatStartNew(userId: string, role: UserRole) {
    await this.prisma.supportTicket.updateMany({
      where: { authorId: userId, status: { not: "CLOSED" } },
      data: { status: "CLOSED", closedAt: new Date() },
    });
    return this.getOrCreateChat(userId, role);
  }
}
