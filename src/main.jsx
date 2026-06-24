import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import QRCode from "qrcode";
import "./styles.css";

const DEFAULT_URL = "https://github.com/";
const QR_LEVELS = [
  { label: "L", value: "low" },
  { label: "M", value: "medium" },
  { label: "Q", value: "quartile" },
  { label: "H", value: "high" },
];

function normalizeUrl(value) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function isValidUrl(value) {
  try {
    const url = new URL(value);
    return ["http:", "https:", "mailto:", "tel:"].includes(url.protocol);
  } catch {
    return false;
  }
}

function fileSafeName(value) {
  try {
    const url = new URL(value);
    return `qr-${url.hostname.replace(/^www\./, "").replace(/[^a-z0-9-]/gi, "-")}`;
  } catch {
    return "qr-code";
  }
}

function downloadBlob(filename, mimeType, data) {
  const blob = new Blob([data], { type: mimeType });
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(href);
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="9" y="9" width="10" height="10" rx="2" />
      <path d="M5 15V7a2 2 0 0 1 2-2h8" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 4v10" />
      <path d="m7 9 5 5 5-5" />
      <path d="M5 20h14" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M10 13a5 5 0 0 0 7.07 0l2.12-2.12a5 5 0 0 0-7.07-7.07L11 4.93" />
      <path d="M14 11a5 5 0 0 0-7.07 0L4.81 13.12a5 5 0 0 0 7.07 7.07L13 19.07" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20 12a8 8 0 1 1-2.34-5.66" />
      <path d="M20 4v6h-6" />
    </svg>
  );
}

