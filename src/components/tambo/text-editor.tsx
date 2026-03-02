"use client";

/* eslint-disable react-refresh/only-export-components */
/* eslint-disable react-hooks/refs */

import * as Popover from "@radix-ui/react-popover";
import { cn } from "@/lib/utils";
import Document from "@tiptap/extension-document";
import HardBreak from "@tiptap/extension-hard-break";
import Mention from "@tiptap/extension-mention";
import Paragraph from "@tiptap/extension-paragraph";
import Placeholder from "@tiptap/extension-placeholder";
import Text from "@tiptap/extension-text";
import {
  EditorContent,
  Extension,
  useEditor,
  type Editor,
} from "@tiptap/react";
import type { SuggestionOptions } from "@tiptap/suggestion";
import Suggestion from "@tiptap/suggestion";
import * as React from "react";
import { useImperativeHandle, useState } from "react";

/**
 * Result of extracting images from clipboard data.
 */
export interface ImageItems {
  imageItems: File[];
  hasText: boolean;
}

/**
 * Returns images array and hasText bool from clipboard data.
 */
export function getImageItems(
  clipboardData: DataTransfer | null | undefined,
): ImageItems {
  const items = Array.from(clipboardData?.items ?? []);
  const imageItems: File[] = [];

  for (const item of items) {
    if (!item.type.startsWith("image/")) {
      continue;
    }

    const image = item.getAsFile();
    if (image) {
      imageItems.push(image);
    }
  }

  const text = clipboardData?.getData("text/plain") ?? "";

  return {
    imageItems,
    hasText: text.length > 0 ? true : false,
  };
}

/**
 * Minimal editor interface exposed to parent components.
 */
export interface TamboEditor {
  focus(position?: "start" | "end"): void;
  setContent(content: string): void;
  appendText(text: string): void;
  getTextWithResourceURIs(): {
    text: string;
    resourceNames: Record<string, string>;
  };
  hasMention(id: string): boolean;
  insertMention(id: string, label: string): void;
  setEditable(editable: boolean): void;
  isFocused(): boolean;
}

interface SuggestionItem {
  id: string;
  name: string;
  icon?: React.ReactNode;
}

export interface ResourceItem extends SuggestionItem {
  componentData?: unknown;
}

export interface PromptItem extends SuggestionItem {
  text: string;
}

export interface TextEditorProps {
  value: string;
  onChange: (text: string) => void;
  onResourceNamesChange: (
    resourceNames:
      | Record<string, string>
      | ((prev: Record<string, string>) => Record<string, string>),
  ) => void;
  onKeyDown?: (event: React.KeyboardEvent) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /** Submit handler for Enter key behavior */
  onSubmit: (e: React.FormEvent) => Promise<void>;
  /** Called when an image is pasted into the editor */
  onAddImage: (file: File) => Promise<void>;
  /** Called when resource search query changes */
  onSearchResources: (query: string) => void;
  /** Current list of resources to show in the "@" suggestion menu */
  resources: ResourceItem[];
  /** Called when prompt search query changes */
  onSearchPrompts: (query: string) => void;
  /** Current list of prompts to show in the "/" suggestion menu */
  prompts: PromptItem[];
  /** Called when a resource is selected from the "@" menu */
  onResourceSelect: (item: ResourceItem) => void;
  /** Called when a prompt is selected from the "/" menu */
  onPromptSelect: (item: PromptItem) => void;
}

interface SuggestionState<T extends SuggestionItem> {
  isOpen: boolean;
  items: T[];
  selectedIndex: number;
  position: { top: number; left: number; lineHeight: number } | null;
  command: ((item: T) => void) | null;
}

interface SuggestionRef<T extends SuggestionItem> {
  state: SuggestionState<T>;
  setState: (update: Partial<SuggestionState<T>>) => void;
}

