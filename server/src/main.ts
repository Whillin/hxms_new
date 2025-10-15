import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './modules/app.module'
import { ValidationPipe } from '@nestjs/common'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  app.enableCors({ origin: [/^http:\/\/localhost:\d+$/], credentials: true })
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }))
  const port = Number(process.env.PORT || 3001)
  await app.listen(port)
  console.log(`Nest server is running at http://localhost:${port}`)
}

bootstrap()