function App() {
  const canvasRef = useRef(null);
  const [rawUrl, setRawUrl] = useState(DEFAULT_URL);
  const [foreground, setForeground] = useState("#111827");
  const [background, setBackground] = useState("#ffffff");
  const [size, setSize] = useState(720);
  const [margin, setMargin] = useState(3);
  const [errorLevel, setErrorLevel] = useState("quartile");
  const [status, setStatus] = useState("ready");
  const [svgMarkup, setSvgMarkup] = useState("");
  const [shortUrl, setShortUrl] = useState("");
  const [shortStatus, setShortStatus] = useState("idle");
  const [shortMessage, setShortMessage] = useState("");

  const targetUrl = useMemo(() => normalizeUrl(rawUrl), [rawUrl]);
  const valid = useMemo(() => isValidUrl(targetUrl), [targetUrl]);
  const qrOptions = useMemo(
    () => ({
      errorCorrectionLevel: errorLevel,
      margin,
      width: size,
      color: {
        dark: foreground,
        light: background,
      },
    }),
    [background, errorLevel, foreground, margin, size],
  );

  useEffect(() => {
    let cancelled = false;

    async function renderQr() {
      if (!valid || !canvasRef.current) {
        setSvgMarkup("");
        setStatus("invalid");
        return;
      }

      try {
        setStatus("rendering");
        await QRCode.toCanvas(canvasRef.current, targetUrl, qrOptions);
        const svg = await QRCode.toString(targetUrl, {
          ...qrOptions,
          type: "svg",
        });
        if (!cancelled) {
          setSvgMarkup(svg);
          setStatus("ready");
        }
      } catch {
        if (!cancelled) setStatus("error");
      }
    }

    renderQr();
    return () => {
      cancelled = true;
    };
  }, [qrOptions, targetUrl, valid]);

  const filename = fileSafeName(targetUrl);

  function downloadPng() {
    const canvas = canvasRef.current;
    if (!canvas || !valid) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const href = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = href;
      anchor.download = `${filename}.png`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(href);
    }, "image/png");
  }

  function downloadSvg() {
    if (!svgMarkup || !valid) return;
    downloadBlob(`${filename}.svg`, "image/svg+xml;charset=utf-8", svgMarkup);
  }

  async function copySvg() {
    if (!svgMarkup || !navigator.clipboard) return;
    await navigator.clipboard.writeText(svgMarkup);
    setStatus("copied");
    window.setTimeout(() => setStatus("ready"), 1400);
  }

  async function createShortLink() {
    if (!valid) return;

    try {
      setShortStatus("loading");
      setShortMessage("");
      const response = await fetch("/api/shorten", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: targetUrl }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "단축주소를 만들 수 없습니다.");
      }

      setShortUrl(payload.shortUrl);
      setRawUrl(payload.shortUrl);
      setShortStatus("ready");
      setShortMessage("단축주소로 QR을 다시 생성했습니다.");
    } catch (error) {
      setShortStatus("error");
      setShortMessage(error.message);
    }
  }

  async function copyShortUrl() {
    if (!shortUrl || !navigator.clipboard) return;
    await navigator.clipboard.writeText(shortUrl);
    setShortStatus("copied");
    setShortMessage("단축주소를 복사했습니다.");
    window.setTimeout(() => setShortStatus("ready"), 1400);
  }

  function resetStyle() {
    setForeground("#111827");
    setBackground("#ffffff");
    setSize(720);
    setMargin(3);
    setErrorLevel("quartile");
  }

  return (
    <main className="shell">
      <section className="workspace" aria-label="QR 코드 생성기">
        <div className="editor">
          <div className="brand">
            <span className="brand-mark">Q</span>
            <div>
              <p>QRLink Studio</p>
              <strong>주소를 선명한 QR 이미지로 변환</strong>
            </div>
          </div>

          <label className="field">
            <span>사이트 주소</span>
            <input
              value={rawUrl}
              onChange={(event) => setRawUrl(event.target.value)}
              placeholder="example.com 또는 https://example.com"
              spellCheck="false"
            />
          </label>

          <div className="hint-row">
            <span className={valid ? "dot ok" : "dot bad"} />
            <span>{valid ? targetUrl : "http, https, mailto, tel 주소를 입력하세요."}</span>
          </div>

          <div className="shortener">
            <div className="shortener-head">
              <span>단축주소</span>
              <strong>{shortStatusText(shortStatus)}</strong>
            </div>
            <div className="shortener-actions">
              <button
                type="button"
                onClick={createShortLink}
                disabled={!valid || shortStatus === "loading"}
              >
                <LinkIcon />
                생성
              </button>
              <button type="button" className="ghost" onClick={copyShortUrl} disabled={!shortUrl}>
                <CopyIcon />
                복사
              </button>
            </div>
            {(shortUrl || shortMessage) && (
              <div className={shortStatus === "error" ? "short-result error" : "short-result"}>
                {shortStatus === "error" ? shortMessage : shortUrl}
              </div>
            )}
          </div>

          <div className="control-grid">
            <label className="field compact">
              <span>전경색</span>
              <input
                type="color"
                value={foreground}
                onChange={(event) => setForeground(event.target.value)}
              />
            </label>
            <label className="field compact">
              <span>배경색</span>
              <input
                type="color"
                value={background}
                onChange={(event) => setBackground(event.target.value)}
              />
            </label>
          </div>

          <label className="range-field">
            <span>
              크기 <strong>{size}px</strong>
            </span>
            <input
              type="range"
              min="320"
              max="1400"
              step="20"
              value={size}
              onChange={(event) => setSize(Number(event.target.value))}
            />
          </label>

          <label className="range-field">
            <span>
              여백 <strong>{margin}</strong>
            </span>
            <input
              type="range"
              min="0"
              max="8"
              step="1"
              value={margin}
              onChange={(event) => setMargin(Number(event.target.value))}
            />
          </label>

          <div className="segmented" aria-label="오류 보정 수준">
            {QR_LEVELS.map((level) => (
              <button
                key={level.value}
                type="button"
                className={errorLevel === level.value ? "active" : ""}
                onClick={() => setErrorLevel(level.value)}
                title={`오류 보정 ${level.label}`}
              >
                {level.label}
              </button>
            ))}
          </div>

          <div className="actions">
            <button type="button" onClick={downloadPng} disabled={!valid}>
              <DownloadIcon />
              PNG
            </button>
            <button type="button" onClick={downloadSvg} disabled={!valid || !svgMarkup}>
              <DownloadIcon />
              SVG
            </button>
            <button type="button" onClick={copySvg} disabled={!valid || !svgMarkup}>
              <CopyIcon />
              SVG 복사
            </button>
            <button type="button" className="ghost" onClick={resetStyle}>
              <RefreshIcon />
              초기화
            </button>
          </div>
        </div>

        <div className="preview-panel">
          <div className="preview-top">
            <span>미리보기</span>
            <strong>{statusText(status)}</strong>
          </div>
          <div className="qr-frame">
            <canvas ref={canvasRef} aria-label="생성된 QR 코드 이미지" />
            {!valid && <div className="empty">주소를 입력하면 QR 이미지가 표시됩니다.</div>}
          </div>
          <div className="print-note">
            PNG는 발표자료와 문서에, SVG는 웹사이트와 인쇄물에 적합합니다.
          </div>
        </div>
      </section>
    </main>
  );
}

function statusText(status) {
  if (status === "rendering") return "생성 중";
  if (status === "copied") return "복사 완료";
  if (status === "invalid") return "입력 대기";
  if (status === "error") return "생성 실패";
  return "정상 출력";
}

function shortStatusText(status) {
  if (status === "loading") return "생성 중";
  if (status === "ready") return "생성 완료";
  if (status === "copied") return "복사 완료";
  if (status === "error") return "설정 필요";
  return "Vercel + Supabase";
}

createRoot(document.getElementById("root")).render(<App />);
