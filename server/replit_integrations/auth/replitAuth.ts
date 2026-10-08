import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import * as oidc from "openid-client";
import { authStorage } from "./storage";
import { db } from "../../db";
import { users } from "@shared/models/auth";
import { eq } from "drizzle-orm";

// Kept at the existing import path so the app's role-protected routes stay intact.
// Authentication now uses an independently configured OIDC provider.
export function getSession() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("Set a new SESSION_SECRET with at least 32 characters");
  const sessionTtlSeconds = 7 * 24 * 60 * 60;
  const pgStore = connectPg(session);
  return session({
    name: "zibana.sid",
    secret,
    store: new pgStore({ conString: process.env.DATABASE_URL, createTableIfMissing: false, ttl: sessionTtlSeconds, tableName: "sessions" }),
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: sessionTtlSeconds * 1000 },
  });
}

export async function setupAuth(app: Express) {
  const base = process.env.APP_BASE_URL;
  const issuer = process.env.OIDC_ISSUER_URL;
  const clientId = process.env.OIDC_CLIENT_ID;
  const clientSecret = process.env.OIDC_CLIENT_SECRET;
  if (!base || !issuer || !clientId || !clientSecret) {
    throw new Error("Configure APP_BASE_URL, OIDC_ISSUER_URL, OIDC_CLIENT_ID and OIDC_CLIENT_SECRET before starting Zibana");
  }
  const baseUrl = new URL(base);
  if (process.env.NODE_ENV === "production" && baseUrl.protocol !== "https:") throw new Error("APP_BASE_URL must use HTTPS in production");
  if (process.env.NODE_ENV === "production" && new URL(issuer).protocol !== "https:") throw new Error("OIDC issuer must use HTTPS in production");
  const redirectUri = new URL("/api/callback", baseUrl).href;
  const config = await oidc.discovery(new URL(issuer), clientId, clientSecret);
  app.set("trust proxy", 1);
  const sessionMiddleware = getSession();
  app.locals.zibanaSession = sessionMiddleware;
  app.use(sessionMiddleware);
  app.use(passport.initialize());
  app.use(passport.session());
  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", async (req, res, next) => {
    try {
      const verifier = oidc.randomPKCECodeVerifier();
      const state = oidc.randomState();
      const nonce = oidc.randomNonce();
      (req.session as any).oidc = { verifier, state, nonce, createdAt: Date.now() };
      const url = oidc.buildAuthorizationUrl(config, {
        redirect_uri: redirectUri, scope: "openid email profile", state, nonce,
        code_challenge: await oidc.calculatePKCECodeChallenge(verifier), code_challenge_method: "S256",
      });
      req.session.save(err => err ? next(err) : res.redirect(url.href));
    } catch (err) { next(err); }
  });

  app.get("/api/callback", async (req, res, next) => {
    const pending = (req.session as any).oidc;
    delete (req.session as any).oidc;
    if (!pending || Date.now() - pending.createdAt > 10 * 60 * 1000) {
      res.status(401).json({ message: "Sign-in expired. Please sign in again." }); return;
    }
    try {
      await new Promise<void>((resolve, reject) => req.session.save(err => err ? reject(err) : resolve()));
      const currentUrl = new URL(redirectUri);
      currentUrl.search = new URL(req.originalUrl, baseUrl).search;
      const tokens = await oidc.authorizationCodeGrant(config, currentUrl, {
        pkceCodeVerifier: pending.verifier, expectedState: pending.state, expectedNonce: pending.nonce, idTokenExpected: true,
      });
      const claims = tokens.claims();
      if (!claims?.sub || claims.email_verified !== true || typeof claims.email !== "string") {
        res.status(401).json({ message: "A verified email address is required." }); return;
      }
      const email = claims.email.toLowerCase();
      // Preserve restored user IDs and their linked rides, balances and roles.
      const [existing] = await db.select().from(users).where(eq(users.email, email));
      const user = await authStorage.upsertUser({
        id: existing?.id || `oidc:${claims.iss}:${claims.sub}`,
        email,
        firstName: typeof claims.given_name === "string" ? claims.given_name : existing?.firstName,
        lastName: typeof claims.family_name === "string" ? claims.family_name : existing?.lastName,
        profileImageUrl: typeof claims.picture === "string" ? claims.picture : existing?.profileImageUrl,
      });
      const identity = { claims: { sub: user.id, email: user.email, first_name: user.firstName, last_name: user.lastName }, expires_at: claims.exp };
      await new Promise<void>((resolve, reject) => req.session.regenerate(err => err ? reject(err) : resolve()));
      req.login(identity, err => {
        if (err) return next(err);
        req.session.save(saveErr => saveErr ? next(saveErr) : res.redirect("/"));
      });
    } catch {
      res.status(401).json({ message: "Sign-in failed. Please try again." });
    }
  });

  app.get("/api/logout", (req, res, next) => {
    req.logout(err => {
      if (err) return next(err);
      req.session.destroy(destroyErr => {
        if (destroyErr) return next(destroyErr);
        res.clearCookie("zibana.sid", { path: "/" });
        const target = req.query.redirect;
        res.redirect(typeof target === "string" && /^\/(?!\/)/.test(target) && !target.includes("\\") ? target : "/");
      });
    });
  });
}

export const isAuthenticated: RequestHandler = (req, res, next) => {
  const identity = req.user as any;
  if (!req.isAuthenticated?.() || !identity?.claims?.sub || identity.claims.sub === "dev-user" ||
      !Number.isFinite(identity.expires_at) || identity.expires_at <= Date.now() / 1000) {
    res.status(401).json({ message: "Unauthorized" }); return;
  }
  next();
};
