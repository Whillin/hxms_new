import { Injectable, NestMiddleware, Inject } from '@nestjs/common'
import { Request, Response, NextFunction } from 'express'
import { Cache } from 'cache-manager'
import { CACHE_MANAGER } from '@nestjs/cache-manager'

@Injectable()
export class DebounceMiddleware implements NestMiddleware {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const key = `${req.method}_${req.originalUrl}_${JSON.stringify(req.query)}` // 简单键基于方法、URL和查询参数
    const cached = await this.cacheManager.get(key)

    if (cached) {
      return res.json(cached)
    }

    const originalSend = res.json.bind(res)
    res.json = (body) => {
      if (res.statusCode < 300) {
        // 只缓存成功响应
        this.cacheManager.set(key, body, 10000) // 缓存10秒
      }
      return originalSend(body)
    }

    next()
  }
}
