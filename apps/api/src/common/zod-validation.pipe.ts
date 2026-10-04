import {
  ArgumentMetadata,
  BadRequestException,
  PipeTransform,
} from "@nestjs/common";
import { ZodError, ZodSchema } from "zod";

/**
 * Pipe для валидации body/params через Zod-схемы из @marketplace/shared.
 * При ошибке возвращает первое сообщение для UX (на фронте можно разбирать подробности).
 */
export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodSchema<T>) {}

  transform(value: unknown, _metadata: ArgumentMetadata): T {
    try {
      return this.schema.parse(value);
    } catch (err) {
      if (err instanceof ZodError) {
        const first = err.issues[0];
        throw new BadRequestException({
          message: first?.message ?? "Некорректные данные",
          issues: err.issues.map((i) => ({
            path: i.path.join("."),
            message: i.message,
          })),
        });
      }
      throw err;
    }
  }
}
