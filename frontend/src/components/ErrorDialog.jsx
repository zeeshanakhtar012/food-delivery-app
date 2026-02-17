import React from 'react';
import { XCircle, X } from 'lucide-react';

const ErrorDialog = ({ isOpen, onClose, title = "Error", message }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                className="bg-background rounded-lg shadow-lg max-w-md w-full border border-destructive/20 overflow-hidden animate-in zoom-in-95 duration-200"
                role="dialog"
                aria-modal="true"
            >
                <div className="p-4 flex items-start gap-4">
                    <div className="flex-shrink-0">
                        <XCircle className="h-6 w-6 text-destructive" />
                    </div>
                    <div className="flex-1 pt-0.5">
                        <h3 className="text-lg font-semibold text-foreground mb-1">
                            {title}
                        </h3>
                        <p className="text-muted-foreground text-sm">
                            {message}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors p-1"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>
                <div className="bg-muted/30 p-4 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-destructive text-destructive-foreground font-medium rounded-md hover:bg-destructive/90 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-destructive"
                    >
                        Dismiss
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ErrorDialog;
