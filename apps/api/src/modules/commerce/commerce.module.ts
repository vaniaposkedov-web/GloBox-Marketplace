import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { CartController } from "./cart.controller";
import { CartService } from "./cart.service";
import { OrdersController } from "./orders.controller";
import { OrdersService } from "./orders.service";
import { OrderRequestsController } from "./order-requests.controller";
import { OrderRequestsService } from "./order-requests.service";
import { MediatorOrdersController } from "./mediator-orders.controller";
import { MediatorOrdersService } from "./mediator-orders.service";
import { FavoritesController } from "./favorites.controller";
import { FavoritesService } from "./favorites.service";
import { ReviewsController } from "./reviews.controller";
import { ReviewsService } from "./reviews.service";

@Module({
  imports: [AuthModule],
  controllers: [
    CartController,
    OrdersController,
    OrderRequestsController,
    MediatorOrdersController,
    FavoritesController,
    ReviewsController,
  ],
  providers: [
    CartService,
    OrdersService,
    OrderRequestsService,
    MediatorOrdersService,
    FavoritesService,
    ReviewsService,
  ],
  exports: [
    CartService,
    OrdersService,
    OrderRequestsService,
    MediatorOrdersService,
    FavoritesService,
    ReviewsService,
  ],
})
export class CommerceModule {}
