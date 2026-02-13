import React, { useEffect, useRef, useState } from "react";

let mermaidInitialized = false;
let mermaidModule: typeof import("mermaid") | null = null;

export const MermaidBlock = ({ code }: { code: string }) => {
    const ref = useRef<HTMLDivElement>(null);
    const [svg, setSvg] = useState<string>("");
    const [error, setError] = useState<string>("");

    useEffect(() => {
        let cancelled = false;

        const renderDiagram = async () => {
            try {
                if (!mermaidModule) {
                    mermaidModule = await import("mermaid");
                }
                const mermaid = mermaidModule.default;

                if (!mermaidInitialized) {
                    mermaid.initialize({ startOnLoad: false, theme: "default" });
                    mermaidInitialized = true;
                }

                const id = "mermaid-" + Math.random().toString(36).slice(2, 9);
                const result = await mermaid.render(id, code);
                if (!cancelled) {
                    setSvg(result.svg);
                    setError("");
                }
            } catch (err) {
                if (!cancelled) {
                    setError(String(err));
                }
            }
        };

        renderDiagram();

        return () => {
            cancelled = true;
        };
    }, [code]);

    if (error) return <pre className="mermaid-error">{code}</pre>;
    return <div ref={ref} dangerouslySetInnerHTML={{ __html: svg }} className="mermaid-block" />;
};
