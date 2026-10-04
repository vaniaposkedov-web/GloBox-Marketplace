import "reflect-metadata";
import * as path from "path";
import * as fs from "fs";
import { NestFactory } from "@nestjs/core";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import fastifyCookie from "@fastify/cookie";
import fastifyStatic from "@fastify/static";
import { AppModule } from "./app.module";

async function bootstrap() {
  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ trustProxy: true, logger: false, bodyLimit: 15 * 1024 * 1024 }),
  );

  await app.register(fastifyCookie as unknown as Parameters<typeof app.register>[0]);

  await app.register(fastifyStatic as unknown as Parameters<typeof app.register>[0], {
    root: path.join(process.cwd(), "public", "uploads"),
    prefix: "/api/uploads/",
    decorateReply: false,
  });

  const origins = (process.env.WEB_ORIGIN ?? "http://localhost:3000")
    .split(",")
    .map((o) => o.trim());
  const allOrigins = [
    ...origins,
    "http://localhost:3001", // seller
    "http://localhost:3002", // admin
    "http://localhost:3003", // mediator
    "https://posred-globox.ru",
    "https://www.posred-globox.ru",
    "https://seller-globox.ru",
    "https://www.seller-globox.ru",
    "https://web-kappa-taupe-63.vercel.app",
    "https://seller-blush-ten.vercel.app",
    "https://admin-iota-eosin-32.vercel.app",
  ];
  app.enableCors({
    origin: (origin, cb) => {
      if (!origin || allOrigins.includes(origin) || /\.vercel\.app$/.test(origin)) {
        cb(null, true);
      } else {
        cb(null, false);
      }
    },
    credentials: true,
  });

  app.setGlobalPrefix("api");

  // Swagger
  const config = new DocumentBuilder()
    .setTitle("Marketplace API")
    .setDescription("BFF/API для маркетплейса (NestJS + Fastify)")
    .setVersion("0.1.0")
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("docs", app, document);

  // Railway/Heroku/др. PaaS обычно подставляют PORT. API_PORT — dev-fallback.
  const port = Number(process.env.PORT ?? process.env.API_PORT ?? 4000);
  const host = process.env.API_HOST ?? "0.0.0.0";
  await app.listen(port, host);

  // eslint-disable-next-line no-console
  console.log(`[api] listening on http://${host}:${port}  (docs: /docs)`);
}

void bootstrap();
