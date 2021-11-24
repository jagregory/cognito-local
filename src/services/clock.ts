export interface Clock {
  get(): Date;
}

export class DateClock implements Clock {
  get(): Date {
    return new Date();
  }
}
