export class EmailRule {
  private static readonly EMAIL_REGEX =
    /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  /**
   * Validates an email address.
   * @param email - email string to validate
   * @returns true if the email is valid, false otherwise
   */
  static validate(email: string): boolean {
    return this.EMAIL_REGEX.test(email);
  }
}
