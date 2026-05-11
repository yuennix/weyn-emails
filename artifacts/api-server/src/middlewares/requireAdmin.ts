import type { Request, Response, NextFunction } from "express";

  export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
    const pwd = process.env.ADMIN_PASSWORD;
    if (!pwd) {
      res.status(500).json({ error: "Admin password is not configured on the server" });
      return;
    }
    const provided = req.headers["x-admin-password"];
    if (!provided || provided !== pwd) {
      res.status(403).json({ error: "Forbidden: admin password required" });
      return;
    }
    next();
  }
  