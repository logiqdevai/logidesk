import { Global, Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './services/notifications.service';
import { NotificationDeliveryService } from './services/notification-delivery.service';
import { ReminderSchedulesService } from './services/reminder-schedules.service';
import { RemindersService } from './services/reminders.service';
import { NotificationAdminService } from './services/notification-admin.service';

@Global()
@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationDeliveryService, ReminderSchedulesService, RemindersService, NotificationAdminService],
  exports: [NotificationsService, NotificationDeliveryService, ReminderSchedulesService, RemindersService, NotificationAdminService],
})
export class NotificationsModule {}
