import { useState } from "react";
import { Copy, Check, Webhook, Code2, Globe } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const WEBHOOK_PATH = "/api/webhook/email";

const PAYLOAD_EXAMPLE = `{
  "from": "sender@example.com",
  "to": "anything@exceweyn.run.place",
  "subject": "Hello from your mail service",
  "bodyText": "Plain text content of the email",
  "bodyHtml": "<p>Optional HTML content</p>"
}`;

const CURL_EXAMPLE = `curl -X POST \\
  https://your-app.replit.app/api/webhook/email \\
  -H "Content-Type: application/json" \\
  -d '{
    "from": "sender@example.com",
    "to": "anything@exceweyn.run.place",
    "subject": "Test email",
    "bodyText": "This is a test"
  }'`;

function CopyBlock({ label, value, testId }: { label: string; value: string; testId: string }) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const copy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Copied" });
  };

  return (
    <div className="space-y-1.5">
      <p className="font-mono text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
      <div className="relative group rounded border border-border bg-background/60 px-3 py-2.5">
        <code className="font-mono text-sm text-primary break-all">{value}</code>
        <button
          data-testid={testId}
          onClick={copy}
          className="absolute right-2 top-2 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  );
}

function CodeBlock({ label, code, testId }: { label: string; code: string; testId: string }) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Copied" });
  };

  return (
    <div className="space-y-1.5">
      <p className="font-mono text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
      <div className="relative group rounded border border-border bg-background/60">
        <pre className="font-mono text-xs text-foreground/85 whitespace-pre-wrap p-4 pr-10 leading-relaxed overflow-x-auto">{code}</pre>
        <button
          data-testid={testId}
          onClick={copy}
          className="absolute right-2 top-2 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  );
}

export default function WebhookPage() {
  const webhookUrl = `${window.location.origin}${WEBHOOK_PATH}`;

  return (
    <div className="space-y-7 max-w-2xl">
      <div>
        <h1 className="font-mono text-lg font-bold text-foreground">Webhook Setup</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Configure your email service to forward mail to this endpoint</p>
      </div>

      {/* Endpoint */}
      <div className="rounded border border-border bg-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Webhook className="h-4 w-4 text-primary" />
          <span className="font-mono text-sm font-semibold text-foreground">Webhook Endpoint</span>
        </div>
        <CopyBlock label="URL" value={webhookUrl} testId="button-copy-webhook-url" />
        <CopyBlock label="Method" value="POST" testId="button-copy-method" />
        <CopyBlock label="Content-Type" value="application/json" testId="button-copy-content-type" />
      </div>

      {/* How it works */}
      <div className="rounded border border-border bg-card p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-primary" />
          <span className="font-mono text-sm font-semibold text-foreground">How Routing Works</span>
        </div>
        <ul className="space-y-2">
          {[
            "When a POST arrives, the \"to\" field is matched against your registered domains",
            "If the exact email address matches a generated address, it's linked to that inbox",
            "Otherwise it's stored under the matching domain inbox",
            "Emails not matching any registered domain return 404",
          ].map((step, i) => (
            <li key={i} className="flex gap-2.5 text-xs text-muted-foreground">
              <span className="font-mono text-primary shrink-0">{i + 1}.</span>
              <span>{step}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Payload */}
      <div className="rounded border border-border bg-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Code2 className="h-4 w-4 text-primary" />
          <span className="font-mono text-sm font-semibold text-foreground">Payload Format</span>
        </div>
        <CodeBlock label="JSON Body" code={PAYLOAD_EXAMPLE} testId="button-copy-payload" />
        <div className="space-y-1">
          <p className="font-mono text-xs text-muted-foreground uppercase tracking-wider">Fields</p>
          <div className="rounded border border-border divide-y divide-border">
            {[
              { field: "from", type: "string", req: true, desc: "Sender email address" },
              { field: "to", type: "string", req: true, desc: "Recipient — must match a registered domain" },
              { field: "subject", type: "string", req: true, desc: "Email subject line" },
              { field: "bodyText", type: "string", req: true, desc: "Plain text body content" },
              { field: "bodyHtml", type: "string", req: false, desc: "Optional HTML body content" },
            ].map(({ field, type, req, desc }) => (
              <div key={field} className="flex items-center gap-3 px-3 py-2">
                <code className="font-mono text-xs text-primary w-20 shrink-0">{field}</code>
                <code className="font-mono text-xs text-muted-foreground w-14 shrink-0">{type}</code>
                <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded shrink-0 ${req ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                  {req ? "required" : "optional"}
                </span>
                <span className="text-xs text-muted-foreground">{desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* cURL example */}
      <div className="rounded border border-border bg-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Code2 className="h-4 w-4 text-primary" />
          <span className="font-mono text-sm font-semibold text-foreground">Test with cURL</span>
        </div>
        <CodeBlock label="Example" code={CURL_EXAMPLE} testId="button-copy-curl" />
      </div>
    </div>
  );
}
