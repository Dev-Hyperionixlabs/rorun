export interface FilingPackReadyData {
  businessName: string;
  taxYear: number;
  packUrl?: string;
}

export function renderFilingPackReadyEmail(data: FilingPackReadyData): { subject: string; html: string; text: string } {
  const subject = `Your ${data.taxYear} filing pack is ready`;
  
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
          <h1 style="margin: 0;">Filing Pack Ready</h1>
        </div>
        <div class="content">
          <p>Hello,</p>
          <p>Your filing pack for <strong>${data.taxYear}</strong> for ${data.businessName} is ready for download.</p>
          <p>The pack includes:</p>
          <ul>
            <li>PDF summary report</li>
            <li>CSV transaction export</li>
            <li>ZIP bundle with all attachments</li>
          </ul>
          ${data.packUrl ? `<a href="${data.packUrl}" class="button">Download Pack</a>` : ''}
          <p style="margin-top: 24px; font-size: 14px; color: #6b7280;">
            You can download your filing pack from your Rorun dashboard.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Filing Pack Ready

Hello,

Your filing pack for ${data.taxYear} for ${data.businessName} is ready for download.

The pack includes:
- PDF summary report
- CSV transaction export
- ZIP bundle with all attachments

${data.packUrl ? `Download: ${data.packUrl}` : ''}

You can download your filing pack from your Rorun dashboard.
  `.trim();

  return { subject, html, text };
}

export function renderFilingPackReadySms(data: FilingPackReadyData): string {
  return `Rorun: Your ${data.taxYear} filing pack for ${data.businessName} is ready. Download from your dashboard.`;
}

