import { PrismaModule } from './core/databases/prisma/prisma.module';
import { RedisModule } from './core/databases/redis/redis.module';
import { QueuesModule } from './core/queues/queues.module';
import { JobsModule } from './core/jobs/jobs.module';
import { AppCacheCoreModule } from './core/cache/app-cache.module';
import { StorageModule } from './core/storage/storage.module';
import { ConfigModule } from './shared/config/env/env.module';
import { AuthSharedModule } from './shared/auth/auth-shared.module';
import { NotificationProvidersModule } from './integrations/notifications/providers/notification-providers.module';
import { ActivityModule } from './modules/activity/activity.module';
import { AuthModule } from './modules/auth/auth.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { FormsModule } from './modules/forms/forms.module';
import { ClientsModule } from './modules/clients/clients.module';
import { AssignmentsModule } from './modules/assignments/assignments.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { InboxModule } from './modules/inbox/inbox.module';
import { ExportsModule } from './modules/exports/exports.module';
import { FileSpaceModule } from './modules/file-space/file-space.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { TeamModule } from './modules/team/team.module';
import { PortalModule } from './modules/portal/portal.module';
import { PublicPortalModule } from './modules/public-portal/public-portal.module';
import { ContactModule } from './modules/contact/contact.module';
import { JobsApiModule } from './modules/jobs/jobs-api.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';

/** Infrastructure shared by the API process and the worker process. */
export const INFRASTRUCTURE_MODULES = [
  ConfigModule,
  PrismaModule,
  RedisModule,
  QueuesModule,
  JobsModule,
  AppCacheCoreModule,
  StorageModule,
  AuthSharedModule,
  NotificationProvidersModule,
  ActivityModule,
];

/** Feature modules (each owns its controller and services). */
export const FEATURE_MODULES = [
  AuthModule,
  NotificationsModule,
  FormsModule,
  ClientsModule,
  AssignmentsModule,
  DocumentsModule,
  InboxModule,
  ExportsModule,
  FileSpaceModule,
  DashboardModule,
  OrganizationsModule,
  TeamModule,
  PortalModule,
  PublicPortalModule,
  ContactModule,
  JobsApiModule,
  WebhooksModule,
];
