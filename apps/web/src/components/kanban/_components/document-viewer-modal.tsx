"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@clawe/ui/components/dialog";
import { Button } from "@clawe/ui/components/button";
import { Download } from "lucide-react";
import { Spinner } from "@clawe/ui/components/spinner";
import { cn } from "@clawe/ui/lib/utils";
import type { DocumentWithCreator } from "@clawe/backend/types";

const VIEWER_HEIGHT = "h-[500px]";

export type DocumentViewerModalProps = {
  document: DocumentWithCreator | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export const DocumentViewerModal = ({
  document,
  open,
  onOpenChange,
}: DocumentViewerModalProps) => {
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fileUrl = document?.fileUrl;
    if (!fileUrl || !open) {
      setFileContent(null);
      return;
    }

    const controller = new AbortController();

    const fetchContent = async () => {
      setIsLoading(true);
      try {
        const response = await axios.get<string>(fileUrl, {
          responseType: "text",
          signal: controller.signal,
        });
        setFileContent(response.data);
      } catch (error) {
        if (!axios.isCancel(error)) {
          setFileContent(null);
        }
      } finally {
        setIsLoading(false);
      }
    };

    void fetchContent();

    return () => {
      controller.abort();
    };
  }, [document?.fileUrl, open]);

  if (!document) return null;

  const content = fileContent ?? document.content;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[80vh] w-full flex-col overflow-hidden sm:w-[95vw] sm:max-w-6xl">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center justify-between gap-4 pr-8">
            <span className="truncate">{document.title}</span>
            {document.fileUrl && (
              <Button variant="outline" size="sm" asChild className="shrink-0">
                <a href={document.fileUrl} download={document.title}>
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </a>
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div
            className={cn(
              "flex items-center justify-center rounded border",
              VIEWER_HEIGHT,
            )}
          >
            <Spinner className="h-6 w-6" />
          </div>
        ) : content ? (
          <div className={cn("overflow-auto rounded border", VIEWER_HEIGHT)}>
            <pre className="p-4 text-sm whitespace-pre-wrap">{content}</pre>
          </div>
        ) : (
          <div
            className={cn(
              "flex items-center justify-center rounded border",
              VIEWER_HEIGHT,
            )}
          >
            <p className="text-muted-foreground text-center">
              No preview available
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
