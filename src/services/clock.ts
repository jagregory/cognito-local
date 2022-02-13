export interface Clock {
  set(date: Date): Date;
  get(): Date;
  advanceBy(ms: number): Date;
}

export class DateClock implements Clock {
  private current: Date | null = null;

  /**
   * Construct a new DateClock with an optional start value
   * @param initialValue
   */
  constructor(initialValue: Date | null = null) {
    this.current = initialValue;
  }

  /**
   * Fix the date of this clock
   * @param date
   * @returns
   */
  public set(date: Date): Date {
    this.current = date;
    return this.current;
  }

  /**
   * Return either a Date object with the fixed time this object represents, or "now"
   */
  public get(): Date {
    return this.current ?? new Date();
  }

  /**
   * Increment this objects time by a number of milliseconds and fixate it
   */
  public advanceBy(ms: number): Date {
    return this.set(new Date(this.get().getTime() + ms));
  }
}
