import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { NotificationsService } from './notifications.service';

@Processor('notifications')
export class NotificationsWorker {
  constructor(private notificationsService: NotificationsService) {}

  @Process('send')
  async handleSend(job: Job) {
    const { eventId } = job.data;
    await this.notificationsService.sendNotification(eventId);
  }
}

