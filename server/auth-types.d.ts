import "passport";
declare global {
  namespace Express {
    interface User {
      claims: { sub: string; email?: string | null; first_name?: string | null; last_name?: string | null };
      expires_at: number;
    }
  }
}
