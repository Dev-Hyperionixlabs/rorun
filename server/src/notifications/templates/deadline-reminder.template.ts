export interface DeadlineReminderData {
  taskTitle: string;
  dueDate: string;
  daysUntil: number;
  businessName: string;
  taskUrl?: string;
}

export function renderDeadlineReminderEmail(data: DeadlineReminderData): { subject: string; html: string; text: string } {
  const subject = `Reminder: ${data.taskTitle} due in ${data.daysUntil} day${data.daysUntil !== 1 ? 's' : ''}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #10b981; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; padding: 12px 24px; background: #10b981; color: white; text-decoration: none; border-radius: 6px; margin-top: 16px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0;">Tax Deadline Reminder</h1>
        </div>
        <div class="content">
          <p>Hello,</p>
          <p>This is a reminder that <strong>${data.taskTitle}</strong> for ${data.businessName} is due in <strong>${data.daysUntil} day${data.daysUntil !== 1 ? 's' : ''}</strong>.</p>
          <p><strong>Due date:</strong> ${new Date(data.dueDate).toLocaleDateString('en-NG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          ${data.taskUrl ? `<a href="${data.taskUrl}" class="button">View Task</a>` : ''}
          <p style="margin-top: 24px; font-size: 14px; color: #6b7280;">
            This is an automated reminder from Rorun. Please ensure you complete this task before the deadline.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Tax Deadline Reminder

Hello,

This is a reminder that ${data.taskTitle} for ${data.businessName} is due in ${data.daysUntil} day${data.daysUntil !== 1 ? 's' : ''}.

Due date: ${new Date(data.dueDate).toLocaleDateString('en-NG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}

${data.taskUrl ? `View task: ${data.taskUrl}` : ''}

This is an automated reminder from Rorun. Please ensure you complete this task before the deadline.
  `.trim();

  return { subject, html, text };
}

export function renderDeadlineReminderSms(data: DeadlineReminderData): string {
  return `Rorun reminder: ${data.taskTitle} for ${data.businessName} is due in ${data.daysUntil} day${data.daysUntil !== 1 ? 's' : ''}. Due: ${new Date(data.dueDate).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' })}`;
}

