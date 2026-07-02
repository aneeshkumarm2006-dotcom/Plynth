import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import { api } from '../lib/api';

interface Props {
  value: string;
  onChange: (html: string) => void;
}

function Btn({
  active,
  onClick,
  title,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <button type="button" className={`tt-btn${active ? ' is-active' : ''}`} title={title} onMouseDown={(e) => e.preventDefault()} onClick={onClick}>
      {children}
    </button>
  );
}

export function Tiptap({ value, onChange }: Props) {
  const lastEmitted = useRef(value);
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
      }),
      Image.configure({ inline: false }),
      Placeholder.configure({ placeholder: 'Write your post — or paste from Google Docs / Word…' }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      lastEmitted.current = html;
      onChange(html);
    },
  });

  // Apply external content changes (post loaded, template applied) without
  // clobbering the cursor while the user is typing.
  useEffect(() => {
    if (editor && value !== lastEmitted.current) {
      lastEmitted.current = value;
      editor.commands.setContent(value || '', false);
    }
  }, [value, editor]);

  if (!editor) return <div className="tt-loading muted-text">Loading editor…</div>;

  const onPickImage = () => fileInput.current?.click();

  const onImageChosen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    try {
      const url = await api.uploadImage(file);
      const alt = window.prompt('Alt text for this image (for SEO + accessibility):', '') || '';
      editor.chain().focus().setImage({ src: url, alt }).run();
    } catch (err) {
      window.alert(`Image upload failed: ${(err as Error).message}`);
    } finally {
      setUploading(false);
    }
  };

  const onLink = () => {
    const prev = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('Link URL (leave blank to remove):', prev || 'https://');
    if (url === null) return;
    if (url.trim() === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run();
  };

  return (
    <div className="tt">
      <div className="tt-toolbar">
        <Btn title="Bold" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
          <strong>B</strong>
        </Btn>
        <Btn title="Italic" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <em>I</em>
        </Btn>
        <span className="tt-sep" />
        <Btn title="Heading 2" active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
          H2
        </Btn>
        <Btn title="Heading 3" active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
          H3
        </Btn>
        <span className="tt-sep" />
        <Btn title="Bullet list" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          • List
        </Btn>
        <Btn title="Numbered list" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          1. List
        </Btn>
        <Btn title="Quote" active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
          ❝
        </Btn>
        <Btn title="Code block" active={editor.isActive('codeBlock')} onClick={() => editor.chain().focus().toggleCodeBlock().run()}>
          {'</>'}
        </Btn>
        <span className="tt-sep" />
        <Btn title="Link" active={editor.isActive('link')} onClick={onLink}>
          🔗
        </Btn>
        <Btn title="Insert image" onClick={onPickImage}>
          {uploading ? '…' : '🖼'}
        </Btn>
      </div>
      <EditorContent editor={editor} className="tt-content" />
      <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange={onImageChosen} />
    </div>
  );
}
