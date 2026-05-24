import type { Response } from "express";

interface SSEClient {
  address: string;
  res: Response;
}

const clients: SSEClient[] = [];

export function addSSEClient(address: string, res: Response): void {
  clients.push({ address, res });
  res.on("close", () => {
    const idx = clients.findIndex((c) => c.res === res);
    if (idx !== -1) clients.splice(idx, 1);
  });
}

export function broadcastNewEmail(toAddress: string, emailId: number): void {
  const payload = JSON.stringify({ emailId, toAddress });
  for (const client of clients) {
    if (client.address.toLowerCase() === toAddress.toLowerCase()) {
      client.res.write(`data: ${payload}\n\n`);
    }
  }
}
