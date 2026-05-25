import { useEffect, useRef, useState } from "react";

interface EmailBodyProps {
  bodyHtml?: string | null;
  bodyText?: string | null;
}

function HtmlEmailFrame({ html }: { html: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(200);

  const srcdoc = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    line-height: 1.6;
    color: #1a1a1a;
    background: #ffffff;
    word-break: break-word;
    overflow-wrap: break-word;
  }
  img { max-width: 100%; height: auto; }
  a { color: #4f46e5; }
  pre, code { white-space: pre-wrap; word-break: break-all; }
  table { max-width: 100%; border-collapse: collapse; }
</style>
</head>
<body>${html}</body>
</html>`;

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const resize = () => {
      try {
        const doc = iframe.contentDocument;
        if (doc?.body) {
          const h = doc.documentElement.scrollHeight || doc.body.scrollHeight;
          setHeight(Math.max(80, h + 16));
        }
      } catch {
      }
    };

    iframe.addEventListener("load", resize);
    const t = setTimeout(resize, 300);
    return () => {
      iframe.removeEventListener("load", resize);
      clearTimeout(t);
    };
  }, [html]);

  return (
    <div className="rounded-lg overflow-hidden border border-white/8">
      <iframe
        ref={iframeRef}
        srcDoc={srcdoc}
        sandbox="allow-same-origin"
        style={{ width: "100%", height, border: "none", display: "block" }}
        title="Email content"
      />
    </div>
  );
}

export function EmailBody({ bodyHtml, bodyText }: EmailBodyProps) {
  if (bodyHtml) {
    return <HtmlEmailFrame html={bodyHtml} />;
  }

  return (
    <pre className="font-mono text-xs text-foreground/80 whitespace-pre-wrap break-words leading-relaxed">
      {bodyText || "(no content)"}
    </pre>
  );
}
