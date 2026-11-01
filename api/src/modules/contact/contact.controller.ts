import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RateLimit, RateLimitGuard } from '@/shared/security/rate-limit.guard';
import { ContactService } from './contact.service';
import { ContactDto } from './dto/contact.dto';

@ApiTags('Contact')
@Controller('public/contact')
@UseGuards(RateLimitGuard)
export class ContactController {
  constructor(private readonly contact: ContactService) {}

  @Post()
  @HttpCode(200)
  @RateLimit({ name: 'contact', limit: 5, windowSeconds: 3600 })
  send(@Body() dto: ContactDto) {
    return this.contact.send(dto);
  }
}
