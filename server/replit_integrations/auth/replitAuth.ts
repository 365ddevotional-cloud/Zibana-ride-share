import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { authStorage } from "./storage";

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true,
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(claims: any) {
  await authStorage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const user = {};
    updateUserSession(user, tokens);
    await upsertUser(tokens.claims());
    verified(null, user);
  };

  // Keep track of registered strategies
  const registeredStrategies = new Set<string>();

  // Helper function to ensure strategy exists for a domain
  const ensureStrategy = (domain: string) => {
    const strategyName = `replitauth:${domain}`;
    if (!registeredStrategies.has(strategyName)) {
      const strategy = new Strategy(
        {
          name: strategyName,
          config,
          scope: "openid email profile offline_access",
          callbackURL: `https://${domain}/api/callback`,
        },
        verify
      );
      passport.use(strategy);
      registeredStrategies.add(strategyName);
    }
  };

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  // Role-aware login: store intended role before OAuth
  app.get("/api/login", (req, res, next) => {
    const authContext = req.query.role as string;
    const validRoles = ["rider", "driver", "admin"];
    
    // Store auth context in session before OAuth redirect
    if (authContext && validRoles.includes(authContext.toLowerCase())) {
      (req.session as any).authContext = authContext.toLowerCase();
    } else {
      // Default to rider if no valid role specified
      (req.session as any).authContext = "rider";
    }
    
    req.session.save(() => {
      ensureStrategy(req.hostname);
      passport.authenticate(`replitauth:${req.hostname}`, {
        prompt: "login consent",
        scope: ["openid", "email", "profile", "offline_access"],
      })(req, res, next);
    });
  });

  // Role-aware callback: redirect based on stored auth context
  app.get("/api/callback", (req, res, next) => {
    ensureStrategy(req.hostname);
    passport.authenticate(`replitauth:${req.hostname}`, {
      failureRedirect: "/api/login",
    }, async (err: any, user: any, info: any) => {
      if (err || !user) {
        return res.redirect("/api/login");
      }
      
      req.login(user, async (loginErr) => {
        if (loginErr) {
          return res.redirect("/api/login");
        }
        
        // Get the auth context from session
        const authContext = (req.session as any).authContext || "rider";
        const userId = user.claims?.sub;
        
        // Store the auth context as the intended role in session
        (req.session as any).intendedRole = authContext;
        
        // Role-locked redirects
        let redirectUrl = "/";
        if (authContext === "driver") {
          redirectUrl = "/driver";
        } else if (authContext === "admin") {
          redirectUrl = "/admin";
        } else {
          redirectUrl = "/";
        }
        
        // Clear authContext after use
        delete (req.session as any).authContext;
        
        req.session.save(() => {
          res.redirect(redirectUrl);
        });
      });
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    const redirectPath = (req.query.redirect as string) || "/";
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}${redirectPath}`,
        }).href
      );
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const sessionData = req.session as any;
  if (sessionData?.simulationActive && sessionData?.simulatedUserId) {
    (req as any).user = {
      claims: {
        sub: sessionData.simulatedUserId,
        email: sessionData.simulatedEmail || "sim@ziba.test",
        first_name: sessionData.simulatedFirstName || "Simulation",
        last_name: sessionData.simulatedLastName || "User",
      },
      _isSimulated: true,
    };
    return next();
  }

  const user = req.user as any;

  if (!req.isAuthenticated() || !user?.expires_at) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Not authenticated" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Not authenticated" });
    return;
  }
};
