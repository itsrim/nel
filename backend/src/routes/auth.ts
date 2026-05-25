import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  createToken,
  loginUser,
  signupUser,
  verifyToken,
} from "../lib/authStore.js";
import type { AuthUser } from "../lib/types.js";

declare module "fastify" {
  interface FastifyRequest {
    authUser?: AuthUser;
  }
}

export async function extractAuthUser(
  request: FastifyRequest,
): Promise<AuthUser | null> {
  const header = request.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return null;
  return verifyToken(token);
}

export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const user = await extractAuthUser(request);
  if (!user) {
    reply.status(401).send({ error: "Unauthorized" });
    return;
  }
  request.authUser = user;
}

export async function authRoutes(app: FastifyInstance) {
  app.post<{ Body: { email?: string; password?: string } }>(
    "/api/auth/login",
    async (request, reply) => {
      try {
        const email = request.body?.email ?? "";
        const password = request.body?.password ?? "";
        const user = loginUser(email, password);
        const token = await createToken(user);
        return { user, token };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Login failed";
        return reply.status(401).send({ error: message });
      }
    },
  );

  app.post<{
    Body: { email?: string; password?: string; displayName?: string };
  }>("/api/auth/signup", async (request, reply) => {
    try {
      const email = request.body?.email ?? "";
      const password = request.body?.password ?? "";
      const displayName = request.body?.displayName ?? "";
      const user = signupUser(email, password, displayName);
      const token = await createToken(user);
      return reply.status(201).send({ user, token });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Signup failed";
      const status = message.includes("déjà") ? 409 : 400;
      return reply.status(status).send({ error: message });
    }
  });

  app.get("/api/auth/me", async (request, reply) => {
    await requireAuth(request, reply);
    if (reply.sent) return;
    return { user: request.authUser };
  });
}
