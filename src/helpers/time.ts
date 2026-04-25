// Simple time utility - replaces dayjs for FTP server date formatting

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function pad(n: number, width = 2): string {
  return n.toString().padStart(width, '0');
}

export class Time {
  private readonly date: Date;

  constructor(date: Date = new Date()) {
    this.date = date;
  }

  static now(): Time {
    return new Time(new Date());
  }

  static from(date: Date): Time {
    return new Time(date);
  }

  diff(other: Time, unit: 'month'): number {
    return Math.abs(
      (this.date.getFullYear() - other.date.getFullYear()) * 12 +
      (this.date.getMonth() - other.date.getMonth())
    );
  }

  format(template: string): string {
    const d = this.date;
    return template
      .replace('MMM', MONTHS[d.getMonth()])
      .replace('DD', pad(d.getDate()))
      .replace('YYYY', d.getFullYear().toString())
      .replace('HH', pad(d.getHours()))
      .replace('mm', pad(d.getMinutes()));
  }
}