export interface ParsedLine {
  date: Date;
  description: string;
  amount: number;
  direction: 'credit' | 'debit';
  confidence: number;
}

/**
 * Parse CSV content into transaction lines
 */
export function parseCsv(csvContent: string): ParsedLine[] {
  const lines: ParsedLine[] = [];
  const rows = csvContent.split('\n').filter((row) => row.trim());

  // Skip header row
  const dataRows = rows.slice(1);

  for (const row of dataRows) {
    const columns = parseCsvRow(row);
    if (columns.length < 3) continue;

    // Common CSV formats:
    // Date, Description, Amount
    // Date, Description, Debit, Credit
    // Date, Description, Amount, Type

    const dateStr = columns[0]?.trim();
    const description = columns[1]?.trim() || '';
    let amount = 0;
    let direction: 'credit' | 'debit' = 'debit';

    // Try to parse amount
    if (columns.length >= 3) {
      const amountStr = columns[2]?.replace(/[,\s₦$]/g, '');
      amount = parseFloat(amountStr) || 0;
    }

    // Check for separate debit/credit columns
    if (columns.length >= 4) {
      const debit = parseFloat(columns[2]?.replace(/[,\s₦$]/g, '') || '0');
      const credit = parseFloat(columns[3]?.replace(/[,\s₦$]/g, '') || '0');
      if (credit > 0) {
        amount = credit;
        direction = 'credit';
      } else if (debit > 0) {
        amount = debit;
        direction = 'debit';
      }
    }

    // Check for type column
    if (columns.length >= 4 && columns[3]) {
      const type = columns[3].toLowerCase();
      if (type.includes('credit') || type.includes('income') || type.includes('deposit')) {
        direction = 'credit';
      }
    }

    // Parse date
    const date = parseDate(dateStr);
    if (!date || amount === 0) continue;

    lines.push({
      date,
      description,
      amount: Math.abs(amount),
      direction,
      confidence: 0.8,
    });
  }

  return lines;
}

/**
 * Parse pasted text (statement format) into transaction lines
 */
export function parsePaste(rawText: string): ParsedLine[] {
  const lines: ParsedLine[] = [];
  const textLines = rawText.split('\n').filter((line) => line.trim());

  // Common patterns:
  // Date Description Amount
  // DD/MM/YYYY Description ₦Amount
  // Date | Description | Amount

  for (const line of textLines) {
    // Skip header-like lines
    if (
      line.toLowerCase().includes('date') ||
      line.toLowerCase().includes('description') ||
      line.toLowerCase().includes('balance')
    ) {
      continue;
    }

    // Try different separators
    const parts = line.split(/[\t|,;]/).map((p) => p.trim());

    if (parts.length < 2) {
      // Try space-separated
      const spaceParts = line.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s+(.+?)\s+([₦$]?\d[\d,\.]+)/);
      if (spaceParts) {
        const [, dateStr, desc, amountStr] = spaceParts;
        const date = parseDate(dateStr);
        const amount = parseFloat(amountStr.replace(/[,\s₦$]/g, '')) || 0;
        if (date && amount > 0) {
          lines.push({
            date,
            description: desc.trim(),
            amount: Math.abs(amount),
            direction: amount > 0 ? 'credit' : 'debit',
            confidence: 0.7,
          });
        }
        continue;
      }
    }

    if (parts.length >= 3) {
      const dateStr = parts[0];
      const description = parts.slice(1, -1).join(' ').trim();
      const amountStr = parts[parts.length - 1];

      const date = parseDate(dateStr);
      const amount = parseFloat(amountStr.replace(/[,\s₦$]/g, '')) || 0;

      if (date && amount !== 0) {
        lines.push({
          date,
          description,
          amount: Math.abs(amount),
          direction: amount > 0 ? 'credit' : 'debit',
          confidence: 0.7,
        });
      }
    }
  }

  return lines;
}

function parseCsvRow(row: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < row.length; i++) {
    const char = row[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;

  const buildDate = (year: number, month1to12: number, day1to31: number): Date | null => {
    if (!Number.isFinite(year) || !Number.isFinite(month1to12) || !Number.isFinite(day1to31)) return null;
    if (month1to12 < 1 || month1to12 > 12) return null;
    if (day1to31 < 1 || day1to31 > 31) return null;
    const d = new Date(year, month1to12 - 1, day1to31);
    // Reject JS overflow (e.g., month=25 becomes a "valid" date)
    if (
      d.getFullYear() !== year ||
      d.getMonth() !== month1to12 - 1 ||
      d.getDate() !== day1to31
    ) {
      return null;
    }
    return Number.isNaN(d.getTime()) ? null : d;
  };

  // Try common formats
  const formats = [
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/, // DD/MM/YYYY or DD-MM-YYYY
    /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/, // YYYY-MM-DD
  ];

  for (const format of formats) {
    const match = dateStr.match(format);
    if (match) {
      let day: number, month: number, year: number;

      if (match[1].length === 4) {
        // YYYY-MM-DD
        year = parseInt(match[1]);
        const m = parseInt(match[2]);
        const d = parseInt(match[3]);
        const built = buildDate(year, m, d);
        if (built) return built;
      } else {
        // DD/MM/YYYY or MM/DD/YYYY (ambiguous) — try both, reject overflows.
        const a = parseInt(match[1]); // day OR month
        const b = parseInt(match[2]); // month OR day
        year = parseInt(match[3]);
        if (year < 100) year += 2000;
        const asDDMM = buildDate(year, b, a);
        const asMMDD = buildDate(year, a, b);

        // Prefer the interpretation that is valid; if both are valid, default to DD/MM (NG)
        if (asDDMM && !asMMDD) return asDDMM;
        if (asMMDD && !asDDMM) return asMMDD;
        if (asDDMM && asMMDD) return asDDMM;
      }
    }
  }

  // Try native Date parsing
  const native = new Date(dateStr);
  if (!isNaN(native.getTime())) return native;

  return null;
}

