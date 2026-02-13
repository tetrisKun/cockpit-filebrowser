import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { MermaidBlock } from "./MermaidBlock";
import "./markdown-viewer.scss";

export const MarkdownViewer = ({ content }: { content: string }) => {
    return (
        <div className="markdown-viewer">
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    code({ className, children, ...props }: any) {
                        const match = /language-(\w+)/.exec(className || "");
                        const lang = match ? match[1] : "";
                        const code = String(children).replace(/\n$/, "");
                        if (lang === "mermaid") {
                            return <MermaidBlock code={code} />;
                        }
                        if (lang) {
                            return (
                                <pre className={className}>
                                    <code {...props}>{children}</code>
                                </pre>
                            );
                        }
                        return (
                            <code className={className} {...props}>
                                {children}
                            </code>
                        );
                    },
                }}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
};
