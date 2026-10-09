import type { ReactNode } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold,
  Heading2,
  Italic,
  List,
  ListOrdered,
  Redo2,
  TextQuote,
  Underline as UnderlineIcon,
  Undo2,
} from "lucide-react";
import { Toggle } from "../ui/toggle";
import { Button } from "../ui/Button";
import "./compose-editor.css";

type Props = {
  value: string;
  onChange: (html: string) => void;
};

export function BodyEditor({ value, onChange }: Props) {
  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2] },
        codeBlock: false,
      }),
      Underline,
      Placeholder.configure({ placeholder: "Body" }),
    ],
    content: value || "",
    editorProps: {
      attributes: {
        class: "tiptap",
      },
    },
    onUpdate: ({ editor: next }) => {
      onChange(next.getHTML());
    },
  });

  if (!editor) {
    return (
      <div className="compose-body">
        <div className="mx-auto h-10 w-full max-w-md rounded-full border border-line bg-page" />
        <div className="mt-3 min-h-65" />
      </div>
    );
  }

  return (
    <div className="compose-body">
      <EditorToolbar editor={editor} />
      <div className="mt-3">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

function EditorToolbar({ editor }: { editor: Editor }) {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-wrap items-center justify-center gap-0.5 rounded-full border border-line bg-page px-2 py-1 text-muted">
      <ActionButton label="Undo" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}>
        <Undo2 className="size-3.5" />
      </ActionButton>
      <ActionButton label="Redo" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}>
        <Redo2 className="size-3.5" />
      </ActionButton>
      <FormatButton
        label="Heading"
        active={editor.isActive("heading", { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        <Heading2 className="size-3.5" />
      </FormatButton>
      <FormatButton
        label="Bold"
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold className="size-3.5" />
      </FormatButton>
      <FormatButton
        label="Italic"
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic className="size-3.5" />
      </FormatButton>
      <FormatButton
        label="Underline"
        active={editor.isActive("underline")}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <UnderlineIcon className="size-3.5" />
      </FormatButton>
      <FormatButton
        label="Numbered list"
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered className="size-3.5" />
      </FormatButton>
      <FormatButton
        label="Bullet list"
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List className="size-3.5" />
      </FormatButton>
      <FormatButton
        label="Quote"
        active={editor.isActive("blockquote")}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        <TextQuote className="size-3.5" />
      </FormatButton>
    </div>
  );
}

function FormatButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Toggle
      pressed={active}
      aria-label={label}
      title={label}
      onMouseDown={(e) => e.preventDefault()}
      onPressedChange={onClick}
    >
      {children}
    </Toggle>
  );
}

function ActionButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Button
      variant="ghost"
      className="!size-8 !px-0 text-muted hover:text-ink"
      aria-label={label}
      title={label}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}
