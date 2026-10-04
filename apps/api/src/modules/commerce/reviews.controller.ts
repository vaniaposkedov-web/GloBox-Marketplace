import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  createReviewSchema,
  type CreateReview,
  type ReviewDto,
  type ReviewsSummary,
} from "@marketplace/shared";
import { ZodValidationPipe } from "../../common/zod-validation.pipe";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import type { AccessTokenPayload } from "../auth/tokens.service";
import { ReviewsService } from "./reviews.service";

@ApiTags("commerce")
@Controller("listings/:listingId/reviews")
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Get()
  @ApiOperation({ summary: "Отзывы на товар" })
  list(
    @Param("listingId", new ParseUUIDPipe()) listingId: string,
  ): Promise<ReviewDto[]> {
    return this.reviews.listForListing(listingId);
  }

  @Get("summary")
  @ApiOperation({ summary: "Сводная оценка товара" })
  summary(
    @Param("listingId", new ParseUUIDPipe()) listingId: string,
  ): Promise<ReviewsSummary> {
    return this.reviews.summaryForListing(listingId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Оставить отзыв" })
  create(
    @CurrentUser() user: AccessTokenPayload,
    @Param("listingId", new ParseUUIDPipe()) listingId: string,
    @Body(new ZodValidationPipe(createReviewSchema.omit({ listingId: true })))
    dto: Omit<CreateReview, "listingId">,
  ): Promise<ReviewDto> {
    return this.reviews.create(user.sub, { ...dto, listingId });
  }
}