function getPositionFromClientRect(
  clientRect?: (() => DOMRect | null) | null,
): { top: number; left: number; lineHeight: number } | null {
  if (!clientRect) return null;
  const rect = clientRect();
  if (!rect) return null;
  const lineHeight = rect.height || 20;
  return { top: rect.bottom, left: rect.left, lineHeight };
}

interface SuggestionPopoverProps<T extends SuggestionItem> {
  state: SuggestionState<T>;
  onClose: () => void;
  defaultIcon: React.ReactNode;
  emptyMessage: string;
  monoSecondary?: boolean;
}

function SuggestionPopover<T extends SuggestionItem>({
  state,
  onClose,
  defaultIcon,
  emptyMessage,
  monoSecondary = false,
}: SuggestionPopoverProps<T>) {
  if (!state.isOpen || !state.position) return null;

  const sideOffset = state.position.lineHeight + 4;

  return (
    <Popover.Root
      open={state.isOpen}
      onOpenChange={(open) => !open && onClose()}
    >
      <Popover.Anchor asChild>
        <div
          style={{
            position: "fixed",
            top: `${state.position.top}px`,
            left: `${state.position.left}px`,
            width: 0,
            height: 0,
            pointerEvents: "none",
          }}
        />
      </Popover.Anchor>
      <Popover.Content
        side="bottom"
        align="start"
        sideOffset={sideOffset}
        className="z-50 w-96 rounded-md border bg-popover p-0 shadow-md animate-in fade-in-0 zoom-in-95"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => {
          e.preventDefault();
          onClose();
        }}
      >
        {state.items.length === 0 ? (
          <div className="px-3 py-2 text-sm text-muted-foreground">
            {emptyMessage}
          </div>
        ) : (
          <div className="flex flex-col gap-0.5 p-1">
            {state.items.map((item, index) => (
              <button
                key={item.id}
                type="button"
                className={cn(
                  "flex items-start gap-2 px-2 py-2 text-sm rounded-md text-left",
                  "hover:bg-accent hover:text-accent-foreground transition-colors",
                  index === state.selectedIndex &&
                  "bg-accent text-accent-foreground",
                )}
                onClick={() => state.command?.(item)}
              >
                {item.icon ?? defaultIcon}
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{item.name}</div>
                  <div
                    className={cn(
                      "text-xs text-muted-foreground truncate",
                      monoSecondary && "font-mono",
                    )}
                  >
                    {item.id}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </Popover.Content>
    </Popover.Root>
  );
}

function checkMentionExists(editor: Editor, label: string): boolean {
  if (!editor.state?.doc) return false;
  let exists = false;
  editor.state.doc.descendants((node) => {
    if (node.type.name === "mention") {
      const mentionLabel = node.attrs.label as string;
      if (mentionLabel === label) {
        exists = true;
        return false;
      }
    }
    return true;
  });
  return exists;
}

function createResourceMentionConfig(
  onSearchChange: (query: string) => void,
  onSelect: (item: ResourceItem) => void,
  getStateRef: () => SuggestionRef<ResourceItem>,
): Omit<SuggestionOptions, "editor"> {
  return {
    char: "@",
    items: ({ query }) => {
      onSearchChange(query);
      return [];
    },

    render: () => {
      const createWrapCommand =
        (
          editor: Editor,
          tiptapCommand: (attrs: { id: string; label: string }) => void,
        ) =>
          (item: ResourceItem) => {
            if (checkMentionExists(editor, item.name)) return;
            tiptapCommand({ id: item.id, label: item.name });
            onSelect(item);
          };

      return {
        onStart: (props) => {
          getStateRef().setState({
            isOpen: true,
            selectedIndex: 0,
            position: getPositionFromClientRect(props.clientRect),
            command: createWrapCommand(props.editor, props.command),
          });
        },
        onUpdate: (props) => {
          getStateRef().setState({
            position: getPositionFromClientRect(props.clientRect),
            command: createWrapCommand(props.editor, props.command),
            selectedIndex: 0,
          });
        },
        onKeyDown: ({ event }) => {
          const { state, setState } = getStateRef();
          if (!state.isOpen) return false;

          const handlers: Record<string, () => boolean> = {
            ArrowUp: () => {
              if (state.items.length === 0) return false;
              setState({
                selectedIndex:
                  (state.selectedIndex - 1 + state.items.length) %
                  state.items.length,
              });
              return true;
            },
            ArrowDown: () => {
              if (state.items.length === 0) return false;
              setState({
                selectedIndex: (state.selectedIndex + 1) % state.items.length,
              });
              return true;
            },
            Enter: () => {
              const item = state.items[state.selectedIndex];
              if (item && state.command) {
                state.command(item);
                return true;
              }
              return false;
            },
            Escape: () => {
              setState({ isOpen: false });
              return true;
            },
          };

          const handler = handlers[event.key];
          if (handler) {
            event.preventDefault();
            return handler();
          }
          return false;
        },
        onExit: () => {
          getStateRef().setState({ isOpen: false });
        },
      };
    },
  };
}

function createPromptCommandExtension(
  onSearchChange: (query: string) => void,
  onSelect: (item: PromptItem) => void,
  getStateRef: () => SuggestionRef<PromptItem>,
) {
  return Extension.create({
    name: "promptCommand",

    addProseMirrorPlugins() {
      return [
        Suggestion({
          editor: this.editor,
          char: "/",
          items: ({ query, editor }) => {
            const editorValue = editor.getText().replace("/", "").trim();
            if (editorValue.length > 0) {
              getStateRef().setState({ isOpen: false });
              return [];
            }
            onSearchChange(query);
            return [];
          },
          render: () => {
            let createCommand: ((item: PromptItem) => void) | null = null;

            return {
              onStart: (props) => {
                createCommand = (item: PromptItem) => {
                  props.editor.commands.deleteRange({
                    from: props.range.from,
                    to: props.range.to,
                  });
                  onSelect(item);
                };
                getStateRef().setState({
                  isOpen: true,
                  selectedIndex: 0,
                  position: getPositionFromClientRect(props.clientRect),
                  command: createCommand,
                });
              },
              onUpdate: (props) => {
                createCommand = (item: PromptItem) => {
                  props.editor.commands.deleteRange({
                    from: props.range.from,
                    to: props.range.to,
                  });
                  onSelect(item);
                };
                getStateRef().setState({
                  position: getPositionFromClientRect(props.clientRect),
                  command: createCommand,
                  selectedIndex: 0,
                });
              },
              onKeyDown: ({ event }) => {
                const { state, setState } = getStateRef();
                if (!state.isOpen) return false;

                const handlers: Record<string, () => boolean> = {
                  ArrowUp: () => {
                    if (state.items.length === 0) return false;
                    setState({
                      selectedIndex:
                        (state.selectedIndex - 1 + state.items.length) %
                        state.items.length,
                    });
                    return true;
                  },
                  ArrowDown: () => {
                    if (state.items.length === 0) return false;
                    setState({
                      selectedIndex:
                        (state.selectedIndex + 1) % state.items.length,
                    });
                    return true;
                  },
                  Enter: () => {
                    const item = state.items[state.selectedIndex];
                    if (item && state.command) {
                      state.command(item);
                      return true;
                    }
                    return false;
                  },
                  Escape: () => {
                    setState({ isOpen: false });
                    return true;
                  },
                };

                const handler = handlers[event.key];
                if (handler) {
                  event.preventDefault();
                  return handler();
                }
                return false;
              },
              onExit: () => {
                getStateRef().setState({ isOpen: false });
              },
            };
          },
        }),
      ];
    },
  });
}

function getTextWithResourceURIs(editor: Editor | null): {
  text: string;
  resourceNames: Record<string, string>;
} {
  if (!editor?.state?.doc) return { text: "", resourceNames: {} };

  let text = "";
  const resourceNames: Record<string, string> = {};

  editor.state.doc.descendants((node) => {
    if (node.type.name === "mention") {
      const id = node.attrs.id ?? "";
      const label = node.attrs.label ?? "";
      text += `@${id}`;
      if (label && id) {
        resourceNames[id] = label;
      }
    } else if (node.type.name === "hardBreak") {
      text += "\n";
    } else if (node.isText) {
      text += node.text;
    }
    return true;
  });

  return { text, resourceNames };
}

function useSuggestionState<T extends SuggestionItem>(
  externalItems?: T[],
): [SuggestionState<T>, React.MutableRefObject<SuggestionRef<T>>] {
  const [state, setStateInternal] = useState<SuggestionState<T>>({
    isOpen: false,
    items: externalItems ?? [],
    selectedIndex: 0,
    position: null,
    command: null,
  });

  const setState = React.useCallback((update: Partial<SuggestionState<T>>) => {
    setStateInternal((prev) => ({ ...prev, ...update }));
  }, []);

  const stateRef = React.useRef<SuggestionRef<T>>({ state, setState });

  React.useEffect(() => {
    stateRef.current = { state, setState };
  }, [state, setState]);

  React.useEffect(() => {
    if (externalItems !== undefined) {
      setStateInternal((prev) => {
        if (prev.items === externalItems) return prev;
        const maxIndex = Math.max(externalItems.length - 1, 0);
        return {
          ...prev,
          items: externalItems,
          selectedIndex: Math.min(prev.selectedIndex, maxIndex),
        };
      });
    }
  }, [externalItems]);

  return [state, stateRef];
}

export const TextEditor = React.forwardRef<TamboEditor, TextEditorProps>(
  (props, ref) => {
    const {
      value,
      onChange,
      onResourceNamesChange,
      onKeyDown,
      placeholder = "What do you want to do?",
      disabled = false,
      className,
      onSubmit,
      onAddImage,
      onSearchResources,
      resources,
      onSearchPrompts,
      prompts,
      onResourceSelect,
      onPromptSelect,
    } = props;

    const [resourceState, resourceRef] = useSuggestionState<ResourceItem>(resources);
    const [promptState, promptRef] = useSuggestionState<PromptItem>(prompts);

    const callbacksRef = React.useRef({
      onSearchResources,
      onResourceSelect,
      onSearchPrompts,
      onPromptSelect,
      onSubmit,
      onKeyDown,
      onChange,
      onAddImage,
      value
    });

    React.useEffect(() => {
      callbacksRef.current = {
        onSearchResources,
        onResourceSelect,
        onSearchPrompts,
        onPromptSelect,
        onSubmit,
        onKeyDown,
        onChange,
        onAddImage,
        value
      };
    }, [onSearchResources, onResourceSelect, onSearchPrompts, onPromptSelect, onSubmit, onKeyDown, onChange, value]);

    const editor = useEditor({
      extensions: [
        Document,
        Paragraph,
        Text,
        HardBreak,
        Placeholder.configure({ placeholder }),
        Mention.configure({
          HTMLAttributes: {
            class: "mention resource inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground",
          },
          suggestion: createResourceMentionConfig(
            onSearchResources,
            onResourceSelect,
            // eslint-disable-next-line react-hooks/refs
            () => resourceRef.current,
          ),
          renderLabel: ({ node }) => `@${(node.attrs.label as string) ?? ""}`,
        }),
        createPromptCommandExtension(
          onSearchPrompts,
          onPromptSelect,
          // eslint-disable-next-line react-hooks/refs
          () => promptRef.current,
        ),
      ],
      content: value,
      editable: !disabled,
      onUpdate: ({ editor: ed }) => {
        const { text, resourceNames } = getTextWithResourceURIs(ed);
        if (text !== callbacksRef.current.value) {
          callbacksRef.current.onChange(text);
        }
        if (onResourceNamesChange) {
          onResourceNamesChange((prev) => ({ ...prev, ...resourceNames }));
        }
      },
      editorProps: {
        attributes: {
          class: cn(
            "tiptap prose prose-sm max-w-none focus:outline-none p-3 rounded-t-lg bg-transparent text-sm leading-relaxed min-h-[82px] max-h-[40vh] overflow-y-auto break-words whitespace-pre-wrap",
            className,
          ),
        },
        handlePaste: (_view, event) => {
          const { imageItems, hasText } = getImageItems(event.clipboardData);
          if (imageItems.length === 0) return false;
          if (!hasText) event.preventDefault();
          void (async () => {
            for (const item of imageItems) {
              await callbacksRef.current.onAddImage?.(item);
            }
          })();
          return !hasText;
        },
        handleKeyDown: (_view, event) => {
          if (resourceRef.current.state.isOpen || promptRef.current.state.isOpen) return false;

          if (event.key === "Enter" && !event.shiftKey) {
            const currentText = _view.state.doc.textContent.trim();
            if (currentText) {
              event.preventDefault();
              void callbacksRef.current.onSubmit(event as unknown as React.FormEvent);
              return true;
            }
          }
          if (callbacksRef.current.onKeyDown) {
            callbacksRef.current.onKeyDown(event as unknown as React.KeyboardEvent);
          }
          return false;
        },
      },
    }, []);

    useImperativeHandle(ref, () => ({
      focus: (pos) => editor?.commands.focus(pos),
      setContent: (c) => editor?.commands.setContent(c),
      appendText: (t) => editor?.chain().focus("end").insertContent(t).run(),
      getTextWithResourceURIs: () => getTextWithResourceURIs(editor),
      hasMention: (id) => {
        if (!editor) return false;
        let exists = false;
        editor.state.doc.descendants(n => {
          if (n.type.name === 'mention' && n.attrs.id === id) { exists = true; return false; }
          return true;
        });
        return exists;
      },
      insertMention: (id, label) => {
        editor?.chain().focus().insertContent([{ type: "mention", attrs: { id, label } }, { type: "text", text: " " }]).run();
      },
      setEditable: (e) => editor?.setEditable(e),
      isFocused: () => !!editor?.isFocused,
    }), [editor]);

    // Keep editor content in sync with value prop (important for clearing)
    React.useEffect(() => {
      if (!editor) return;
      const { text } = getTextWithResourceURIs(editor);
      if (value !== text) {
        editor.commands.setContent(value);
      }
    }, [value, editor]);

    return (
      <div className="relative w-full">
        <EditorContent editor={editor} />
        <SuggestionPopover
          state={resourceState}
          onClose={() => resourceRef.current.setState({ isOpen: false })}
          defaultIcon={<CuboidIcon />}
          emptyMessage="No resources found"
        />
        <SuggestionPopover
          state={promptState}
          onClose={() => promptRef.current.setState({ isOpen: false })}
          defaultIcon={<FileTextIcon />}
          emptyMessage="No prompts found"
        />
      </div>
    );
  }
);

TextEditor.displayName = "TextEditor";

function CuboidIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-cuboid">
      <path d="m21.12 6.4-6.05-4.06a2 2 0 0 0-2.17-.05L2.84 8.41A2 2 0 0 0 2 10.42v6.23a2 2 0 0 0 .88 1.66l6.05 4.07a2 2 0 0 0 2.17.05l10.06-6.12A2 2 0 0 0 22 14.73V8.46a2 2 0 0 0-.88-1.66z" />
      <polyline points="12 22 12 12 22 8.5" />
      <polyline points="2 8.5 12 12" />
    </svg>
  );
}

function FileTextIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-file-text">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <line x1="10" y1="9" x2="8" y2="9" />
    </svg>
  );
}
