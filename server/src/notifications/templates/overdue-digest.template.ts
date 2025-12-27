export interface OverdueDigestData {
  businessName: string;
  overdueCount: number;
  topTasks: Array<{ title: string; dueDate: string; taskId: string }>;
  tasksUrl?: string;
}

export function renderOverdueDigestEmail(data: OverdueDigestData): { subject: string; html: string; text: string } {
  const subject = `${data.overdueCount} overdue task${data.overdueCount !== 1 ? 's' : ''} for ${data.businessName}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #ef4444; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
        .task-item { background: white; padding: 12px; margin: 8px 0; border-radius: 6px; border-left: 4px solid #ef4444; }
        .button { display: inline-block; padding: 12px 24px; background: #ef4444; color: white; text-decoration: none; border-radius: 6px; margin-top: 16px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0;">Overdue Tasks Digest</h1>
        </div>
        <div class="content">
          <p>Hello,</p>
          <p>You have <strong>${data.overdueCount} overdue task${data.overdueCount !== 1 ? 's' : ''}</strong> for ${data.businessName}:</p>
          ${data.topTasks.map(task => `
            <div class="task-item">
              <strong>${task.title}</strong><br>
              <small>Due: ${new Date(task.dueDate).toLocaleDateString('en-NG', { month: 'short', day: 'numeric', year: 'numeric' })}</small>
            </div>
          `).join('')}
          ${data.tasksUrl ? `<a href="${data.tasksUrl}" class="button">View All Tasks</a>` : ''}
          <p style="margin-top: 24px; font-size: 14px; color: #6b7280;">
            Please complete these tasks as soon as possible to avoid penalties.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Overdue Tasks Digest

Hello,

You have ${data.overdueCount} overdue task${data.overdueCount !== 1 ? 's' : ''} for ${data.businessName}:

${data.topTasks.map(task => `- ${task.title} (Due: ${new Date(task.dueDate).toLocaleDateString('en-NG', { month: 'short', day: 'numeric', year: 'numeric' })})`).join('\n')}

${data.tasksUrl ? `View all tasks: ${data.tasksUrl}` : ''}

Please complete these tasks as soon as possible to avoid penalties.
  `.trim();

  return { subject, html, text };
}

export function renderOverdueDigestSms(data: OverdueDigestData): string {
  const tasksList = data.topTasks.slice(0, 2).map(t => t.title).join(', ');
  return `Rorun: ${data.overdueCount} overdue task${data.overdueCount !== 1 ? 's' : ''} for ${data.businessName}. ${tasksList}${data.topTasks.length > 2 ? '...' : ''}`;
}

