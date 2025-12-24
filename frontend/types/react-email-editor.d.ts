// Type declarations for react-email-editor
declare module 'react-email-editor' {
    import { Component, CSSProperties } from 'react';

    export interface UnlayerOptions {
        projectId?: number;
        displayMode?: 'email' | 'web';
        appearance?: {
            theme?: 'light' | 'dark';
            panels?: {
                tools?: {
                    dock?: 'left' | 'right';
                };
            };
        };
        features?: {
            imageEditor?: boolean;
            stockImages?: boolean;
            undoRedo?: boolean;
            textEditor?: {
                spellChecker?: boolean;
            };
        };
        mergeTags?: Record<string, {
            name: string;
            value: string;
            sample?: string;
        }>;
        tools?: Record<string, { enabled: boolean }>;
        images?: {
            url?: string;
            headers?: Record<string, string>;
        };
    }

    export interface EmailEditorProps {
        ref?: any;
        onReady?: () => void;
        onLoad?: () => void;
        options?: UnlayerOptions;
        style?: CSSProperties;
        minHeight?: number | string;
    }

    export interface EmailEditor {
        loadDesign: (design: any) => void;
        saveDesign: (callback: (design: any) => void) => void;
        exportHtml: (callback: (data: { design: any; html: string }) => void) => void;
        addEventListener: (event: string, callback: () => void) => void;
    }

    const EmailEditor: React.ForwardRefExoticComponent<EmailEditorProps & React.RefAttributes<EmailEditor>>;
    export default EmailEditor;
}
